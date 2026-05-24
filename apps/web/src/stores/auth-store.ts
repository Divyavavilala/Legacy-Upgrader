import { create } from 'zustand';
import { api } from '@/api/sdk';
import {
  clearStoredTokens,
  getStoredTokens,
  persistTokens,
  setTokenRefreshListener,
} from '@/api/client';
import type { AuthTokens, UserProfile } from '@/api/types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setUser: (user: UserProfile | null) => void;
  login: (tokens: AuthTokens) => Promise<UserProfile>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrating: true,

  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),

  login: async (tokens) => {
    persistTokens(tokens);
    const user = await api.auth.me();
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    const { refreshToken } = getStoredTokens();
    try {
      if (refreshToken) {
        await api.auth.logout(refreshToken);
      }
    } finally {
      clearStoredTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  hydrate: async () => {
    set({ isHydrating: true });
    try {
      const { accessToken } = getStoredTokens();
      if (!accessToken) {
        set({ user: null, isAuthenticated: false, isHydrating: false });
        return;
      }
      const user = await api.auth.me();
      set({ user, isAuthenticated: true, isHydrating: false });
    } catch {
      clearStoredTokens();
      set({ user: null, isAuthenticated: false, isHydrating: false });
    }
  },
}));

setTokenRefreshListener((tokens) => {
  if (!tokens) {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});
