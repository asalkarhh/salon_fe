import type { CurrentUserResponse, LoginResponse } from "@/types/api";

export interface AuthState {
  token: string | null;
  user: CurrentUserResponse | null;
}

export interface AuthContextValue extends AuthState {
  hydrated: boolean;
  isAuthenticated: boolean;
  login: (response: LoginResponse, user: CurrentUserResponse) => void;
  logout: () => void;
  setUser: (user: CurrentUserResponse | null) => void;
}
