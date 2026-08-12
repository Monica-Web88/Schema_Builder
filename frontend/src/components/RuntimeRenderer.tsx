import { useMemo, useState } from "react";
import { FieldSchema } from "../types/schema";
import { validateSubmission } from "../utils/validation";

interface Props {
  fields: FieldSchema[];
  onSubmit?: (data: Record<string, unknown>) => void;
  submitLabel?: string;
}

/**
 * Takes a JSON schema (a list of FieldSchema) and renders a fully
 * working, validated form for it — no field-specific code is
 * written per form. This is the "runtime app UI generation" piece:
 * the schema IS the app.
 */
export default function RuntimeRenderer({ fields, onSubmit, submitLabel = "Submit" }: Props) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const visibleFields = useMemo(
    () =>
      fields.filter(
        (f) => !f.conditional || data[f.conditional.field] === f.conditional.equals
      ),
    [fields, data]
  );

  function setValue(id: string, value: unknown) {
    setData((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateSubmission(fields, data);
    const errorMap: Record<string, string> = {};
    result.errors.forEach((err) => (errorMap[err.field] = err.message));
    setErrors(errorMap);
    setSubmitted(true);
    if (result.valid) {
      onSubmit?.(data);
    }
  }

  if (fields.length === 0) {
    return <p className="empty-state">This schema has no fields yet.</p>;
  }

  return (
    <form className="runtime-form" onSubmit={handleSubmit} noValidate>
      {visibleFields.map((field) => (
        <div className="form-field" key={field.id}>
          <label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="required-star"> *</span>}
          </label>
          {renderInput(field, data[field.id], setValue)}
          {submitted && errors[field.id] && (
            <p className="field-error">{errors[field.id]}</p>
          )}
        </div>
      ))}
      <button type="submit" className="primary-btn">
        {submitLabel}
      </button>
    </form>
  );
}

function renderInput(
  field: FieldSchema,
  value: unknown,
  setValue: (id: string, value: unknown) => void
) {
  switch (field.type) {
    case "checkbox":
      return (
        <input
          id={field.id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setValue(field.id, e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          id={field.id}
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.id, e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "number":
      return (
        <input
          id={field.id}
          type="number"
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
    case "currency":
      return (
        <div className="currency-input">
          <span>$</span>
          <input
            id={field.id}
            type="number"
            step="0.01"
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        </div>
      );
    case "date":
      return (
        <input
          id={field.id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
    case "email":
      return (
        <input
          id={field.id}
          type="email"
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
    default:
      return (
        <input
          id={field.id}
          type="text"
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
  }
}
