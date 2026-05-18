import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { logValidationFailure } from "@/lib/form-logging";
import { logger, summarizeError } from "@/lib/logger";
import { useLookupResults } from "@/features/resources/resource-helpers";
import type { ResourceDefinition } from "@/features/resources/resource-types";

interface ResourceFormPageProps<TRecord, TForm extends Record<string, unknown>> {
  resource: ResourceDefinition<TRecord, TForm>;
  mode: "create" | "edit";
}

/**
 * Generic create/edit screen that converts a resource definition into the
 * correct backend get, create, and update calls.
 */
export function ResourceFormPage<TRecord, TForm extends Record<string, unknown>>({
  resource,
  mode,
}: ResourceFormPageProps<TRecord, TForm>) {
  const formName = `${resource.key}-${mode}`;
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (!user) {
    return <LoadingSpinner />;
  }

  const allowedRoles = mode === "create" ? resource.createRoles ?? resource.roles : resource.editRoles ?? resource.roles;
  if (!allowedRoles.includes(user.role as never)) {
    return (
      <ErrorState
        title="Forbidden"
        description="Your role does not have access to this write operation."
      />
    );
  }

  const recordQuery = useQuery({
    queryKey: [resource.key, "detail", id],
    queryFn: async () => {
      if (!id || !resource.getQuery) {
        throw new Error("Record could not be loaded from the backend.");
      }
      // Edit mode always rehydrates from the backend so the form mirrors the
      // latest persisted DTO values before any mutation is submitted.
      return resource.getQuery(id, user);
    },
    enabled: mode === "edit" && Boolean(id) && Boolean(resource.getQuery),
  });

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(resource.schema(mode) as never) as never,
    defaultValues: resource.defaultValues(user) as never,
  });
  const previousValuesRef = useRef<Record<string, unknown>>({});
  const skipDependentResetRef = useRef(true);
  const queryPrefillAppliedRef = useRef(false);

  useEffect(() => {
    if (recordQuery.data && resource.toFormValues) {
      const nextValues = resource.toFormValues(recordQuery.data, user) as Record<string, unknown>;
      logger.debug("forms", "resource_record_loaded", {
        formName,
        recordId: id,
      });
      previousValuesRef.current = { ...nextValues };
      skipDependentResetRef.current = true;
      form.reset(nextValues);
    }
  }, [form, formName, id, recordQuery.data, resource, user]);

  useEffect(() => {
    if (mode !== "create" || queryPrefillAppliedRef.current) {
      return;
    }

    // Some create flows arrive with query-string hints from another page, such
    // as opening "new invoice" from a visit or queue record.
    const nextValues = resource.defaultValues(user) as Record<string, unknown>;
    let changed = false;

    searchParams.forEach((value, key) => {
      if (!(key in nextValues)) {
        return;
      }

      const currentValue = nextValues[key];
      if (
        typeof currentValue === "string"
        || currentValue === undefined
        || currentValue === null
      ) {
        nextValues[key] = value;
        changed = true;
      }
    });

    if (changed) {
      previousValuesRef.current = { ...nextValues };
      skipDependentResetRef.current = true;
      form.reset(nextValues);
    }

    queryPrefillAppliedRef.current = true;
  }, [form, mode, resource, searchParams, user]);

  const values = form.watch();

  useEffect(() => {
    const currentValues = values as Record<string, unknown>;
    if (skipDependentResetRef.current) {
      previousValuesRef.current = { ...currentValues };
      skipDependentResetRef.current = false;
      return;
    }

    for (const field of resource.fields) {
      if (!field.resetOnChange?.length) {
        continue;
      }

      const previousValue = previousValuesRef.current[field.name];
      const currentValue = currentValues[field.name];
      if (previousValue === currentValue) {
        continue;
      }

      for (const targetField of field.resetOnChange) {
        const targetValue = currentValues[targetField];
        if (targetField === field.name || targetValue === undefined || targetValue === "") {
          continue;
        }
        // Dependent lookup fields are reset whenever their upstream selector
        // changes so stale backend IDs never leak into a submission.
        form.setValue(targetField as never, "" as never, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        logger.debug("forms", "dependent_field_reset", {
          formName,
          changedField: field.name,
          resetField: targetField,
        });
      }
    }

    previousValuesRef.current = { ...currentValues };
  }, [form, resource.fields, values]);

  const { helpers } = useLookupResults(resource.lookupDefinitions, {
    user,
    mode,
    values,
    filters: {},
  });

  // The mutation function switches between create and update endpoints, but the
  // surrounding success/error handling stays generic across resource modules.
  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (mode === "create") {
        if (!resource.createMutation) {
          throw new Error("Create operation is not supported by the backend.");
        }
        return resource.createMutation(payload, user);
      }

      if (!id || !resource.updateMutation) {
        throw new Error("Update operation is not supported by the backend.");
      }

      return resource.updateMutation(id, payload, user);
    },
    onSuccess: (savedRecord) => {
      const savedId = String((savedRecord as { id: string }).id);
      logger.info("forms", "resource_submission_succeeded", {
        formName,
        recordId: savedId,
      });
      toast.success(`${resource.singular} saved successfully`);
      void queryClient.invalidateQueries({ queryKey: [resource.key] });
      resource.extraInvalidateKeys?.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      navigate(resource.detailPath?.(savedId) ?? resource.listPath);
    },
    onError: (error) => {
      logger.error("forms", "resource_submission_failed", {
        formName,
        recordId: id,
        error: summarizeError(error),
      });
      toast.error(parseApiError(error));
    },
  });

  const onSubmit = (formValues: Record<string, unknown>) => {
    logger.info("forms", "resource_submission_started", {
      formName,
      recordId: id,
      fieldCount: Object.keys(formValues).length,
    });
    // Resource definitions own the DTO mapping so the generic page can stay
    // focused on form orchestration instead of payload specifics.
    saveMutation.mutate(resource.toPayload(formValues as TForm, user));
  };

  const errorEntries = form.formState.errors as Record<string, { message?: string }>;

  if (mode === "edit" && recordQuery.isLoading) {
    return <LoadingSpinner label={`Loading ${resource.singular.toLowerCase()}...`} />;
  }

  if (mode === "edit" && recordQuery.isError) {
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
        eyebrow="Resource Form"
        title={mode === "create" ? `New ${resource.singular}` : `Edit ${resource.singular}`}
        description={resource.description}
      />

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          logValidationFailure(formName, errors as Record<string, never>),
        )}
      >
        <FormSection
          title={`${resource.singular} details`}
          description="This form maps directly to the backend DTO field names and validations."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {resource.fields.map((field) => {
              const hidden = field.hidden?.({ user, mode, values }) ?? false;
              if (hidden) {
                return null;
              }

              const options = field.lookupKey
                ? helpers.lookupOptions(field.lookupKey)
                : field.options ?? [];
              const isSearchable = field.searchable ?? field.lookupKey === "salons";

              const registerOptions =
                field.type === "number" || field.type === "currency"
                  ? {
                      setValueAs: (value: string) =>
                        value === "" ? undefined : Number(value),
                    }
                  : undefined;

              // Each field definition decides how the generic screen renders it,
              // whether from static options or backend-fed lookups.
              return (
                <div
                  key={field.name}
                  className={field.gridSpan === 2 ? "md:col-span-2" : undefined}
                >
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.name}
                        placeholder={field.placeholder}
                        disabled={field.disabled?.({ user, mode, values })}
                        {...form.register(field.name as never)}
                      />
                    ) : field.type === "checkbox" ? (
                      <div className="flex h-11 items-center rounded-2xl border border-input bg-white px-4">
                        <Checkbox
                          id={field.name}
                          checked={Boolean(form.watch(field.name as never))}
                          onChange={(event) =>
                            form.setValue(field.name as never, event.target.checked as never)
                          }
                        />
                        <span className="ml-3 text-sm text-muted-foreground">
                          Toggle {field.label.toLowerCase()}
                        </span>
                      </div>
                    ) : field.type === "select" && isSearchable ? (
                      <SearchableSelect
                        id={field.name}
                        value={String(form.watch(field.name as never) ?? "")}
                        options={options}
                        placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
                        searchPlaceholder={`Search ${field.label.toLowerCase()}`}
                        disabled={field.disabled?.({ user, mode, values })}
                        onValueChange={(nextValue) =>
                          form.setValue(field.name as never, nextValue as never, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                      />
                    ) : field.type === "select" ? (
                      <Select
                        id={field.name}
                        options={options}
                        placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
                        disabled={field.disabled?.({ user, mode, values })}
                        {...form.register(field.name as never)}
                      />
                    ) : (
                      <Input
                        id={field.name}
                        type={
                          field.type === "currency" || field.type === "number"
                            ? "number"
                            : field.type
                        }
                        step={field.type === "currency" ? "0.01" : "1"}
                        placeholder={field.placeholder}
                        disabled={field.disabled?.({ user, mode, values })}
                        {...form.register(field.name as never, registerOptions)}
                      />
                    )}
                    {field.description ? (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    ) : null}
                    <p className="text-xs text-destructive">{errorEntries[field.name]?.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" asChild>
            <Link to={resource.listPath}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
