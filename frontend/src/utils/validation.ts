import { FieldSchema } from "../types/schema";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Mirrors app/validation.py on the backend so the runtime renderer
 * can give instant feedback without a round trip, while the
 * backend remains the source of truth (this never replaces server
 * validation — it's UX sugar).
 */
function isFieldActive(field: FieldSchema, data: Record<string, unknown>): boolean {
  if (!field.conditional) return true;
  return data[field.conditional.field] === field.conditional.equals;
}

function typeError(field: FieldSchema, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;

  switch (field.type) {
    case "text":
    case "date":
      return typeof value === "string" ? null : `'${field.label}' must be text.`;
    case "email":
      if (typeof value !== "string" || !value.includes("@")) {
        return `'${field.label}' must be a valid email.`;
      }
      return null;
    case "number":
    case "currency":
      return isNaN(Number(value)) ? `'${field.label}' must be a number.` : null;
    case "checkbox":
      return typeof value === "boolean" ? null : `'${field.label}' must be true or false.`;
    case "select":
      if (field.options && !field.options.includes(String(value))) {
        return `'${field.label}' must be one of ${field.options.join(", ")}.`;
      }
      return null;
    default:
      return null;
  }
}

export function validateSubmission(
  fields: FieldSchema[],
  data: Record<string, unknown>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    if (!isFieldActive(field, data)) continue;

    const value = data[field.id];

    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push({ field: field.id, message: `'${field.label}' is required.` });
      continue;
    }

    const err = typeError(field, value);
    if (err) errors.push({ field: field.id, message: err });
  }

  return { valid: errors.length === 0, errors };
}
