import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { FormSection } from "@/components/common/FormSection";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, parseApiError } from "@/lib/api";
import { logValidationFailure } from "@/lib/form-logging";
import { logger, summarizeError } from "@/lib/logger";
import type { SalonBusinessResponse, UpdateSalonBusinessRequest } from "@/types/api";

const schema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
});

type Values = z.infer<typeof schema>;

export function MySalonPage() {
  const formName = "my-salon";
  const queryClient = useQueryClient();
  const salonQuery = useQuery({
    queryKey: ["my-salon"],
    queryFn: async () => (await api.get<SalonBusinessResponse>("/api/salons/my-salon")).data,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
  });

  useEffect(() => {
    if (salonQuery.data) {
      logger.debug("forms", "my_salon_loaded", {
        salonBusinessId: salonQuery.data.id,
      });
      form.reset({
        businessName: salonQuery.data.businessName,
        email: salonQuery.data.email ?? "",
        phone: salonQuery.data.phone ?? "",
        address: salonQuery.data.address ?? "",
        city: salonQuery.data.city ?? "",
        state: salonQuery.data.state ?? "",
        country: salonQuery.data.country ?? "",
        pincode: salonQuery.data.pincode ?? "",
      });
    }
  }, [form, salonQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateSalonBusinessRequest) => {
      if (!salonQuery.data) {
        throw new Error("Salon could not be loaded");
      }
      return (
        await api.put<SalonBusinessResponse>(`/api/salons/${salonQuery.data.id}`, payload)
      ).data;
    },
    onSuccess: () => {
      logger.info("forms", "my_salon_submission_succeeded", {
        salonBusinessId: salonQuery.data?.id,
      });
      toast.success("Salon updated successfully");
      void queryClient.invalidateQueries({ queryKey: ["my-salon"] });
    },
    onError: (error) => {
      logger.error("forms", "my_salon_submission_failed", {
        salonBusinessId: salonQuery.data?.id,
        error: summarizeError(error),
      });
      toast.error(parseApiError(error));
    },
  });

  if (salonQuery.isLoading) {
    return <LoadingSpinner label="Loading your salon..." />;
  }

  if (salonQuery.isError || !salonQuery.data) {
    return (
      <ErrorState title="Unable to load salon" description={parseApiError(salonQuery.error)} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Salon"
        title={`${salonQuery.data.businessName} / ${salonQuery.data.salonCode}`}
        description="Update the owner-facing salon profile using the same fields as the backend update DTO."
      />

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(
          (values) => {
            logger.info("forms", "my_salon_submission_started", {
              formName,
              salonBusinessId: salonQuery.data?.id,
              fieldCount: Object.keys(values).length,
            });
            updateMutation.mutate(values);
          },
          (errors) => logValidationFailure(formName, errors as Record<string, never>),
        )}
      >
        <FormSection title="Salon profile">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["businessName", "Business Name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "text"],
              ["city", "City", "text"],
              ["state", "State", "text"],
              ["country", "Country", "text"],
              ["pincode", "Pincode", "text"],
            ].map(([name, label, type]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} type={type} {...form.register(name as keyof Values)} />
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" {...form.register("address")} />
            </div>
          </div>
        </FormSection>

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
