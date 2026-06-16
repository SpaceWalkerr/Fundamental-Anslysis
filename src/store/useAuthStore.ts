import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'premium' | 'enterprise';
  reportsUsed: number;
  reportsLimit: number;
  company?: string;
  email_notifications?: boolean;
  marketing_emails?: boolean;
  report_alerts?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaFactors: any[];
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  initializeAuth: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  verifyMfa: (factorId: string, code: string) => Promise<any>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      mfaRequired: false,
      mfaFactors: [],

      initializeAuth: async () => {
        set({ isLoading: true });

        try {
          // Subscribe to auth state change listener to sync user state across tabs and on mount.
          // This fires INITIAL_SESSION on mount once Supabase loads the session asynchronously from storage.
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("[AuthStore] onAuthStateChange event:", event, "session:", !!session);
            
            if (session) {
              localStorage.setItem('auth_token', session.access_token);
              if (session.refresh_token) {
                localStorage.setItem('refresh_token', session.refresh_token);
              }

              // Check if Multi-Factor Authentication is required for the session
              const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
              let mfaRequiredForSession = false;
              if (!aalError && aalData) {
                mfaRequiredForSession = aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2';
              }

              if (mfaRequiredForSession) {
                const { data: factorsData } = await supabase.auth.mfa.listFactors();
                set({ 
                  user: null, 
                  isAuthenticated: false,
                  mfaRequired: true,
                  mfaFactors: factorsData?.all || [],
                  isLoading: false
                });
                return;
              }

              // Sync user profile from backend if we don't have it or if it's a different user
              const currentState = get();
              if (!currentState.isAuthenticated || !currentState.user || currentState.user.id !== session.user.id) {
                try {
                  const profile = await authApi.getProfile();
                  if (profile) {
                    set({
                      user: {
                        id: profile.id,
                        name: profile.name,
                        email: profile.email,
                        avatar: profile.avatar_url || undefined,
                        plan: profile.plan as 'free' | 'premium' | 'enterprise',
                        reportsUsed: profile.reports_used,
                        reportsLimit: profile.reports_limit,
                      },
                      isAuthenticated: true,
                      mfaRequired: false,
                      mfaFactors: [],
                      isLoading: false
                    });
                  }
                } catch (err) {
                  console.error("Error fetching profile on auth change:", err);
                  set({
                    user: {
                      id: session.user.id,
                      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "User",
                      email: session.user.email || "",
                      avatar: session.user.user_metadata?.avatar_url || undefined,
                      plan: "free",
                      reportsUsed: 0,
                      reportsLimit: 5,
                    },
                    isAuthenticated: true,
                    mfaRequired: false,
                    mfaFactors: [],
                    isLoading: false
                  });
                }
              } else {
                set({ isLoading: false });
              }
            } else {
              // No session (either INITIAL_SESSION with null, or SIGNED_OUT)
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              set({ 
                user: null, 
                isAuthenticated: false,
                mfaRequired: false,
                mfaFactors: [],
                isLoading: false
              });
            }
          });
        } catch (error) {
          console.error('Error initializing auth:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          set({ 
            user: null, 
            isAuthenticated: false,
            mfaRequired: false,
            mfaFactors: [],
            isLoading: false
          });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const { user, token, refresh_token } = await authApi.login(email, password);

          if (user && token) {
            // Sync session with client-side Supabase client for MFA handling
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: refresh_token || "",
            });
            
            if (sessionError) throw sessionError;

            // Check if Multi-Factor Authentication is enrolled
            const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalError) throw aalError;

            const mfaRequired = aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2';

            if (mfaRequired) {
              const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
              if (factorsError) throw factorsError;
              
              set({
                mfaRequired: true,
                mfaFactors: factorsData.all || []
              });
              return { mfaRequired: true, factors: factorsData.all || [] };
            }

            localStorage.setItem('auth_token', token);
            if (refresh_token) {
              localStorage.setItem('refresh_token', refresh_token);
            }

            // Sync user details with store
            set({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar_url || undefined,
                plan: user.plan || "free",
                reportsUsed: user.reports_used || 0,
                reportsLimit: user.reports_limit || 5,
              },
              isAuthenticated: true,
              mfaRequired: false,
              mfaFactors: []
            });

            return { mfaRequired: false };
          }
        } catch (error: any) {
          console.error('Login error:', error);

          set({
            user: null,
            isAuthenticated: false,
            mfaRequired: false,
            mfaFactors: []
          });

          throw new Error(error.message || 'Login failed');
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithGoogle: async () => {
        try {
          const { error } =
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: window.location.origin + '/dashboard',
              },
            });

          if (error) {
            throw error;
          }
        } catch (error: any) {
          console.error(
            "Google login error:",
            error
          );

          throw new Error(
            error.message ||
              "Google login failed"
          );
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });

        try {
          const result = await authApi.register(name, email, password);

          // Registration now requires email verification.
          // User should login only after verifying email.

          set({
            user: null,
            isAuthenticated: false,
          });
          return result;
        } catch (error: any) {
          console.error('Registration error:', error);

          set({
            user: null,
            isAuthenticated: false,
          });

          throw new Error(error.message || 'Registration failed');
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        // Clear local storage and state immediately for instant responsive feedback
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        set({ 
          user: null, 
          isAuthenticated: false,
          mfaRequired: false,
          mfaFactors: []
        });

        // Clean up sessions on servers in the background
        try {
          await Promise.all([
            authApi.logout().catch(err => console.warn("Backend logout error:", err)),
            supabase.auth.signOut().catch(err => console.warn("Supabase logout error:", err))
          ]);
        } catch (error) {
          console.error('Logout background API error:', error);
        }
      },

      updateUser: async (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          // 1. Sync custom user metadata (company, notifications) with Supabase Auth
          const metadataUpdates: Record<string, any> = {};
          if (updates.company !== undefined) metadataUpdates.company = updates.company;
          if (updates.email_notifications !== undefined) metadataUpdates.email_notifications = updates.email_notifications;
          if (updates.marketing_emails !== undefined) metadataUpdates.marketing_emails = updates.marketing_emails;
          if (updates.report_alerts !== undefined) metadataUpdates.report_alerts = updates.report_alerts;

          if (Object.keys(metadataUpdates).length > 0) {
            const { error: metaError } = await supabase.auth.updateUser({
              data: metadataUpdates
            });
            if (metaError) throw metaError;
          }

          // 2. Sync core user profile (name, avatar) with backend FastAPI database
          const profileUpdates: Record<string, any> = {};
          if (updates.name !== undefined) profileUpdates.name = updates.name;
          if (updates.avatar !== undefined) profileUpdates.avatar_url = updates.avatar;

          if (Object.keys(profileUpdates).length > 0) {
            const result = await authApi.updateProfile(profileUpdates);
            if (!result.success) throw new Error("Failed to update backend profile");
          }

          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          }));
        } catch (error) {
          console.error('Update user error:', error);
          throw error;
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true });
        try {
          await authApi.deleteAccount();
          await supabase.auth.signOut();
        } catch (error: any) {
          console.error('Delete account error:', error);
          throw new Error(error.message || 'Failed to delete account');
        } finally {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      verifyMfa: async (factorId: string, code: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.mfa.challengeAndVerify({
            factorId,
            code,
          });

          if (error) throw error;

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) throw new Error("No session found after MFA verification.");

          localStorage.setItem('auth_token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('refresh_token', session.refresh_token);
          }

          // Fetch/Sync profile from backend
          const profile = await authApi.getProfile();
          if (profile) {
            set({
              user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                avatar: profile.avatar_url || undefined,
                plan: profile.plan as 'free' | 'premium' | 'enterprise',
                reportsUsed: profile.reports_used,
                reportsLimit: profile.reports_limit,
              },
              isAuthenticated: true,
              mfaRequired: false,
              mfaFactors: []
            });
          } else {
            throw new Error("Failed to load user profile");
          }

          return { success: true };
        } catch (error: any) {
          console.error("MFA verification error:", error);
          throw new Error(error.message || "Invalid verification code");
        } finally {
          set({ isLoading: false });
        }
      },

      refreshProfile: async () => {
        try {
          const profile = await authApi.getProfile();
          if (profile) {
            set({
              user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                avatar: profile.avatar_url || undefined,
                plan: profile.plan as 'free' | 'premium' | 'enterprise',
                reportsUsed: profile.reports_used,
                reportsLimit: profile.reports_limit,
                company: profile.company || "",
                email_notifications: profile.email_notifications !== undefined ? profile.email_notifications : true,
                marketing_emails: profile.marketing_emails !== undefined ? profile.marketing_emails : false,
                report_alerts: profile.report_alerts !== undefined ? profile.report_alerts : true,
              },
            });
          }
        } catch (err) {
          console.error("Error refreshing profile:", err);
        }
      },
    }),
    {
      name: 'auth-storage-v2',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
