import { AUTH_STORAGE_KEY } from "@/lib/constants";
import type { AuthState } from "@/types/auth";

const emptyState: AuthState = {
  token: null,
  user: null,
};

export function loadAuthState(): AuthState {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }

    return { ...emptyState, ...JSON.parse(raw) } as AuthState;
  } catch {
    return emptyState;
  }
}

export function saveAuthState(state: AuthState) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function clearAuthState() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
