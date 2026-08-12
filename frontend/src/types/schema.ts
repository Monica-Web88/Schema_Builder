export type FieldType =
  | "text"
  | "email"
  | "number"
  | "currency"
  | "select"
  | "checkbox"
  | "date";

export interface ConditionalRule {
  field: string;
  equals: unknown;
}

export interface FieldSchema {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  conditional?: ConditionalRule;
}

export interface SchemaDefinition {
  id: number;
  name: string;
  version: number;
  definition: FieldSchema[];
  created_at: string;
}

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];

export function makeFieldId(label: string, existing: FieldSchema[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
  let candidate = base;
  let n = 1;
  const existingIds = new Set(existing.map((f) => f.id));
  while (existingIds.has(candidate)) {
    candidate = `${base}_${n++}`;
  }
  return candidate;
}
