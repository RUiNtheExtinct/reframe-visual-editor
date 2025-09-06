"use client";

import { ExtendedSession, ExtendedUser, User } from "@/types";
import { Session } from "next-auth";
import { useEffect, useMemo } from "react";
import { getCurrentUser } from "@/lib/api/user/user.service";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // unix seconds
}

export interface UserState {
  user: ExtendedUser | null;
  fullUser: User | null;
  tokens: AuthTokens;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserActions {
  setUser: (user: ExtendedUser | null) => void;
  setFullUser: (fullUser: User | null) => void;
  updateUser: (updates: Partial<ExtendedUser>) => void;
  clearUser: () => void;

  setTokens: (tokens: Partial<AuthTokens>) => void;
  clearTokens: () => void;

  initializeFromSession: (
    session: ExtendedSession | null,
    fullUser: User | null | undefined
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchCurrentUser: () => Promise<void>;
  reset: () => void;
}

type UserStore = UserState & UserActions;

const initialState: UserState = {
  user: null,
  fullUser: null,
  tokens: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  },
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useUserStore = create<UserStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setUser: (user) => {
        set((state) => {
          state.user = user;
          state.isAuthenticated = Boolean(user);
        });
      },

      setFullUser: (fullUser) => {
        set((state) => {
          state.fullUser = fullUser;
        });
      },

      updateUser: (updates) => {
        set((state) => {
          if (!state.user) return;
          state.user = { ...(state.user as ExtendedUser), ...updates };
        });
      },

      clearUser: () => {
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
        });
      },

      setTokens: (tokens) => {
        set((state) => {
          state.tokens = { ...state.tokens, ...tokens } as AuthTokens;
        });
      },

      clearTokens: () => {
        set((state) => {
          state.tokens = { accessToken: null, refreshToken: null, expiresAt: null };
        });
      },

      initializeFromSession: (session, fullUser) => {
        set((state) => {
          if (session?.user) {
            state.user = session.user as ExtendedUser;
            state.fullUser = fullUser ?? null;
            state.tokens.accessToken = session.accessToken ?? null;
            state.tokens.refreshToken = session.refreshToken ?? null;
            state.tokens.expiresAt = session.expiresAt ?? null;
            state.isAuthenticated = true;
            state.error = null;
          } else {
            state.user = null;
            state.tokens = { accessToken: null, refreshToken: null, expiresAt: null };
            state.isAuthenticated = false;
          }
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      fetchCurrentUser: async () => {
        try {
          set((s) => {
            s.isLoading = true;
            s.error = null;
          });
          const { data } = await getCurrentUser();
          if (data?.success && data.data) {
            set((s) => {
              s.fullUser = data.data as User;
              s.isAuthenticated = true;
            });
          } else {
            set((s) => {
              s.fullUser = null;
            });
          }
        } catch (e: any) {
          set((s) => {
            s.error = e?.message ?? "Failed to load user";
          });
        } finally {
          set((s) => {
            s.isLoading = false;
          });
        }
      },

      reset: () => {
        set(() => initialState);
      },
    })),
    { name: "user-store" }
  )
);

// Selectors
export const useCurrentUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useAccessToken = () => useUserStore((state) => state.tokens.accessToken);
export const useRefreshToken = () => useUserStore((state) => state.tokens.refreshToken);
export const useTokenExpiry = () => useUserStore((state) => state.tokens.expiresAt);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);

// Action hooks
export const useUserActions = () => {
  const setUser = useUserStore((s) => s.setUser);
  const updateUser = useUserStore((s) => s.updateUser);
  const clearUser = useUserStore((s) => s.clearUser);
  const setTokens = useUserStore((s) => s.setTokens);
  const clearTokens = useUserStore((s) => s.clearTokens);
  const initializeFromSession = useUserStore((s) => s.initializeFromSession);

  return useMemo(
    () => ({ setUser, updateUser, clearUser, setTokens, clearTokens, initializeFromSession }),
    [setUser, updateUser, clearUser, setTokens, clearTokens, initializeFromSession]
  );
};

// Optional convenience hook to sync store with next-auth session.
// Use this once at a top-level client component (e.g., in app/layout.tsx).
export const useSyncUserFromSession = (
  fullUser: User | null | undefined,
  fullUserError: Error | null | undefined,
  session: Session | null,
  status: "loading" | "authenticated" | "unauthenticated"
) => {
  const initializeFromSession = useUserStore((s) => s.initializeFromSession);
  const setLoading = useUserStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(status === "loading");
  }, [status, setLoading]);

  useEffect(() => {
    initializeFromSession(
      (session as ExtendedSession) ?? null,
      fullUser && !fullUserError ? fullUser : null
    );
  }, [session, initializeFromSession, fullUser, fullUserError]);
};
