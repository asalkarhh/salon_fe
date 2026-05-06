import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { api, parseApiError } from "@/lib/api";
import { clearAuthState, loadAuthState, saveAuthState } from "@/lib/auth";
import type { CurrentUserResponse } from "@/types/api";
import type { AuthContextValue, AuthState } from "@/types/auth";
import type { LoginResponse } from "@/types/api";

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => loadAuthState());
  const [hydrated, setHydrated] = useState(false);

  const syncState = (nextState: AuthState) => {
    setState(nextState);
    if (nextState.token) {
      saveAuthState(nextState);
    } else {
      clearAuthState();
    }
  };

  const hydrateUser = useEffectEvent(async () => {
    if (!state.token) {
      setHydrated(true);
      return;
    }

    try {
      const response = await api.get<CurrentUserResponse>("/api/auth/me");
      syncState({
        token: state.token,
        user: response.data,
      });
    } catch (error) {
      clearAuthState();
      setState({ token: null, user: null });
      toast.error(parseApiError(error));
    } finally {
      setHydrated(true);
    }
  });

  useEffect(() => {
    void hydrateUser();
  }, [hydrateUser, state.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      hydrated,
      isAuthenticated: Boolean(state.token && state.user),
      login: (response: LoginResponse, user: CurrentUserResponse) => {
        syncState({
          token: response.token,
          user,
        });
      },
      logout: () => {
        syncState({ token: null, user: null });
      },
      setUser: (user) => {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
