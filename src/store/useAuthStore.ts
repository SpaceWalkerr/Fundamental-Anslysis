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
          // Register a completely synchronous auth state change listener to keep tokens and basic session in sync.
          // This avoids executing any asynchronous or Supabase client auth calls inside onAuthStateChange,
          // completely preventing deadlocks and concurrent request aborts in GoTrue.
          supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              localStorage.setItem('auth_token', session.access_token);
              if (session.refresh_token) {
                localStorage.setItem('refresh_token', session.refresh_token);
              }
            } else if (event === 'SIGNED_OUT') {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              set({ 
                user: null, 
                isAuthenticated: false,
                mfaRequired: false,
                mfaFactors: []
              });
            }
          });

          // Fetch active session. This handles token auto-refresh internally.
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (session?.user) {
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
              // Retrieve active factors to display in verification form
              const { data: factorsData } = await supabase.auth.mfa.listFactors();
              set({ 
                user: null, 
                isAuthenticated: false,
                mfaRequired: true,
                mfaFactors: factorsData?.all || []
              });
              return;
            }

            // Sync user profile from backend
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
                  mfaFactors: []
                });
              }
            } catch (err) {
              console.error("Error fetching profile on initialization:", err);
              // Fallback to supabase user metadata if backend profile fetch fails
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
                mfaFactors: []
              });
            }
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            set({ 
              user: null, 
              isAuthenticated: false,
              mfaRequired: false,
              mfaFactors: []
            });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          set({ 
            user: null, 
            isAuthenticated: false,
            mfaRequired: false,
            mfaFactors: []
          });
        } finally {
          set({ isLoading: false });
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
        try {
          await authApi.logout();
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          set({ 
            user: null, 
            isAuthenticated: false,
            mfaRequired: false,
            mfaFactors: []
          });
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
