import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import type { SalonBusinessResponse } from "@/types/api";

export function toSalonSelectOption(salon: SalonBusinessResponse): SearchableSelectOption {
  const ownerIdentity = [salon.ownerName, salon.ownerUsername].filter(Boolean).join(" / ");

  return {
    label: `${salon.businessName} (${salon.salonCode})`,
    value: salon.id,
    description: ownerIdentity ? `Owner: ${ownerIdentity}` : undefined,
    searchText: [
      salon.businessName,
      salon.salonCode,
      salon.ownerName,
      salon.ownerUsername,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
