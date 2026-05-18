import type { ZodTypeAny } from "zod";
import type { CurrentUserResponse } from "@/types/api";
import type { Role } from "@/types/enums";

// Lookup context carries the current user, form values, and active filters so a
// lookup query can decide which backend endpoint parameters to send.
export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  searchText?: string;
  keywords?: string[];
}

export interface LookupContext {
  user: CurrentUserResponse;
  mode: "list" | "detail" | "create" | "edit";
  values: Record<string, unknown>;
  filters: Record<string, string>;
}

export interface LookupResult {
  key: string;
  options: SelectOption[];
  labelMap: Record<string, string>;
  raw: unknown[];
}

// Resource definitions are the frontend's endpoint registry. Generic list,
// form, and detail pages read this contract to know which queries and
// mutations to call for each backend resource.
export interface ResourceHelpers {
  lookupLabel: (lookupKey: string, value?: string | null) => string;
  lookupOptions: (lookupKey: string) => SelectOption[];
}

export interface LookupDefinition<TItem = unknown> {
  key: string;
  queryKey: (context: LookupContext) => unknown[];
  queryFn: (context: LookupContext) => Promise<TItem[]>;
  enabled?: (context: LookupContext) => boolean;
  toOption: (item: TItem) => SelectOption;
}

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "time"
  | "datetime-local"
  | "checkbox"
  | "select";

export interface FieldContext {
  user: CurrentUserResponse;
  mode: "create" | "edit";
  values: Record<string, unknown>;
}

export interface ResourceField {
  name: string;
  label: string;
  type: FieldType;
  searchable?: boolean;
  placeholder?: string;
  description?: string;
  gridSpan?: 1 | 2;
  lookupKey?: string;
  options?: SelectOption[];
  resetOnChange?: string[];
  hidden?: (context: FieldContext) => boolean;
  disabled?: (context: FieldContext) => boolean;
}

export interface ResourceListFilter {
  name: string;
  label: string;
  type: "select" | "date";
  searchable?: boolean;
  lookupKey?: string;
  options?: SelectOption[];
  hidden?: (context: LookupContext) => boolean;
}

export interface DetailField<TRecord> {
  label: string;
  value: (record: TRecord, helpers: ResourceHelpers) => React.ReactNode;
}

export interface ResourceColumn<TRecord> {
  id: string;
  header: string;
  cell: (record: TRecord, helpers: ResourceHelpers) => React.ReactNode;
  sortingValue?: (record: TRecord, helpers: ResourceHelpers) => string | number;
}

export interface ResourceDefinition<TRecord, TForm> {
  key: string;
  title: string;
  singular: string;
  description: string;
  roles: Role[];
  createRoles?: Role[];
  editRoles?: Role[];
  toggleRoles?: Role[];
  searchPlaceholder?: string;
  listPath: string;
  createPath?: string;
  detailPath?: (id: string) => string;
  editPath?: (id: string) => string;
  schema: (mode: "create" | "edit") => ZodTypeAny;
  defaultValues: (user: CurrentUserResponse) => TForm;
  toPayload: (values: TForm, user: CurrentUserResponse) => Record<string, unknown>;
  toFormValues?: (record: TRecord, user: CurrentUserResponse) => TForm;
  fields: ResourceField[];
  listQuery: (
    user: CurrentUserResponse,
    filters: Record<string, string>,
  ) => Promise<TRecord[]>;
  getQuery?: (id: string, user: CurrentUserResponse) => Promise<TRecord>;
  createMutation?: (
    payload: Record<string, unknown>,
    user: CurrentUserResponse,
  ) => Promise<TRecord>;
  updateMutation?: (
    id: string,
    payload: Record<string, unknown>,
    user: CurrentUserResponse,
  ) => Promise<TRecord>;
  activateMutation?: (id: string) => Promise<unknown>;
  deactivateMutation?: (id: string) => Promise<unknown>;
  extraInvalidateKeys?: string[];
  toggleActive?: {
    isActive: (record: TRecord) => boolean;
    activeLabel: string;
    inactiveLabel: string;
  };
  listFilters?: ResourceListFilter[];
  lookupDefinitions?: LookupDefinition<any>[];
  columns: (helpers: ResourceHelpers) => ResourceColumn<TRecord>[];
  mobileCard: (record: TRecord, helpers: ResourceHelpers) => React.ReactNode;
  detailFields: (helpers: ResourceHelpers) => DetailField<TRecord>[];
  detailExtra?: (
    record: TRecord,
    helpers: ResourceHelpers,
    user: CurrentUserResponse,
  ) => React.ReactNode;
  searchValues: (record: TRecord, helpers: ResourceHelpers) => string[];
  localFilter?: (record: TRecord, filters: Record<string, string>) => boolean;
}
