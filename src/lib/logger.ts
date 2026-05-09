type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveConfiguredLevel(value: unknown): LogLevel | undefined {
  return value === "debug" || value === "info" || value === "warn" || value === "error"
    ? value
    : undefined;
}

const minimumLevel: LogLevel =
  resolveConfiguredLevel(import.meta.env.VITE_LOG_LEVEL) ??
  (import.meta.env.DEV ? "warn" : "error");
const sensitiveKeyPattern = /password|token|authorization|secret|otp|email|phone/i;

function shouldEmit(level: LogLevel) {
  return levelPriority[level] >= levelPriority[minimumLevel];
}

function trimString(value: string) {
  return value.length > 300 ? `${value.slice(0, 297)}...` : value;
}

function sanitizeValue(value: unknown, keyPath?: string, depth = 0): unknown {
  if (keyPath && sensitiveKeyPattern.test(keyPath)) {
    return "[redacted]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return trimString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: trimString(value.stack ?? ""),
    };
  }

  if (Array.isArray(value)) {
    if (depth >= 2) {
      return `array[length=${value.length}]`;
    }
    return value.map((item, index) => sanitizeValue(item, `${keyPath ?? "item"}.${index}`, depth + 1));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (depth >= 2) {
      return `object[keys=${keys.length}]`;
    }
    return keys.reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = sanitizeValue(record[key], key, depth + 1);
      return accumulator;
    }, {});
  }

  return String(value);
}

function emit(level: LogLevel, module: string, event: string, context?: Record<string, unknown>) {
  if (!shouldEmit(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    module,
    event,
    ...(context ? { context: sanitizeValue(context) } : {}),
  };

  console[level](`[salon-fe] ${module}:${event}`, payload);
}

export function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return sanitizeValue(error);
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const response = record.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;

    return sanitizeValue({
      name: record.name ?? "UnknownError",
      message:
        record.message ??
        data?.message ??
        "Unexpected client-side error",
      code: record.code,
      status: response?.status,
      requestId:
        data?.requestId ??
        (response?.headers as Record<string, unknown> | undefined)?.["x-request-id"],
    });
  }

  return { message: String(error) };
}

export function summarizeDataShape(data: unknown) {
  if (Array.isArray(data)) {
    return `array[length=${data.length}]`;
  }
  if (data && typeof data === "object") {
    return `object[keys=${Object.keys(data as Record<string, unknown>).length}]`;
  }
  return typeof data;
}

export function createRequestId(prefix = "web") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const logger = {
  debug: (module: string, event: string, context?: Record<string, unknown>) =>
    emit("debug", module, event, context),
  info: (module: string, event: string, context?: Record<string, unknown>) =>
    emit("info", module, event, context),
  warn: (module: string, event: string, context?: Record<string, unknown>) =>
    emit("warn", module, event, context),
  error: (module: string, event: string, context?: Record<string, unknown>) =>
    emit("error", module, event, context),
};
