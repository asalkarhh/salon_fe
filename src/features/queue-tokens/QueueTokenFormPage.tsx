import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, parseApiError } from "@/lib/api";
import { routes } from "@/config/routes";
import { useAuth } from "@/features/auth/AuthProvider";
import type { BranchResponse, CustomerResponse, QueueTokenCreateRequest, QueueTokenResponse, SalonBusinessResponse } from "@/types/api";

const schema = z.object({
  salonBusinessId: z.string().optional(),
  branchId: z.string().min(1, "Branch is required"),
  customerProfileId: z.string().min(1, "Customer is required"),
  tokenDate: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function QueueTokenFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonBusinessId: "",
      branchId: "",
      customerProfileId: "",
      tokenDate: "",
    },
  });

  const salonsQuery = useQuery({
    queryKey: ["queue-create", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
    enabled: user?.role === "SUPER_ADMIN",
  });
  const branchesQuery = useQuery({
    queryKey: ["queue-create", "branches"],
    queryFn: async () => (await api.get<BranchResponse[]>("/api/branches")).data,
  });
  const customersQuery = useQuery({
    queryKey: ["queue-create", "customers"],
    queryFn: async () => (await api.get<CustomerResponse[]>("/api/customers")).data,
  });

  const selectedSalonId = form.watch("salonBusinessId");

  const filteredBranches = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return branchesQuery.data ?? [];
    }
    return (branchesQuery.data ?? []).filter((branch) => branch.salonBusinessId === selectedSalonId);
  }, [branchesQuery.data, selectedSalonId, user?.role]);

  const filteredCustomers = useMemo(() => {
    if (user?.role !== "SUPER_ADMIN" || !selectedSalonId) {
      return customersQuery.data ?? [];
    }
    return (customersQuery.data ?? []).filter(
      (customer) => customer.salonBusinessId === selectedSalonId,
    );
  }, [customersQuery.data, selectedSalonId, user?.role]);

  const createMutation = useMutation({
    mutationFn: async (payload: QueueTokenCreateRequest) =>
      (await api.post<QueueTokenResponse>("/api/queue-tokens", payload)).data,
    onSuccess: (response) => {
      toast.success("Queue token created");
      navigate(`${routes.queueTokens}/${response.id}`);
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  if (branchesQuery.isLoading || customersQuery.isLoading || salonsQuery.isLoading) {
    return <LoadingSpinner label="Loading queue token form..." />;
  }

  if (branchesQuery.isError || customersQuery.isError || salonsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load queue token form"
        description={
          parseApiError(branchesQuery.error) ||
          parseApiError(customersQuery.error) ||
          parseApiError(salonsQuery.error)
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title="New Queue Token"
        description="Create a queue token exactly through the backend queue token request DTO."
      />

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) =>
          createMutation.mutate({
            salonBusinessId: values.salonBusinessId || undefined,
            branchId: values.branchId,
            customerProfileId: values.customerProfileId,
            tokenDate: values.tokenDate || undefined,
          }),
        )}
      >
        <FormSection title="Queue token details">
          <div className="grid gap-5 md:grid-cols-2">
            {user?.role === "SUPER_ADMIN" ? (
              <div className="space-y-2">
                <Label htmlFor="salonBusinessId">Salon</Label>
                <Select
                  id="salonBusinessId"
                  placeholder="Choose salon"
                  options={(salonsQuery.data ?? []).map((salon) => ({
                    label: `${salon.businessName} (${salon.salonCode})`,
                    value: salon.id,
                  }))}
                  {...form.register("salonBusinessId")}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="branchId">Branch</Label>
              <Select
                id="branchId"
                placeholder="Choose branch"
                options={filteredBranches.map((branch) => ({
                  label: branch.branchName,
                  value: branch.id,
                }))}
                {...form.register("branchId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerProfileId">Customer</Label>
              <Select
                id="customerProfileId"
                placeholder="Choose customer"
                options={filteredCustomers.map((customer) => ({
                  label: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
                  value: customer.id,
                }))}
                {...form.register("customerProfileId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenDate">Token Date</Label>
              <input
                id="tokenDate"
                type="date"
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                {...form.register("tokenDate")}
              />
            </div>
          </div>
        </FormSection>

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create token"}
        </Button>
      </form>
    </div>
  );
}
