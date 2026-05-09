import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { logger, summarizeError } from "@/lib/logger";

/**
 * Emits top-level navigation and runtime error events so frontend issues can be
 * traced alongside API activity.
 */
export function AppTelemetry() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    logger.info("navigation", "route_changed", {
      pathname: location.pathname,
      search: location.search || undefined,
      hash: location.hash || undefined,
      navigationType,
    });
  }, [location.hash, location.pathname, location.search, navigationType]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logger.error("window", "unhandled_error", {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: summarizeError(event.error),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      logger.error("window", "unhandled_rejection", {
        reason: summarizeError(event.reason),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
