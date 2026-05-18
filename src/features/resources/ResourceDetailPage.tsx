import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { FormSection } from "@/components/common/FormSection";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { parseApiError } from "@/lib/api";
import { useLookupResults } from "@/features/resources/resource-helpers";
import type { ResourceDefinition } from "@/features/resources/resource-types";

interface ResourceDetailPageProps<TRecord, TForm extends Record<string, unknown>> {
  resource: ResourceDefinition<TRecord, TForm>;
}

/**
 * Generic read-only resource detail screen backed by the get-by-id endpoint
 * defined in the resource registry.
 */
export function ResourceDetailPage<TRecord, TForm extends Record<string, unknown>>({
  resource,
}: ResourceDetailPageProps<TRecord, TForm>) {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (!user || !resource.roles.includes(user.role as never)) {
    return (
      <ErrorState
        title="Forbidden"
        description="This backend module is not available for your current role."
      />
    );
  }

  const recordQuery = useQuery({
    queryKey: [resource.key, "detail", id],
    queryFn: async () => {
      if (!id || !resource.getQuery) {
        throw new Error("This record cannot be loaded individually from the backend.");
      }
      // The detail page always reads through the resource definition so custom
      // field formatting can stay decoupled from transport details.
      return resource.getQuery(id, user);
    },
    enabled: Boolean(id && resource.getQuery),
  });

  const { helpers } = useLookupResults(resource.lookupDefinitions, {
    user,
    mode: "detail",
    values: {},
    filters: {},
  });

  const record = recordQuery.data as TRecord | undefined;

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!id || !resource.activateMutation) {
        throw new Error("Activate operation is not supported.");
      }
      return resource.activateMutation(id);
    },
    onSuccess: () => {
      toast.success(`${resource.singular} updated`);
      void queryClient.invalidateQueries({ queryKey: [resource.key] });
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!id || !resource.deactivateMutation) {
        throw new Error("Deactivate operation is not supported.");
      }
      return resource.deactivateMutation(id);
    },
    onSuccess: () => {
      toast.success(`${resource.singular} updated`);
      void queryClient.invalidateQueries({ queryKey: [resource.key] });
    },
    onError: (error) => toast.error(parseApiError(error)),
  });

  if (recordQuery.isLoading) {
    return <LoadingSpinner label={`Loading ${resource.singular.toLowerCase()}...`} />;
  }

  if (recordQuery.isError || !record) {
    return (
      <ErrorState
        title={`Unable to load ${resource.singular.toLowerCase()}`}
        description={parseApiError(recordQuery.error)}
      />
    );
  }

  const canEdit =
    Boolean(resource.editPath) &&
    (!resource.editRoles || resource.editRoles.includes(user.role as never));
  const toggleRoles = resource.toggleRoles ?? resource.editRoles;
  const canToggle =
    Boolean(resource.toggleActive && resource.activateMutation && resource.deactivateMutation) &&
    (!toggleRoles || toggleRoles.includes(user.role as never));
  const toggle = resource.toggleActive;
  const isActive = toggle?.isActive(record);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resource Detail"
        title={resource.singular}
        description="Read-only backend response view with typed field formatting."
        action={canEdit || canToggle ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            {canEdit && resource.editPath ? (
              <Button asChild>
                <Link to={resource.editPath(String(((record as unknown) as { id: string }).id))}>
                  Edit
                </Link>
              </Button>
            ) : null}
            {canToggle && toggle ? (
              <ConfirmDialog
                title={`${isActive ? toggle.inactiveLabel : toggle.activeLabel} ${resource.singular}`}
                description={`This will ${isActive ? "change" : "restore"} the current backend status for this ${resource.singular.toLowerCase()}.`}
                actionLabel={isActive ? toggle.inactiveLabel : toggle.activeLabel}
                onConfirm={() =>
                  isActive
                    ? deactivateMutation.mutate()
                    : activateMutation.mutate()
                }
                trigger={(
                  <Button variant="outline">
                    {isActive ? toggle.inactiveLabel : toggle.activeLabel}
                  </Button>
                )}
                destructive={Boolean(isActive)}
              />
            ) : null}
          </div>
        ) : null}
      />

      <FormSection title={`${resource.singular} information`}>
        <div className="grid gap-5 md:grid-cols-2">
          {resource.detailFields(helpers).map((field) => (
            <div key={field.label} className="rounded-2xl border border-border/80 bg-secondary/25 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {field.label}
              </p>
              <div className="mt-3 text-sm font-medium text-foreground">
                {field.value(record, helpers)}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      {resource.detailExtra ? resource.detailExtra(record, helpers, user) : null}
    </div>
  );
}
