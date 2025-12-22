/**
 * @file src/store/useAuthStore.ts
 * @description Global state management for authentication using Zustand.
 * Handles user session, login/logout, and persists to localStorage.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { User } from "@/types/schema";

// =============================================================================
// STATE INTERFACE
// =============================================================================

interface AuthState {
  /** Current authenticated user or null */
  user: User | null;
  /** Authentication token */
  token: string | null;
  /** Loading state for auth operations */
  isLoading: boolean;
  /** Error message if auth fails */
  error: string | null;
}

interface AuthActions {
  /** Set user and token after login/signup */
  setAuth: (user: User, token: string) => void;
  /** Update user data */
  updateUser: (user: Partial<User>) => void;
  /** Clear auth state (logout) */
  logout: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Update saved topics */
  updateTopics: (topics: string[]) => void;
}

type AuthStore = AuthState & AuthActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        ...initialState,

        // Actions
        setAuth: (user: User, token: string) => {
          set({ user, token, error: null }, false, "setAuth");
        },

        updateUser: (userData: Partial<User>) => {
          const { user } = get();
          if (user) {
            set({ user: { ...user, ...userData } }, false, "updateUser");
          }
        },

        logout: () => {
          set({ user: null, token: null, error: null }, false, "logout");
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, "setLoading");
        },

        setError: (error: string | null) => {
          set({ error }, false, "setError");
        },

        updateTopics: (topics: string[]) => {
          const { user } = get();
          if (user) {
            set(
              { user: { ...user, saved_topics: topics } },
              false,
              "updateTopics"
            );
          }
        },
      }),
      {
        name: "briefly-auth",
        partialize: (state) => ({ user: state.user, token: state.token }),
      }
    ),
    { name: "AuthStore" }
  )
);

export default useAuthStore;
