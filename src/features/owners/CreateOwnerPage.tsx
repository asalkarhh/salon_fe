import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { FormSection } from "@/components/common/FormSection";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, parseApiError } from "@/lib/api";
import type { CreateOwnerRequest, CreateOwnerResponse, PlanResponse } from "@/types/api";

const schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  password: z.string().trim().min(1, "Password is required"),
  businessName: z.string().trim().min(1, "Business name is required"),
  trialDays: z.number().min(0, "Trial days must be zero or more"),
  planId: z.string().trim().min(1, "Plan is required"),
});

type Values = z.infer<typeof schema>;

/**
 * Legacy owner-onboarding screen backed by the create-owner endpoint and plan
 * catalog lookup.
 */
export function CreateOwnerPage() {
  const [result, setResult] = useState<CreateOwnerResponse | null>(null);

  // The onboarding flow needs the plan catalog because POST /api/auth/create-owner
  // also provisions the owner's initial subscription.
  const plansQuery = useQuery({
    queryKey: ["plans", "lookup"],
    queryFn: async () => (await api.get<PlanResponse[]>("/api/subscriptions/plans")).data,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      businessName: "",
      trialDays: 14,
      planId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateOwnerRequest) =>
      (await api.post<CreateOwnerResponse>("/api/auth/create-owner", payload)).data,
    onSuccess: (response) => {
      setResult(response);
      toast.success("Salon owner created successfully");
      form.reset({
        ...form.getValues(),
        password: "",
      });
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  const onSubmit = (values: Values) => {
    createMutation.mutate(values);
  };

  if (plansQuery.isLoading) {
    return <LoadingSpinner label="Loading plans..." />;
  }

  if (plansQuery.isError) {
    return (
      <ErrorState
        title="Unable to load plans"
        description={parseApiError(plansQuery.error)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Onboarding"
        title="Create Salon Owner"
        description="This flow uses the backend owner-creation endpoint, which also creates the salon business, main branch, and trial subscription."
      />

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormSection
          title="Owner details"
          description="All fields map directly to `POST /api/auth/create-owner`."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["fullName", "Full Name", "text"],
              ["username", "Username", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "text"],
              ["password", "Password", "password"],
              ["businessName", "Business Name", "text"],
            ].map(([name, label, type]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} type={type} {...form.register(name as keyof Values)} />
                <p className="text-xs text-destructive">
                  {form.formState.errors[name as keyof Values]?.message}
                </p>
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Days</Label>
              <Input
                id="trialDays"
                type="number"
                {...form.register("trialDays", {
                  setValueAs: (value) => Number(value),
                })}
              />
              <p className="text-xs text-destructive">{form.formState.errors.trialDays?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planId">Plan</Label>
              <Select
                id="planId"
                placeholder="Choose a plan"
                options={(plansQuery.data ?? []).map((plan) => ({
                  label: `${plan.name} / ${plan.monthlyPrice}`,
                  value: plan.id,
                }))}
                {...form.register("planId")}
              />
              <p className="text-xs text-destructive">{form.formState.errors.planId?.message}</p>
            </div>
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create owner"}
          </Button>
        </div>
      </form>

      {result ? (
        <FormSection
          title="Owner created"
          description="Save these generated references for support, onboarding, or Postman testing."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries({
              ownerId: result.ownerId,
              username: result.username,
              salonBusinessId: result.salonBusinessId,
              salonCode: result.salonCode,
              branchId: result.branchId,
              subscriptionId: result.subscriptionId,
            }).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{key}</p>
                <p className="mt-2 break-all text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </FormSection>
      ) : null}
    </div>
  );
}
