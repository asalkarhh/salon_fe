import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { logger, summarizeError } from "@/lib/logger";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Captures rendering failures so unexpected UI crashes are visible in logs and
 * fail gracefully for the user.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ui", "render_failure", {
      error: summarizeError(error),
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            description="An unexpected interface error occurred. Refresh the page to restore the current workspace."
          />
        </div>
      );
    }

    return this.props.children;
  }
}
