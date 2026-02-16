import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

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
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const token = localStorage.getItem('auth_token');
          
          if (token) {
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
          const { user, token } = await authApi.login(email, password);

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
        } catch (error: any) {
          console.error('Login error:', error);
          throw new Error(error.message || 'Login failed');
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authApi.register(name, email, password);

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
        } catch (error: any) {
          console.error('Registration error:', error);
          throw new Error(error.message || 'Registration failed');
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
      name: 'auth-storage',
    }
  )
);
