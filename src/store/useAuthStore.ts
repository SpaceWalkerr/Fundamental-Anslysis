import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

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
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Fetch user profile from database
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) throw error;

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
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) throw profileError;

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
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name,
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            // Profile will be created automatically by trigger
            // Wait a moment for the trigger to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Fetch the created profile
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) throw profileError;

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
        } catch (error: any) {
          console.error('Registration error:', error);
          throw new Error(error.message || 'Registration failed');
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      updateUser: async (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          const { error } = await supabase
            .from('users')
            .update({
              name: updates.name,
              avatar_url: updates.avatar,
            })
            .eq('id', currentUser.id);

          if (error) throw error;

          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          }));
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

// Initialize auth on app start
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    useAuthStore.getState().initializeAuth();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});
