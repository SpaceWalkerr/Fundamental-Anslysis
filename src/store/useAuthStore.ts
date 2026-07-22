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
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  skipLogin: () => void;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  /** Local-only user patch (no backend call) — e.g. after server-verified plan change. */
  patchUser: (updates: Partial<User>) => void;
  initializeAuth: () => Promise<void>;
}

const TEST_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_TEST_LOGIN === "true";
const TEST_LOGIN_TOKEN = "dev-test-token";
const TEST_USER: User = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test User",
  email: "test@example.com",
  // Default the dev test-login to the FREE tier so the local experience shows
  // the full Free journey + all Pro upgrade nudges. Upgrade via the real
  // Razorpay flow (or flip to "premium" here) to preview Pro.
  plan: "free",
  reportsUsed: 3,
  reportsLimit: 5,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      initializeAuth: async () => {
        set({ isLoading: true });

        // DEV bypass: when test login is enabled (VITE_ENABLE_TEST_LOGIN=true),
        // auto sign-in as the Test User so protected routes work locally without
        // the hosted Google/Supabase OAuth redirect. No effect in production
        // where the flag is unset.
        if (TEST_LOGIN_ENABLED) {
          localStorage.setItem("auth_token", TEST_LOGIN_TOKEN);
          set({ user: TEST_USER, isAuthenticated: true, isLoading: false });
          return;
        }

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            const user = session.user;

            set({
              user: {
                id: user.id,
                name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  "User",
                email: user.email || "",
                avatar:
                  user.user_metadata?.avatar_url ||
                  undefined,
                plan: "free",
                reportsUsed: 0,
                reportsLimit: 5,
              },
              isAuthenticated: true,
              isLoading: false,
            });

            return;
          }
          
          const token = localStorage.getItem('auth_token');
          
          if (token) {
            if (TEST_LOGIN_ENABLED && token === TEST_LOGIN_TOKEN) {
              set({
                user: TEST_USER,
                isAuthenticated: true,
              });
              return;
            }

            // Fetch user profile from backend
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
              });
            }
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          localStorage.removeItem('auth_token');
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const { user } = await authApi.login(email, password);

          if (user) {
            set({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar_url || undefined,
                plan: user.plan as 'free' | 'premium' | 'enterprise',
                reportsUsed: user.reports_used,
                reportsLimit: user.reports_limit,
              },
              isAuthenticated: true,
            });
          }
        } catch (error: unknown) {
          const err = error as Error;
          console.error('Login error:', error);

          set({
            user: null,
            isAuthenticated: false,
          });

          throw new Error(err.message || 'Login failed');
        } finally {
          set({ isLoading: false });
        }
      },

      skipLogin: () => {
        if (!TEST_LOGIN_ENABLED) {
          throw new Error("Test login is not enabled");
        }

        localStorage.setItem("auth_token", TEST_LOGIN_TOKEN);
        set({
          user: TEST_USER,
          isAuthenticated: true,
          isLoading: false,
        });
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
        } catch (error: unknown) {
          const err = error as Error;
          console.error(
            "Google login error:",
            error
          );

          throw new Error(
            err.message ||
              "Google login failed"
          );
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });

        try {
          await authApi.register(name, email, password);

          // Registration now requires email verification.
          // User should login only after verifying email.

          set({
            user: null,
            isAuthenticated: false,
          });
        } catch (error: unknown) {
          const err = error as Error;
          console.error('Registration error:', error);

          set({
            user: null,
            isAuthenticated: false,
          });

          throw new Error(err.message || 'Registration failed');
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, isAuthenticated: false });
        }
      },

      patchUser: (updates: Partial<User>) => {
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null }));
      },

      updateUser: async (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          const result = await authApi.updateProfile({
            name: updates.name,
            avatar_url: updates.avatar,
          });

          if (result.success) {
            set((state) => ({
              user: state.user ? { ...state.user, ...updates } : null,
            }));
          }
        } catch (error) {
          console.error('Update user error:', error);
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage-v2',
    }
  )
);
