import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Pencil,
  Plus,
  Scissors,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthProvider";
import { api, parseApiError } from "@/lib/api";
import { cn, formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import type {
  ServiceCategoryRequest,
  ServiceCategoryResponse,
  ServiceRequest,
  ServiceResponse,
} from "@/types/api";

const categoryQueryKey = ["owner-service-catalog", "categories"] as const;
const serviceQueryKey = ["owner-service-catalog", "services"] as const;

interface CategoryFormValues {
  name: string;
  description: string;
  displayOrder: string;
  active: boolean;
}

interface ServiceFormValues {
  serviceCategoryId: string;
  createCategoryInline: boolean;
  newCategoryName: string;
  newCategoryDescription: string;
  newCategoryDisplayOrder: string;
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  active: boolean;
}

interface CategoryDialogState {
  open: boolean;
  mode: "create" | "edit";
  recordId: string | null;
}

interface ServiceDialogState {
  open: boolean;
  mode: "create" | "edit";
  recordId: string | null;
}

function defaultCategoryFormValues(category?: ServiceCategoryResponse | null): CategoryFormValues {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    displayOrder: category?.displayOrder != null ? String(category.displayOrder) : "",
    active: category?.active ?? true,
  };
}

function defaultServiceFormValues(
  options: {
    service?: ServiceResponse | null;
    categoryId?: string;
    forceInlineCategory?: boolean;
  } = {},
): ServiceFormValues {
  const { service, categoryId, forceInlineCategory = false } = options;

  return {
    serviceCategoryId: service?.serviceCategoryId ?? categoryId ?? "",
    createCategoryInline: forceInlineCategory,
    newCategoryName: "",
    newCategoryDescription: "",
    newCategoryDisplayOrder: "",
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: service?.price != null ? String(service.price) : "",
    durationMinutes: service?.durationMinutes != null ? String(service.durationMinutes) : "",
    active: service?.active ?? true,
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeOptionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? Number(trimmed) : undefined;
}

function createSearchText(parts: Array<string | number | null | undefined>) {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .join(" ")
    .toLowerCase();
}

function sortCategories(categories: ServiceCategoryResponse[]) {
  return [...categories].sort((left, right) => {
    const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

function sortServices(services: ServiceResponse[]) {
  return [...services].sort((left, right) => left.name.localeCompare(right.name));
}

export function OwnerServiceCatalogPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});

  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({
    open: false,
    mode: "create",
    recordId: null,
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormValues>(defaultCategoryFormValues());
  const [categoryErrors, setCategoryErrors] = useState<Partial<Record<keyof CategoryFormValues, string>>>({});

  const [serviceDialog, setServiceDialog] = useState<ServiceDialogState>({
    open: false,
    mode: "create",
    recordId: null,
  });
  const [serviceForm, setServiceForm] = useState<ServiceFormValues>(defaultServiceFormValues());
  const [serviceErrors, setServiceErrors] = useState<Partial<Record<keyof ServiceFormValues, string>>>({});

  const categoriesQuery = useQuery({
    queryKey: categoryQueryKey,
    queryFn: async () => (await api.get<ServiceCategoryResponse[]>("/api/services/categories")).data,
  });

  const servicesQuery = useQuery({
    queryKey: serviceQueryKey,
    queryFn: async () => (await api.get<ServiceResponse[]>("/api/services")).data,
  });

  const categories = useMemo(
    () => sortCategories(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const services = useMemo(
    () => sortServices(servicesQuery.data ?? []),
    [servicesQuery.data],
  );

  const servicesByCategoryId = useMemo(() => {
    const grouped: Record<string, ServiceResponse[]> = {};
    for (const service of services) {
      if (!grouped[service.serviceCategoryId]) {
        grouped[service.serviceCategoryId] = [];
      }
      grouped[service.serviceCategoryId]?.push(service);
    }
    for (const categoryId of Object.keys(grouped)) {
      grouped[categoryId] = sortServices(grouped[categoryId] ?? []);
    }
    return grouped;
  }, [services]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }

    setExpandedCategoryIds((current) => {
      const next = { ...current };
      for (const category of categories) {
        if (next[category.id] === undefined) {
          next[category.id] = true;
        }
      }
      return next;
    });
  }, [categories]);

  const filteredCatalog = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories
      .map((category) => {
        const categoryServices = servicesByCategoryId[category.id] ?? [];

        if (!normalizedSearch) {
          return {
            category,
            totalServices: categoryServices.length,
            visibleServices: categoryServices,
          };
        }

        const categoryMatches = createSearchText([
          category.name,
          category.description,
          category.displayOrder,
          category.active ? "active" : "inactive",
        ]).includes(normalizedSearch);

        const matchingServices = categoryServices.filter((service) =>
          createSearchText([
            service.name,
            service.description,
            formatCurrency(service.price),
            service.durationMinutes,
            service.active ? "active" : "inactive",
          ]).includes(normalizedSearch),
        );

        if (categoryMatches) {
          return {
            category,
            totalServices: categoryServices.length,
            visibleServices: categoryServices,
          };
        }

        if (matchingServices.length) {
          return {
            category,
            totalServices: categoryServices.length,
            visibleServices: matchingServices,
          };
        }

        return null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [categories, search, servicesByCategoryId]);

  const totalServices = services.length;
  const activeServices = services.filter((service) => service.active).length;
  const inactiveServices = totalServices - activeServices;

  const invalidateCatalogQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryQueryKey }),
      queryClient.invalidateQueries({ queryKey: serviceQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["service-categories"] }),
      queryClient.invalidateQueries({ queryKey: ["services"] }),
      queryClient.invalidateQueries({ queryKey: ["lookup", "service-categories"] }),
      queryClient.invalidateQueries({ queryKey: ["lookup", "services"] }),
    ]);
  };

  const categorySaveMutation = useMutation({
    mutationFn: async ({
      mode,
      recordId,
      payload,
    }: {
      mode: "create" | "edit";
      recordId: string | null;
      payload: ServiceCategoryRequest;
    }) => {
      if (mode === "create") {
        return (await api.post<ServiceCategoryResponse>("/api/services/categories", payload)).data;
      }

      if (!recordId) {
        throw new Error("Category id is missing.");
      }

      return (
        await api.put<ServiceCategoryResponse>(`/api/services/categories/${recordId}`, payload)
      ).data;
    },
    onSuccess: async () => {
      await invalidateCatalogQueries();
      toast.success(
        categoryDialog.mode === "create" ? "Category created" : "Category updated",
      );
      setCategoryDialog({ open: false, mode: "create", recordId: null });
      setCategoryForm(defaultCategoryFormValues());
      setCategoryErrors({});
    },
    onError: (error) => {
      toast.error(parseApiError(error));
    },
  });

  const categoryToggleMutation = useMutation({
    mutationFn: async ({
      recordId,
      active,
    }: {
      recordId: string;
      active: boolean;
    }) =>
      (
        await api.patch<ServiceCategoryResponse>(
          `/api/services/categories/${recordId}/${active ? "activate" : "deactivate"}`,
        )
      ).data,
    onSuccess: async (_, variables) => {
      await invalidateCatalogQueries();
      toast.success(variables.active ? "Category activated" : "Category deactivated");
    },
    onError: (error) => {
      toast.error(parseApiError(error));
    },
  });

  const serviceSaveMutation = useMutation({
    mutationFn: async ({
      mode,
      recordId,
      payload,
      newCategoryPayload,
    }: {
      mode: "create" | "edit";
      recordId: string | null;
      payload: ServiceRequest;
      newCategoryPayload?: ServiceCategoryRequest;
    }) => {
      let serviceCategoryId = payload.serviceCategoryId;

      if (newCategoryPayload) {
        const createdCategory = (
          await api.post<ServiceCategoryResponse>("/api/services/categories", newCategoryPayload)
        ).data;
        serviceCategoryId = createdCategory.id;
      }

      const nextPayload: ServiceRequest = {
        ...payload,
        serviceCategoryId,
      };

      if (mode === "create") {
        return (await api.post<ServiceResponse>("/api/services", nextPayload)).data;
      }

      if (!recordId) {
        throw new Error("Service id is missing.");
      }

      return (await api.put<ServiceResponse>(`/api/services/${recordId}`, nextPayload)).data;
    },
    onSuccess: async () => {
      await invalidateCatalogQueries();
      toast.success(serviceDialog.mode === "create" ? "Service created" : "Service updated");
      setServiceDialog({ open: false, mode: "create", recordId: null });
      setServiceForm(defaultServiceFormValues());
      setServiceErrors({});
    },
    onError: (error) => {
      toast.error(parseApiError(error));
    },
  });

  const serviceToggleMutation = useMutation({
    mutationFn: async ({
      recordId,
      active,
    }: {
      recordId: string;
      active: boolean;
    }) =>
      (
        await api.patch<ServiceResponse>(
          `/api/services/${recordId}/${active ? "activate" : "deactivate"}`,
        )
      ).data,
    onSuccess: async (_, variables) => {
      await invalidateCatalogQueries();
      toast.success(variables.active ? "Service activated" : "Service deactivated");
    },
    onError: (error) => {
      toast.error(parseApiError(error));
    },
  });

  const openCreateCategoryDialog = () => {
    setCategoryDialog({ open: true, mode: "create", recordId: null });
    setCategoryForm(defaultCategoryFormValues());
    setCategoryErrors({});
  };

  const openEditCategoryDialog = (category: ServiceCategoryResponse) => {
    setCategoryDialog({ open: true, mode: "edit", recordId: category.id });
    setCategoryForm(defaultCategoryFormValues(category));
    setCategoryErrors({});
  };

  const openCreateServiceDialog = (categoryId?: string) => {
    const forceInlineCategory = categories.length === 0;
    setServiceDialog({ open: true, mode: "create", recordId: null });
    setServiceForm(
      defaultServiceFormValues({
        categoryId,
        forceInlineCategory,
      }),
    );
    setServiceErrors({});
  };

  const openEditServiceDialog = (service: ServiceResponse) => {
    setServiceDialog({ open: true, mode: "edit", recordId: service.id });
    setServiceForm(
      defaultServiceFormValues({
        service,
        forceInlineCategory: false,
      }),
    );
    setServiceErrors({});
  };

  const validateCategoryForm = () => {
    const errors: Partial<Record<keyof CategoryFormValues, string>> = {};

    if (!categoryForm.name.trim()) {
      errors.name = "Category name is required.";
    }

    if (categoryForm.displayOrder.trim()) {
      const displayOrder = Number(categoryForm.displayOrder);
      if (Number.isNaN(displayOrder)) {
        errors.displayOrder = "Display order must be a number.";
      }
    }

    setCategoryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateServiceForm = () => {
    const errors: Partial<Record<keyof ServiceFormValues, string>> = {};

    if (!serviceForm.name.trim()) {
      errors.name = "Service name is required.";
    }

    if (serviceForm.createCategoryInline) {
      if (!serviceForm.newCategoryName.trim()) {
        errors.newCategoryName = "Category name is required when creating inline.";
      }
      if (serviceForm.newCategoryDisplayOrder.trim()) {
        const displayOrder = Number(serviceForm.newCategoryDisplayOrder);
        if (Number.isNaN(displayOrder)) {
          errors.newCategoryDisplayOrder = "Display order must be a number.";
        }
      }
    } else if (!serviceForm.serviceCategoryId) {
      errors.serviceCategoryId = "Pick a category for this service.";
    }

    if (!serviceForm.price.trim()) {
      errors.price = "Price is required.";
    } else if (Number.isNaN(Number(serviceForm.price)) || Number(serviceForm.price) < 0) {
      errors.price = "Price must be zero or more.";
    }

    if (!serviceForm.durationMinutes.trim()) {
      errors.durationMinutes = "Duration is required.";
    } else if (
      Number.isNaN(Number(serviceForm.durationMinutes)) ||
      Number(serviceForm.durationMinutes) < 0
    ) {
      errors.durationMinutes = "Duration must be zero or more.";
    }

    setServiceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCategorySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCategoryForm()) {
      return;
    }

    categorySaveMutation.mutate({
      mode: categoryDialog.mode,
      recordId: categoryDialog.recordId,
      payload: {
        name: categoryForm.name.trim(),
        description: normalizeOptionalText(categoryForm.description),
        displayOrder: normalizeOptionalNumber(categoryForm.displayOrder),
        active: categoryForm.active,
      },
    });
  };

  const handleServiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateServiceForm()) {
      return;
    }

    const newCategoryPayload = serviceForm.createCategoryInline
      ? {
          name: serviceForm.newCategoryName.trim(),
          description: normalizeOptionalText(serviceForm.newCategoryDescription),
          displayOrder: normalizeOptionalNumber(serviceForm.newCategoryDisplayOrder),
          active: true,
        }
      : undefined;

    serviceSaveMutation.mutate({
      mode: serviceDialog.mode,
      recordId: serviceDialog.recordId,
      payload: {
        serviceCategoryId: serviceForm.serviceCategoryId,
        name: serviceForm.name.trim(),
        description: normalizeOptionalText(serviceForm.description),
        price: Number(serviceForm.price),
        durationMinutes: Number(serviceForm.durationMinutes),
        active: serviceForm.active,
      },
      newCategoryPayload,
    });
  };

  if (!user || user.role !== "SALON_OWNER") {
    return (
      <ErrorState
        title="Catalog unavailable"
        description="This simplified service catalog is available only in the salon owner workspace."
      />
    );
  }

  if (categoriesQuery.isLoading || servicesQuery.isLoading) {
    return <LoadingSpinner label="Loading your service catalog..." />;
  }

  if (categoriesQuery.isError || servicesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load service catalog"
        description={parseApiError(categoriesQuery.error ?? servicesQuery.error)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Workspace"
        title="Service Catalog"
        description="Manage categories and services together so your team can set up bookings, billing, and pricing without bouncing between separate screens."
        action={(
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={openCreateCategoryDialog}>
              <FolderPlus className="h-4 w-4" />
              New Category
            </Button>
            <Button onClick={() => openCreateServiceDialog()}>
              <Plus className="h-4 w-4" />
              New Service
            </Button>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Categories</CardDescription>
            <CardTitle>{formatNumber(categories.length)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Group services the way your front desk naturally thinks about them.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Services</CardDescription>
            <CardTitle>{formatNumber(activeServices)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These services are available for booking and billing right now.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Inactive Services</CardDescription>
            <CardTitle>{formatNumber(inactiveServices)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keep old services for history without showing them to staff as active options.
            </p>
          </CardContent>
        </Card>
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search categories or services"
        action={(
          <Badge variant="outline" className="self-start lg:self-center">
            {formatNumber(totalServices)} total services
          </Badge>
        )}
      />

      {!categories.length ? (
        <EmptyState
          title="Start your catalog in one place"
          description="Create a service directly, or add a category first if you already know how you want to group your treatments."
          actionLabel="Create first service"
          onAction={() => openCreateServiceDialog()}
        />
      ) : !filteredCatalog.length ? (
        <EmptyState
          title="No matching services"
          description="Try a different search term or clear the filter to see the full catalog again."
        />
      ) : (
        <div className="space-y-4">
          {filteredCatalog.map(({ category, totalServices, visibleServices }) => {
            const isExpanded = search.trim().length > 0 || expandedCategoryIds[category.id] !== false;
            const visibleCountLabel =
              visibleServices.length === totalServices
                ? `${formatNumber(totalServices)} services`
                : `${formatNumber(visibleServices.length)} of ${formatNumber(totalServices)} services`;

            return (
              <Card
                key={category.id}
                className={cn(
                  "overflow-hidden",
                  !category.active && "border-dashed border-border/90 bg-secondary/20",
                )}
              >
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategoryIds((current) => ({
                              ...current,
                              [category.id]: !(current[category.id] ?? true),
                            }))
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                          aria-label={isExpanded ? "Collapse category" : "Expand category"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <CardTitle className="text-xl">{category.name}</CardTitle>
                        <StatusBadge status={category.active ? "ACTIVE" : "INACTIVE"} />
                        <Badge variant="outline">{visibleCountLabel}</Badge>
                        {category.displayOrder != null ? (
                          <Badge variant="info">Order {category.displayOrder}</Badge>
                        ) : null}
                      </div>
                      <CardDescription>
                        {category.description?.trim().length
                          ? category.description
                          : "Use this category to keep related services together for your team."}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openCreateServiceDialog(category.id)}>
                        <Plus className="h-4 w-4" />
                        Add Service
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditCategoryDialog(category)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <ConfirmDialog
                        title={`${category.active ? "Deactivate" : "Activate"} ${category.name}`}
                        description={
                          category.active
                            ? "This category will stay in history, but you can mark it inactive so owners know it is not part of the active setup."
                            : "This will bring the category back into the active catalog."
                        }
                        actionLabel={category.active ? "Deactivate" : "Activate"}
                        onConfirm={() =>
                          categoryToggleMutation.mutate({
                            recordId: category.id,
                            active: !category.active,
                          })
                        }
                        trigger={(
                          <Button size="sm" variant="ghost">
                            {category.active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                        destructive={category.active}
                      />
                    </div>
                  </div>
                </CardHeader>

                {isExpanded ? (
                  <CardContent className="space-y-3">
                    {visibleServices.length ? (
                      visibleServices.map((service) => (
                        <div
                          key={service.id}
                          className="rounded-2xl border border-border/70 bg-white/90 p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-foreground">{service.name}</h4>
                                <StatusBadge status={service.active ? "ACTIVE" : "INACTIVE"} />
                              </div>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {service.description?.trim().length
                                  ? service.description
                                  : "No description added yet."}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline">{formatCurrency(service.price)}</Badge>
                                <Badge variant="outline">{service.durationMinutes} mins</Badge>
                                <span>Updated {formatDateTime(service.updatedAt)}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditServiceDialog(service)}
                              >
                                <Scissors className="h-4 w-4" />
                                Edit
                              </Button>
                              <ConfirmDialog
                                title={`${service.active ? "Deactivate" : "Activate"} ${service.name}`}
                                description={
                                  service.active
                                    ? "This service will stay in your records, but staff will understand it is not active right now."
                                    : "This will restore the service to the active catalog."
                                }
                                actionLabel={service.active ? "Deactivate" : "Activate"}
                                onConfirm={() =>
                                  serviceToggleMutation.mutate({
                                    recordId: service.id,
                                    active: !service.active,
                                  })
                                }
                                trigger={(
                                  <Button size="sm" variant="ghost">
                                    {service.active ? "Deactivate" : "Activate"}
                                  </Button>
                                )}
                                destructive={service.active}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-sm text-muted-foreground">
                        No services are in this category yet. Add one here so your team can start booking and billing it.
                      </div>
                    )}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={categoryDialog.open}
        onOpenChange={(open) => {
          setCategoryDialog((current) => ({ ...current, open }));
          if (!open) {
            setCategoryErrors({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.mode === "create" ? "Create category" : "Edit category"}
            </DialogTitle>
            <DialogDescription>
              Keep the owner flow simple by grouping similar services in one place before your team starts booking them.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleCategorySubmit}>
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Hair, Nails, Skin Care"
              />
              {categoryErrors.name ? (
                <p className="text-xs text-destructive">{categoryErrors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional notes for the team"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="category-order">Display order</Label>
                <Input
                  id="category-order"
                  type="number"
                  step="1"
                  value={categoryForm.displayOrder}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      displayOrder: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
                {categoryErrors.displayOrder ? (
                  <p className="text-xs text-destructive">{categoryErrors.displayOrder}</p>
                ) : null}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-input bg-white px-4 py-3 text-sm">
                <Checkbox
                  checked={categoryForm.active}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                Active category
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryDialog({ open: false, mode: "create", recordId: null })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={categorySaveMutation.isPending}>
                {categorySaveMutation.isPending
                  ? "Saving..."
                  : categoryDialog.mode === "create"
                    ? "Create Category"
                    : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={serviceDialog.open}
        onOpenChange={(open) => {
          setServiceDialog((current) => ({ ...current, open }));
          if (!open) {
            setServiceErrors({});
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {serviceDialog.mode === "create" ? "Create service" : "Edit service"}
            </DialogTitle>
            <DialogDescription>
              Add the actual services your front desk books and bills. You can create a fresh category inline if you need one on the spot.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleServiceSubmit}>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Category placement</p>
                <p className="text-xs text-muted-foreground">
                  Choose an existing category or create one inline while adding the service.
                </p>
              </div>
              {serviceDialog.mode === "create" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setServiceForm((current) => ({
                      ...current,
                      createCategoryInline: !current.createCategoryInline,
                      serviceCategoryId: current.createCategoryInline
                        ? current.serviceCategoryId
                        : "",
                    }))
                  }
                >
                  <Sparkles className="h-4 w-4" />
                  {serviceForm.createCategoryInline
                    ? "Use Existing Category"
                    : "Create Category Inline"}
                </Button>
              ) : null}
            </div>

            {serviceForm.createCategoryInline ? (
              <div className="grid gap-5 rounded-2xl border border-dashed border-border p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inline-category-name">New category name</Label>
                  <Input
                    id="inline-category-name"
                    value={serviceForm.newCategoryName}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        newCategoryName: event.target.value,
                      }))
                    }
                    placeholder="Hair, Bridal, Grooming"
                  />
                  {serviceErrors.newCategoryName ? (
                    <p className="text-xs text-destructive">{serviceErrors.newCategoryName}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inline-category-order">Display order</Label>
                  <Input
                    id="inline-category-order"
                    type="number"
                    step="1"
                    value={serviceForm.newCategoryDisplayOrder}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        newCategoryDisplayOrder: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                  {serviceErrors.newCategoryDisplayOrder ? (
                    <p className="text-xs text-destructive">
                      {serviceErrors.newCategoryDisplayOrder}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="inline-category-description">Category description</Label>
                  <Textarea
                    id="inline-category-description"
                    value={serviceForm.newCategoryDescription}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        newCategoryDescription: event.target.value,
                      }))
                    }
                    placeholder="Optional notes for the team"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="service-category">Category</Label>
                <Select
                  id="service-category"
                  value={serviceForm.serviceCategoryId}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      serviceCategoryId: event.target.value,
                    }))
                  }
                  options={categories.map((category) => ({
                    label: category.name,
                    value: category.id,
                  }))}
                  placeholder="Select a category"
                />
                {serviceErrors.serviceCategoryId ? (
                  <p className="text-xs text-destructive">{serviceErrors.serviceCategoryId}</p>
                ) : null}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-name">Service name</Label>
                <Input
                  id="service-name"
                  value={serviceForm.name}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Haircut, Facial, Beard Trim"
                />
                {serviceErrors.name ? (
                  <p className="text-xs text-destructive">{serviceErrors.name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-price">Price</Label>
                <Input
                  id="service-price"
                  type="number"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="0.00"
                />
                {serviceErrors.price ? (
                  <p className="text-xs text-destructive">{serviceErrors.price}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-duration">Duration (minutes)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  step="1"
                  value={serviceForm.durationMinutes}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                  placeholder="30"
                />
                {serviceErrors.durationMinutes ? (
                  <p className="text-xs text-destructive">{serviceErrors.durationMinutes}</p>
                ) : null}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-input bg-white px-4 py-3 text-sm md:mt-7">
                <Checkbox
                  checked={serviceForm.active}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                Active service
              </label>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  value={serviceForm.description}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional notes, benefits, or internal guidance"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceDialog({ open: false, mode: "create", recordId: null })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={serviceSaveMutation.isPending}>
                {serviceSaveMutation.isPending
                  ? "Saving..."
                  : serviceDialog.mode === "create"
                    ? "Create Service"
                    : "Save Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
