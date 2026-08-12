import { useState } from "react";
import { FieldSchema, FieldType, FIELD_TYPE_OPTIONS, makeFieldId } from "../types/schema";

interface Props {
  fields: FieldSchema[];
  onChange: (fields: FieldSchema[]) => void;
}

/**
 * The authoring surface: add fields, reorder via native HTML5 drag
 * and drop, edit properties inline, wire up conditional visibility.
 * Everything here just produces a plain FieldSchema[] — the same
 * shape RuntimeRenderer consumes — so "what you author" and "what
 * renders" can never drift apart.
 */
export default function AuthoringCanvas({ fields, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addField(type: FieldType) {
    const label = `New ${FIELD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "field"}`;
    const newField: FieldSchema = {
      id: makeFieldId(label, fields),
      type,
      label,
      required: false,
      ...(type === "select" ? { options: ["Option 1", "Option 2"] } : {}),
    };
    onChange([...fields, newField]);
  }

  function updateField(index: number, patch: Partial<FieldSchema>) {
    const next = [...fields];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...fields];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  }

  return (
    <div className="authoring-canvas">
      <div className="field-palette">
        <p className="palette-label">Add a field</p>
        <div className="palette-buttons">
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => addField(opt.value)}>
              + {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-list">
        {fields.length === 0 && (
          <p className="empty-state">No fields yet — add one from the palette above.</p>
        )}
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="field-card"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
          >
            <div className="field-card-header">
              <span className="drag-handle" title="Drag to reorder">
                ⠿
              </span>
              <input
                className="field-label-input"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />
              <span className="field-type-badge">{field.type}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeField(index)}
                aria-label={`Remove ${field.label}`}
              >
                ✕
              </button>
            </div>

            <div className="field-card-body">
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>

              {field.type === "select" && (
                <label className="options-input">
                  Options (comma-separated)
                  <input
                    value={(field.options || []).join(", ")}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </label>
              )}

              <label className="conditional-input">
                Show only when field
                <select
                  value={field.conditional?.field ?? ""}
                  onChange={(e) => {
                    const gateField = e.target.value;
                    if (!gateField) {
                      updateField(index, { conditional: undefined });
                    } else {
                      updateField(index, {
                        conditional: { field: gateField, equals: true },
                      });
                    }
                  }}
                >
                  <option value="">— none —</option>
                  {fields
                    .filter((f) => f.id !== field.id && f.type === "checkbox")
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                </select>
                is checked
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
