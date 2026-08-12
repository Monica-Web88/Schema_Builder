"""
Validates submitted form data against an authored schema.

This is deliberately separate from Pydantic's own model validation:
Pydantic validates that the SCHEMA is well-formed; this module
validates that user-submitted DATA satisfies a *dynamic* schema
that isn't known until runtime — which is the actual hard problem
an authoring platform has to solve (you can't hand-write a Pydantic
model for a form that doesn't exist until an author builds it).

Handles:
  - required fields
  - basic type coercion/checks per field type
  - conditional fields (skip required/type checks if the field
    that gates them isn't satisfied)
"""
from typing import Any

from app.schemas import FieldSchema, ValidationError, ValidationResult


def _type_check(field: FieldSchema, value: Any) -> str | None:
    if value is None or value == "":
        return None  # handled by required check

    if field.type in ("text", "email"):
        if not isinstance(value, str):
            return f"'{field.label}' must be text."
        if field.type == "email" and "@" not in value:
            return f"'{field.label}' must be a valid email."
    elif field.type in ("number", "currency"):
        try:
            float(value)
        except (TypeError, ValueError):
            return f"'{field.label}' must be a number."
    elif field.type == "checkbox":
        if not isinstance(value, bool):
            return f"'{field.label}' must be true or false."
    elif field.type == "select":
        if field.options and value not in field.options:
            return f"'{field.label}' must be one of {field.options}."
    return None


def _is_field_active(field: FieldSchema, data: dict[str, Any]) -> bool:
    """A conditional field is only in play if its gating condition is met."""
    if not field.conditional:
        return True
    return data.get(field.conditional.field) == field.conditional.equals


def validate_submission(fields: list[FieldSchema], data: dict[str, Any]) -> ValidationResult:
    errors: list[ValidationError] = []

    for field in fields:
        if not _is_field_active(field, data):
            continue

        value = data.get(field.id)

        if field.required and (value is None or value == ""):
            errors.append(ValidationError(field=field.id, message=f"'{field.label}' is required."))
            continue

        type_error = _type_check(field, value)
        if type_error:
            errors.append(ValidationError(field=field.id, message=type_error))

    return ValidationResult(valid=len(errors) == 0, errors=errors)
