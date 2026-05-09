import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { App } from "@/app/App";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/query-client";
import "@/index.css";

logger.info("app", "bootstrap", {
  mode: import.meta.env.MODE,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
