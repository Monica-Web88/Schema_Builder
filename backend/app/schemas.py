"""
Pydantic (API-layer) schemas — distinct from the "form schema" JSON
that authors design in the frontend. Naming note:

- `FieldSchema` / `SchemaPayload`  -> the authored UI schema (a form's shape)
- `SchemaDefinitionOut`            -> a stored, versioned row in the DB
- `UserOut` / `Token`              -> auth plumbing
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ConditionalRule(BaseModel):
    field: str
    equals: Any


class FieldSchema(BaseModel):
    id: str
    type: str  # text | number | select | checkbox | currency | email | date
    label: str
    required: bool = False
    options: Optional[list[str]] = None  # for select
    placeholder: Optional[str] = None
    conditional: Optional[ConditionalRule] = None


class SchemaPayload(BaseModel):
    name: str
    fields: list[FieldSchema] = Field(default_factory=list)


class SchemaDefinitionOut(BaseModel):
    id: int
    name: str
    version: int
    definition: list[FieldSchema]
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionPayload(BaseModel):
    data: dict[str, Any]


class ValidationError(BaseModel):
    field: str
    message: str


class ValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationError] = Field(default_factory=list)


# --- auth ---

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "viewer"


class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
