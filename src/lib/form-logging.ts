import type { FieldErrors } from "react-hook-form";
import { logger } from "@/lib/logger";

/**
 * Keeps form validation diagnostics consistent without leaking submitted values
 * into browser logs.
 */
export function logValidationFailure(
  formName: string,
  errors: FieldErrors<any>,
) {
  const fields = Object.keys(errors);
  logger.warn("forms", "validation_failed", {
    formName,
    fields,
    errorCount: fields.length,
  });
}
