import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

export function ResourceDetailPage<TRecord, TForm extends Record<string, unknown>>({
  resource,
}: ResourceDetailPageProps<TRecord, TForm>) {
  const { id } = useParams();
  const { user } = useAuth();

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resource Detail"
        title={resource.singular}
        description="Read-only backend response view with typed field formatting."
        action={
          resource.editPath &&
          (!resource.editRoles || resource.editRoles.includes(user.role as never)) ? (
            <Button asChild>
              <Link to={resource.editPath(String(((record as unknown) as { id: string }).id))}>
                Edit
              </Link>
            </Button>
          ) : null
        }
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
