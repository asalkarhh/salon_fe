import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { FormSection } from "@/components/common/FormSection";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { api, parseApiError } from "@/lib/api";
import { FEATURE_LABELS } from "@/lib/constants";
import { toSalonSelectOption } from "@/lib/select-options";
import type {
  FeatureAccessItemRequest,
  SalonBusinessResponse,
  SalonFeatureAccessResponse,
} from "@/types/api";

export function FeatureAccessPage() {
  const params = useParams<{ salonBusinessId?: string }>();
  const [selectedSalonId, setSelectedSalonId] = useState(params.salonBusinessId ?? "");
  const [draft, setDraft] = useState<Record<string, FeatureAccessItemRequest>>({});

  const salonsQuery = useQuery({
    queryKey: ["feature-access", "salons"],
    queryFn: async () => (await api.get<SalonBusinessResponse[]>("/api/salons")).data,
  });

  const queryKey = useMemo(
    () => ["feature-access", selectedSalonId],
    [selectedSalonId],
  );

  const featureAccessQuery = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await api.get<SalonFeatureAccessResponse>(
          `/api/feature-access/salons/${selectedSalonId}`,
        )
      ).data,
    enabled: Boolean(selectedSalonId),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: FeatureAccessItemRequest[]) =>
      (
        await api.put<SalonFeatureAccessResponse>(
          `/api/feature-access/salons/${selectedSalonId}`,
          { features: payload },
        )
      ).data,
    onSuccess: (response) => {
      toast.success("Feature overrides saved");
      setDraft(
        Object.fromEntries(
          response.features.map((feature) => [
            feature.featureKey,
            {
              featureKey: feature.featureKey,
              featureName: feature.featureName,
              featureValue: feature.overrideFeatureValue ?? feature.effectiveFeatureValue ?? "",
              enabled: feature.overrideEnabled ?? feature.effectiveEnabled ?? true,
            },
          ]),
        ),
      );
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  const featureRows = featureAccessQuery.data?.features ?? [];

  const effectiveDraft = featureRows.map((feature) => {
    const override = draft[feature.featureKey];
    return {
      ...feature,
      editorValue: override?.featureValue ?? feature.overrideFeatureValue ?? feature.effectiveFeatureValue ?? "",
      editorEnabled: override?.enabled ?? feature.overrideEnabled ?? feature.effectiveEnabled ?? true,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Feature Overrides"
        title="Feature Access"
        description="Plan features, overrides, and effective access use the exact backend response model for salon feature management."
      />

      <FormSection title="Select salon">
        {salonsQuery.isLoading ? (
          <LoadingSpinner label="Loading salons..." />
        ) : salonsQuery.isError ? (
          <ErrorState title="Unable to load salons" description={parseApiError(salonsQuery.error)} />
        ) : (
          <SearchableSelect
            value={selectedSalonId}
            onValueChange={setSelectedSalonId}
            placeholder="Choose salon"
            searchPlaceholder="Search salon or owner"
            options={(salonsQuery.data ?? []).map(toSalonSelectOption)}
          />
        )}
      </FormSection>

      {featureAccessQuery.isLoading ? (
        <LoadingSpinner label="Loading feature access..." />
      ) : featureAccessQuery.isError ? (
        <ErrorState
          title="Unable to load feature access"
          description={parseApiError(featureAccessQuery.error)}
        />
      ) : featureAccessQuery.data ? (
        <FormSection
          title={`${featureAccessQuery.data.salonName} / ${featureAccessQuery.data.planName}`}
          description="Effective access is computed from plan features first, then salon-specific overrides."
        >
          <div className="space-y-4">
            {effectiveDraft.map((feature) => (
              <div
                key={feature.featureKey}
                className="rounded-3xl border border-border/70 bg-secondary/25 p-5"
              >
                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                  <div>
                    <p className="font-semibold">
                      {FEATURE_LABELS[feature.featureKey] ?? feature.featureName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Plan: {feature.planFeatureValue ?? "—"} / Override: {feature.overrideFeatureValue ?? "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${feature.featureKey}-value`}>Feature Value</Label>
                    <Input
                      id={`${feature.featureKey}-value`}
                      value={feature.editorValue}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [feature.featureKey]: {
                            featureKey: feature.featureKey,
                            featureName: feature.featureName,
                            featureValue: event.target.value,
                            enabled:
                              current[feature.featureKey]?.enabled ?? feature.editorEnabled,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4">
                    <Checkbox
                      checked={Boolean(feature.editorEnabled)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [feature.featureKey]: {
                            featureKey: feature.featureKey,
                            featureName: feature.featureName,
                            featureValue:
                              current[feature.featureKey]?.featureValue ??
                              feature.editorValue,
                            enabled: event.target.checked,
                          },
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">Enabled override</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button
              onClick={() =>
                updateMutation.mutate(
                  effectiveDraft.map((feature) => ({
                    featureKey: feature.featureKey,
                    featureName: feature.featureName,
                    featureValue: feature.editorValue,
                    enabled: feature.editorEnabled,
                  })),
                )
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save overrides"}
            </Button>
          </div>
        </FormSection>
      ) : null}
    </div>
  );
}
