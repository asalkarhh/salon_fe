import { AppTelemetry } from "@/app/AppTelemetry";
import { AppRouter } from "@/app/router";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";

export function App() {
  return (
    <AppErrorBoundary>
      <AppTelemetry />
      <AppRouter />
    </AppErrorBoundary>
  );
}
