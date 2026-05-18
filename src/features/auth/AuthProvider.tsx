import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { api, parseApiError } from "@/lib/api";
import { clearAuthState, loadAuthState, saveAuthState } from "@/lib/auth";
import { logger, summarizeError } from "@/lib/logger";
import type { CurrentUserResponse } from "@/types/api";
import type { AuthContextValue, AuthState } from "@/types/auth";
import type { LoginResponse } from "@/types/api";

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionHydrationRequests = new Map<string, Promise<CurrentUserResponse>>();

// Deduplicates concurrent /api/auth/me calls so refreshes and route mounts do
// not fan out multiple session-hydration requests for the same token.
function hydrateCurrentUser(token: string) {
  const existingRequest = sessionHydrationRequests.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  logger.info("auth", "session_hydration_started");
  const request = api
    .get<CurrentUserResponse>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => response.data)
    .finally(() => {
      sessionHydrationRequests.delete(token);
    });

  sessionHydrationRequests.set(token, request);
  return request;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Holds the authenticated user state and restores it from the backend whenever
 * a persisted token is present.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => loadAuthState());
  const [hydrated, setHydrated] = useState(false);
  const skipNextHydrationRef = useRef(false);

  const syncState = (nextState: AuthState) => {
    logger.debug("auth", "state_synchronized", {
      authenticated: Boolean(nextState.token && nextState.user),
      hasToken: Boolean(nextState.token),
      userId: nextState.user?.userId,
      role: nextState.user?.role,
    });
    setState(nextState);
    if (nextState.token) {
      saveAuthState(nextState);
    } else {
      clearAuthState();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const hydrateUser = async () => {
      if (!state.token) {
        logger.debug("auth", "session_hydration_skipped", {
          reason: "no_token",
        });
        if (!cancelled) {
          setHydrated(true);
        }
        return;
      }

      if (skipNextHydrationRef.current) {
        skipNextHydrationRef.current = false;
        logger.debug("auth", "session_hydration_skipped", {
          reason: "fresh_login",
        });
        if (!cancelled) {
          setHydrated(true);
        }
        return;
      }

      try {
        // Session restoration always re-reads the current user from the backend so
        // the client state reflects the latest role and salon scope.
        const user = await hydrateCurrentUser(state.token);
        if (cancelled) {
          return;
        }
        syncState({
          token: state.token,
          user,
        });
        logger.info("auth", "session_hydration_succeeded", {
          userId: user.userId,
          role: user.role,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        clearAuthState();
        setState({ token: null, user: null });
        logger.warn("auth", "session_hydration_failed", {
          error: summarizeError(error),
        });
        toast.error(parseApiError(error));
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void hydrateUser();

    return () => {
      cancelled = true;
    };
  }, [state.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      hydrated,
      isAuthenticated: Boolean(state.token && state.user),
      login: (response: LoginResponse, user: CurrentUserResponse) => {
        skipNextHydrationRef.current = true;
        logger.info("auth", "login_completed", {
          userId: user.userId,
          role: user.role,
        });
        syncState({
          token: response.token,
          user,
        });
      },
      logout: () => {
        logger.info("auth", "logout_completed", {
          userId: state.user?.userId,
        });
        syncState({ token: null, user: null });
      },
      setUser: (user) => {
        logger.info("auth", "user_context_updated", {
          userId: user?.userId,
          role: user?.role,
        });
        syncState({
          token: state.token,
          user,
        });
      },
    }),
    [hydrated, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Convenience hook for accessing the authenticated user and auth actions.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
