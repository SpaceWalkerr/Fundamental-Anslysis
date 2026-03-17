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

// TEMPORARY: Bypass login for development
const BYPASS_LOGIN = false;
const mockUser: User = {
  id: 'dev-user-123',
  name: 'Dev User',
  email: 'dev@example.com',
  avatar: undefined,
  plan: 'premium',
  reportsUsed: 5,
  reportsLimit: 100,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: BYPASS_LOGIN ? mockUser : null,
      isAuthenticated: BYPASS_LOGIN,
      isLoading: false,

      initializeAuth: async () => {
        // TEMPORARY: Skip auth if bypass is enabled
        if (BYPASS_LOGIN) {
          set({ user: mockUser, isAuthenticated: true, isLoading: false });
          return;
        }
        
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
          } catch (e: any) {
            console.warn("Backend auth failed, falling back to mock login:", e);
            // Fallback for frontend-only
            set({
              user: mockUser,
              isAuthenticated: true,
            });
            localStorage.setItem('auth_token', 'mock_token_123');
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
          } catch (e: any) {
             console.warn("Backend register failed, falling back to mock registration:", e);
             set({
               user: { ...mockUser, name, email },
               isAuthenticated: true,
             });
             localStorage.setItem('auth_token', 'mock_token_123');
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
      name: 'auth-storage-v2',
    }
  )
);
