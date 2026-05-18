import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Scissors, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, parseApiError } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";
import { logValidationFailure } from "@/lib/form-logging";
import { logger, summarizeError } from "@/lib/logger";
import type { CurrentUserResponse, LoginRequest, LoginResponse } from "@/types/api";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Auth entry page that performs the backend login flow and then hydrates the
 * current user context before entering the app shell.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "superadmin",
      password: "Admin@123",
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: LoginRequest) => {
    setSubmitting(true);
    try {
      // Credentials are intentionally excluded from logs; we only record the
      // authentication flow around the request.
      logger.info("auth", "login_submission_started");
      // Login is a two-step backend flow on purpose: first exchange credentials
      // for a token, then fetch /api/auth/me to resolve the role and salon
      // context that drive the rest of the frontend.
      const loginResponse = await api.post<LoginResponse>("/api/auth/login", values);
      const meResponse = await api.get<CurrentUserResponse>("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${loginResponse.data.token}`,
        },
      });
      login(loginResponse.data, meResponse.data);
      logger.info("auth", "login_submission_succeeded", {
        userId: meResponse.data.userId,
        role: meResponse.data.role,
      });
      toast.success(`Welcome back, ${meResponse.data.fullName}`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      logger.warn("auth", "login_submission_failed", {
        error: summarizeError(error),
      });
      toast.error(parseApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-grid px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(160deg,rgba(102,35,60,0.95),rgba(77,31,51,0.94),rgba(32,18,25,0.94))] p-8 text-white shadow-glow sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,196,122,0.35),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                <Scissors className="h-4 w-4" />
                Premium salon operations, exactly mapped to your Spring backend
              </div>
              <div className="max-w-2xl space-y-4">
                <p className="font-display text-5xl leading-none sm:text-6xl">
                  {APP_NAME}
                </p>
                <p className="max-w-xl text-base text-white/78 sm:text-lg">
                  Run salon operations, billing, staffing, and subscriptions from a polished multi-tenant cockpit built around your real backend contracts.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Super Admin", "Seeded platform login ready"],
                ["Salon Owner", "Branch, staff, services, invoices"],
                ["Staff", "Appointments, queue, earnings"],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                >
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-2 text-sm text-white/70">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-3 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h1 className="section-title text-center">Sign in</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use username, email, or phone as supported by the backend login service.
                </p>
              </div>
            </div>

            <form
              className="space-y-5"
              onSubmit={form.handleSubmit(onSubmit, (errors) =>
                logValidationFailure("login", errors as Record<string, never>),
              )}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  {...form.register("username")}
                />
                <p className="text-xs text-destructive">
                  {form.formState.errors.username?.message}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-input bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    {...form.register("password")}
                  />
                </div>
                <p className="text-xs text-destructive">
                  {form.formState.errors.password?.message}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Continue to dashboard"}
              </button>
            </form>

            <div className="rounded-3xl border border-border/80 bg-secondary/40 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Seeded login</p>
              <p className="mt-2">Username: `superadmin`</p>
              <p>Password: `Admin@123`</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
