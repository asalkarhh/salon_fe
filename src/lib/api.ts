import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/constants";
import { clearAuthState, loadAuthState } from "@/lib/auth";
import { createRequestId, logger, summarizeError } from "@/lib/logger";
import type { BackendErrorResponse } from "@/types/api";

interface RequestMetadata {
  requestId: string;
  startedAt: number;
}

type LoggedRequestConfig = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Normalizes header writes because Axios may expose headers as either the
// AxiosHeaders helper or a plain object depending on the request lifecycle.
function setHeader(
  config: InternalAxiosRequestConfig,
  name: string,
  value: string,
) {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  if ("set" in config.headers && typeof config.headers.set === "function") {
    config.headers.set(name, value);
    return;
  }

  (config.headers as Record<string, string>)[name] = value;
}

// Every request gets metadata so request/response logs can be correlated and
// timed without each feature page implementing its own tracing logic.
function resolveRequestMetadata(config: InternalAxiosRequestConfig) {
  const loggedConfig = config as LoggedRequestConfig;
  if (!loggedConfig.metadata) {
    loggedConfig.metadata = {
      requestId: createRequestId("api"),
      startedAt: performance.now(),
    };
  }
  return loggedConfig.metadata;
}

function resolveDuration(metadata?: RequestMetadata) {
  return metadata ? Math.round(performance.now() - metadata.startedAt) : undefined;
}

function isLoginRequest(config?: InternalAxiosRequestConfig) {
  return Boolean(config?.url?.includes("/api/auth/login"));
}

function resolveFailureLogger(status?: number) {
  return status && status < 500 ? logger.warn : logger.error;
}

// The shared request interceptor is the frontend equivalent of a data-access
// layer: it injects auth context, assigns a request id, and emits uniform logs
// before any screen-specific query or mutation reaches the backend.
api.interceptors.request.use((config) => {
  const metadata = resolveRequestMetadata(config);
  const { token } = loadAuthState();
  if (token) {
    setHeader(config, "Authorization", `Bearer ${token}`);
  }
  setHeader(config, "X-Request-Id", metadata.requestId);

  logger.info("api", "request_started", {
    requestId: metadata.requestId,
    method: (config.method ?? "get").toUpperCase(),
    url: config.url,
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    const metadata = (response.config as LoggedRequestConfig).metadata;
    logger.info("api", "request_completed", {
      requestId: response.headers["x-request-id"] ?? metadata?.requestId,
      method: (response.config.method ?? "get").toUpperCase(),
      url: response.config.url,
      status: response.status,
      durationMs: resolveDuration(metadata),
    });
    return response;
  },
  (error) => {
    const config = error.config as LoggedRequestConfig | undefined;
    const metadata = config?.metadata;
    const logFailure = resolveFailureLogger(error.response?.status);

    logFailure("api", "request_failed", {
      requestId: error.response?.headers?.["x-request-id"] ?? metadata?.requestId,
      method: config ? (config.method ?? "get").toUpperCase() : undefined,
      url: config?.url,
      status: error.response?.status,
      durationMs: resolveDuration(metadata),
      error: summarizeError(error),
    });

    if (error.response?.status === 401 && !isLoginRequest(config)) {
      logger.warn("auth", "session_expired", {
        requestId: error.response?.headers?.["x-request-id"] ?? metadata?.requestId,
        url: config?.url,
      });
      clearAuthState();
      toast.error("Your session expired. Please sign in again.");
      window.location.replace("/login");
    }
    return Promise.reject(error);
  },
);

// Converts backend validation and error payloads into a single user-facing
// message so pages can show consistent toast and error-state text.
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
