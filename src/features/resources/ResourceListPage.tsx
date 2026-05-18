import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLookupResults } from "@/features/resources/resource-helpers";
import type { ResourceDefinition } from "@/features/resources/resource-types";

interface ResourceListPageProps<TRecord, TForm extends Record<string, unknown>> {
  resource: ResourceDefinition<TRecord, TForm>;
}

/**
 * Generic list screen that delegates backend list, activate, and deactivate
 * calls to the resource definition supplied for the current route.
 */
export function ResourceListPage<TRecord, TForm extends Record<string, unknown>>({
  resource,
}: ResourceListPageProps<TRecord, TForm>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  if (!user || !resource.roles.includes(user.role as never)) {
    return (
      <ErrorState
        title="Forbidden"
        description="This backend module is not available for your current role."
      />
    );
  }

  const lookupContext = {
    user,
    mode: "list" as const,
    values: {},
    filters,
  };

  const { helpers } = useLookupResults(resource.lookupDefinitions, lookupContext);
  const visibleFilters = resource.listFilters?.filter(
    (filter) => !(filter.hidden?.(lookupContext) ?? false),
  );

  // Every resource list is powered by the endpoint-specific listQuery defined
  // in the resource registry, which lets one screen serve many modules.
  const listQuery = useQuery({
    queryKey: [resource.key, "list", user.role, filters],
    queryFn: () => resource.listQuery(user, filters),
  });

  // Status-toggle actions are optional because not every backend resource
  // exposes activate/deactivate endpoints.
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!resource.activateMutation) {
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
    mutationFn: async (id: string) => {
      if (!resource.deactivateMutation) {
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

  const filteredData = useMemo(() => {
    const source = listQuery.data ?? [];
    // Search stays client-side so the same resource definition can work even
    // when the backend endpoint only supports coarse filters.
    return source.filter((record) => {
      const matchesSearch =
        search.trim().length === 0 ||
        resource
          .searchValues(record, helpers)
          .some((value) => value.toLowerCase().includes(search.toLowerCase()));

      const matchesFilters = resource.localFilter
        ? resource.localFilter(record, filters)
        : true;

      return matchesSearch && matchesFilters;
    });
  }, [filters, helpers, listQuery.data, resource, search]);

  const canView = Boolean(resource.detailPath);
  const canEdit =
    Boolean(resource.editPath) &&
    (!resource.editRoles || resource.editRoles.includes(user.role as never));
  const toggleRoles = resource.toggleRoles ?? resource.editRoles;
  const canToggle =
    Boolean(resource.toggleActive && resource.activateMutation && resource.deactivateMutation) &&
    (!toggleRoles || toggleRoles.includes(user.role as never));

  const renderActionButtons = (record: TRecord) => {
    const id = String((record as { id: string }).id);
    const toggle = resource.toggleActive;
    const isActive = toggle?.isActive(record);

    return (
      <>
        {resource.detailPath ? (
          <Button size="sm" variant="outline" asChild>
            <Link to={resource.detailPath(id)}>View</Link>
          </Button>
        ) : null}
        {canEdit && resource.editPath ? (
          <Button size="sm" variant="ghost" asChild>
            <Link to={resource.editPath(id)}>Edit</Link>
          </Button>
        ) : null}
        {canToggle && toggle && resource.activateMutation && resource.deactivateMutation ? (
          <ConfirmDialog
            title={`${isActive ? toggle.inactiveLabel : toggle.activeLabel} ${resource.singular}`}
            description={`This will ${isActive ? "change" : "restore"} the current backend status for this ${resource.singular.toLowerCase()}.`}
            actionLabel={isActive ? toggle.inactiveLabel : toggle.activeLabel}
            onConfirm={() =>
              isActive
                ? deactivateMutation.mutate(id)
                : activateMutation.mutate(id)
            }
            trigger={(
              <Button size="sm" variant="outline">
                {isActive ? toggle.inactiveLabel : toggle.activeLabel}
              </Button>
            )}
            destructive={Boolean(isActive)}
          />
        ) : null}
      </>
    );
  };

  const columns = useMemo(() => {
    const baseColumns = resource.columns(helpers).map((column) => ({
      id: column.id,
      header: column.header,
      cell: (record: TRecord) => column.cell(record, helpers),
      sortingValue: (record: TRecord) => column.sortingValue?.(record, helpers) ?? "",
    }));

    if (!canView && !canEdit && !canToggle) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        id: "actions",
        header: "Actions",
        cell: (record: TRecord) => {
          return (
            <div className="flex flex-wrap gap-2">
              {renderActionButtons(record)}
            </div>
          );
        },
      },
    ];
  }, [canEdit, canToggle, canView, helpers, resource, renderActionButtons]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resource Module"
        title={resource.title}
        description={resource.description}
        action={
          resource.createPath &&
          (!resource.createRoles || resource.createRoles.includes(user.role as never)) ? (
            <Button asChild>
              <Link to={resource.createPath}>
                <Plus className="h-4 w-4" />
                New {resource.singular}
              </Link>
            </Button>
          ) : null
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={resource.searchPlaceholder ?? `Search ${resource.title.toLowerCase()}`}
      filters={
          visibleFilters?.length ? (
            <div className="grid w-full gap-3 sm:grid-cols-2 xl:flex">
              {visibleFilters.map((filter) => (
                <div key={filter.name} className="min-w-[180px]">
                  {filter.type === "date" ? (
                    <input
                      type="date"
                      value={filters[filter.name] ?? ""}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          [filter.name]: event.target.value,
                        }))
                      }
                      className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  ) : (
                    (() => {
                      const options = filter.lookupKey
                        ? helpers.lookupOptions(filter.lookupKey)
                        : filter.options ?? [];
                      const isSearchable = filter.searchable ?? filter.lookupKey === "salons";

                      // Lookup-backed filters reuse the same shared lookup
                      // definitions as the resource forms and details.
                      if (isSearchable) {
                        return (
                          <SearchableSelect
                            value={filters[filter.name] ?? ""}
                            onValueChange={(nextValue) =>
                              setFilters((current) => ({
                                ...current,
                                [filter.name]: nextValue,
                              }))
                            }
                            placeholder={filter.label}
                            searchPlaceholder={`Search ${filter.label.toLowerCase()}`}
                            options={options}
                          />
                        );
                      }

                      return (
                        <Select
                          value={filters[filter.name] ?? ""}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              [filter.name]: event.target.value,
                            }))
                          }
                          placeholder={filter.label}
                          options={options}
                        />
                      );
                    })()
                  )}
                </div>
              ))}
            </div>
          ) : undefined
        }
      />

      {listQuery.isError ? (
        <ErrorState
          title={`Unable to load ${resource.title.toLowerCase()}`}
          description={parseApiError(listQuery.error)}
        />
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          loading={listQuery.isLoading}
          emptyTitle={`No ${resource.title.toLowerCase()} yet`}
          emptyDescription={`Create your first ${resource.singular.toLowerCase()} or adjust the current filters.`}
          mobileCard={(record) => resource.mobileCard(record, helpers)}
          mobileActions={
            canView || canEdit || canToggle
              ? (record) => (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-panel">
                    {renderActionButtons(record)}
                  </div>
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
