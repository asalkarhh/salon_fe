import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { routes } from "@/config/routes";
import { api, parseApiError } from "@/lib/api";
import type {
  CreateOwnerRequest,
  CreateOwnerResponse,
  OwnerResponse,
  OwnerUpdateRequest,
  PlanResponse,
} from "@/types/api";

const baseSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  businessName: z.string().trim().min(1, "Business name is required"),
  password: z.string().trim().optional(),
  trialDays: z.number().optional(),
  planId: z.string().trim().optional(),
});

const createSchema = baseSchema.extend({
  password: z.string().trim().min(1, "Password is required"),
  trialDays: z.number().min(0, "Trial days must be zero or more"),
  planId: z.string().trim().min(1, "Plan is required"),
});

const editSchema = baseSchema.omit({
  password: true,
  trialDays: true,
  planId: true,
});

type OwnerFormValues = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  businessName: string;
  password?: string;
  trialDays?: number;
  planId?: string;
};

interface OwnerFormPageProps {
  mode: "create" | "edit";
}

export function OwnerFormPage({ mode }: OwnerFormPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();

  const ownerQuery = useQuery({
    queryKey: ["owners", id],
    queryFn: async () => (await api.get<OwnerResponse>(`/api/owners/${id}`)).data,
    enabled: mode === "edit" && Boolean(id),
  });

  const plansQuery = useQuery({
    queryKey: ["plans", "owner-form"],
    queryFn: async () => (await api.get<PlanResponse[]>("/api/subscriptions/plans")).data,
    enabled: mode === "create",
  });

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver((mode === "create" ? createSchema : editSchema) as never) as never,
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      businessName: "",
      password: "",
      trialDays: 14,
      planId: "",
    },
  });

  useEffect(() => {
    if (mode === "edit" && ownerQuery.data) {
      form.reset({
        fullName: ownerQuery.data.fullName,
        username: ownerQuery.data.username,
        email: ownerQuery.data.email,
        phone: ownerQuery.data.phone,
        businessName: ownerQuery.data.businessName,
      });
    }
  }, [form, mode, ownerQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateOwnerRequest) =>
      (await api.post<CreateOwnerResponse>("/api/auth/create-owner", payload)).data,
    onSuccess: (response) => {
      toast.success("Owner created successfully");
      navigate(`${routes.owners}/${response.ownerId}`);
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: OwnerUpdateRequest) =>
      (await api.put<OwnerResponse>(`/api/owners/${id}`, payload)).data,
    onSuccess: (response) => {
      toast.success("Owner updated successfully");
      navigate(`${routes.owners}/${response.id}`);
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  const isLoading = mode === "edit" ? ownerQuery.isLoading : plansQuery.isLoading;
  const isError = mode === "edit" ? ownerQuery.isError : plansQuery.isError;
  const error = mode === "edit" ? ownerQuery.error : plansQuery.error;

  if (isLoading) {
    return <LoadingSpinner label={mode === "create" ? "Loading plans..." : "Loading owner..."} />;
  }

  if (isError) {
    return (
      <ErrorState
        title={mode === "create" ? "Unable to load owner form" : "Unable to load owner"}
        description={parseApiError(error)}
      />
    );
  }

  const submitLabel =
    mode === "create"
      ? createMutation.isPending
        ? "Creating..."
        : "Create Owner"
      : updateMutation.isPending
        ? "Saving..."
        : "Save Changes";

  const onSubmit = (values: OwnerFormValues) => {
    if (mode === "create") {
      createMutation.mutate({
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phone: values.phone,
        password: values.password ?? "",
        businessName: values.businessName,
        trialDays: values.trialDays ?? 0,
        planId: values.planId ?? "",
      });
      return;
    }

    updateMutation.mutate({
      fullName: values.fullName,
      username: values.username,
      email: values.email,
      phone: values.phone,
      businessName: values.businessName,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Form"
        title={mode === "create" ? "Create Owner" : "Edit Owner"}
        description="Manage owner identity and salon onboarding details from one superadmin workflow."
      />

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormSection
          title="Owner details"
          description={mode === "create"
            ? "Creating an owner also creates the salon business, main branch, and trial subscription."
            : "Update the owner account and linked business name."}
        >
          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["fullName", "Full Name", "text"],
              ["username", "Username", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "text"],
              ["businessName", "Business Name", "text"],
            ].map(([name, label, type]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} type={type} {...form.register(name as keyof OwnerFormValues)} />
                <p className="text-xs text-destructive">
                  {form.formState.errors[name as keyof OwnerFormValues]?.message}
                </p>
              </div>
            ))}

            {mode === "create" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...form.register("password")} />
                  <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trialDays">Trial Days</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    {...form.register("trialDays", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value)),
                    })}
                  />
                  <p className="text-xs text-destructive">{form.formState.errors.trialDays?.message}</p>
                </div>

                <div className="space-y-2 md:col-span-2">
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
              </>
            ) : null}
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {submitLabel}
          </Button>
          <Button variant="outline" asChild>
            <Link to={mode === "create" ? routes.owners : `${routes.owners}/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
