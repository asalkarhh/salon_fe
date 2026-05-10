import { getResource, type ResourceKey } from "@/features/resources/resourceDefinitions";
import type { Role } from "@/types/enums";

export type ResourceAccessMode = "list" | "detail" | "create" | "edit";

const supportReadRoles = ["SUPER_ADMIN", "SALON_OWNER", "STAFF"] as const satisfies readonly Role[];
const ownerStaffRoles = ["SALON_OWNER", "STAFF"] as const satisfies readonly Role[];
const allRoles = ["SUPER_ADMIN", "SALON_OWNER", "STAFF", "CUSTOMER"] as const satisfies readonly Role[];

export const pageUiAccess = {
  dashboard: allRoles,
  mySalon: ["SALON_OWNER"],
  owners: ["SUPER_ADMIN"],
  createOwner: ["SUPER_ADMIN"],
  featureAccess: ["SUPER_ADMIN"],
  visits: ["SALON_OWNER"],
  appointments: supportReadRoles,
  appointmentCreate: ownerStaffRoles,
  appointmentDetail: supportReadRoles,
  appointmentEdit: ownerStaffRoles,
  queueTokens: supportReadRoles,
  queueTokenCreate: ownerStaffRoles,
  queueTokenDetail: supportReadRoles,
  billing: ["SALON_OWNER"],
  invoices: supportReadRoles,
  invoiceCreate: ownerStaffRoles,
  invoiceDetail: supportReadRoles,
  invoiceEdit: ownerStaffRoles,
  payments: supportReadRoles,
  staffEarnings: ["SUPER_ADMIN", "SALON_OWNER"],
  myEarnings: ["STAFF"],
  payroll: ["SALON_OWNER"],
} as const satisfies Record<string, readonly Role[]>;

const resourceUiAccessOverrides: Partial<
  Record<ResourceKey, Partial<Record<ResourceAccessMode, readonly Role[]>>>
> = {
  subscriptions: {
    list: ["SUPER_ADMIN"],
    detail: ["SUPER_ADMIN"],
    create: ["SUPER_ADMIN"],
    edit: ["SUPER_ADMIN"],
  },
  branches: {
    list: ["SUPER_ADMIN", "SALON_OWNER"],
    detail: ["SUPER_ADMIN", "SALON_OWNER"],
    create: ["SALON_OWNER"],
    edit: ["SUPER_ADMIN", "SALON_OWNER"],
  },
  serviceCategories: {
    list: ["SUPER_ADMIN"],
    detail: ["SUPER_ADMIN"],
    create: ["SUPER_ADMIN"],
    edit: ["SUPER_ADMIN"],
  },
  services: {
    list: ["SUPER_ADMIN", "SALON_OWNER"],
    detail: ["SUPER_ADMIN", "SALON_OWNER"],
    create: ["SUPER_ADMIN", "SALON_OWNER"],
    edit: ["SUPER_ADMIN", "SALON_OWNER"],
  },
  staff: {
    list: ["SUPER_ADMIN", "SALON_OWNER"],
    detail: ["SUPER_ADMIN", "SALON_OWNER"],
    create: ["SALON_OWNER"],
    edit: ["SALON_OWNER"],
  },
};

export function getResourceUiRoles(
  resourceKey: ResourceKey,
  mode: ResourceAccessMode,
): readonly Role[] {
  const override = resourceUiAccessOverrides[resourceKey]?.[mode];
  if (override) {
    return override;
  }

  const resource = getResource(resourceKey) as {
    roles: readonly Role[];
    createRoles?: readonly Role[];
    editRoles?: readonly Role[];
  };

  if (mode === "create") {
    return "createRoles" in resource ? resource.createRoles ?? resource.roles : resource.roles;
  }

  if (mode === "edit") {
    return "editRoles" in resource ? resource.editRoles ?? resource.roles : resource.roles;
  }

  return resource.roles;
}
