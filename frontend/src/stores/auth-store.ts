import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const params = new URLSearchParams();
        params.set('username', email);
        params.set('password', password);

        const { access_token } = await api.postForm<{
          access_token: string;
        }>('/auth/login', params, { skipAuth: true });

        localStorage.setItem('access_token', access_token);
        set({ token: access_token, isAuthenticated: true });

        const user = await api.get<User>('/auth/me');
        set({ user });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const user = await api.get<User>('/auth/me');
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          localStorage.removeItem('access_token');
        }
      },
    }),
    {
      name: 'zena-auth',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export { useAuthStore };
