import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/constants";
import { clearAuthState, loadAuthState } from "@/lib/auth";
import type { BackendErrorResponse } from "@/types/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const { token } = loadAuthState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState();
      toast.error("Your session expired. Please sign in again.");
      window.location.replace("/login");
    }
    return Promise.reject(error);
  },
);

export function parseApiError(error: unknown) {
  if (axios.isAxiosError<BackendErrorResponse>(error)) {
    const data = error.response?.data;
    const validationMessage = data?.validationErrors
      ? Object.values(data.validationErrors)[0]
      : undefined;

    return (
      validationMessage ||
      data?.message ||
      error.message ||
      "Something went wrong while talking to the salon backend."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while talking to the salon backend.";
}
