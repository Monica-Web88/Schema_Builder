"""
GraphQL surface, built alongside REST rather than instead of it.

Why both: the authoring UI (internal) wants REST-style simple
CRUD calls per screen. A partner/consumer app embedding a
generated form, on the other hand, often wants to fetch exactly
"schema + only the fields it needs" in one round trip without the
backend team hand-rolling a new REST endpoint per consumer —
that's the classic REST-vs-GraphQL split, and this project
demonstrates both rather than picking one.

This module intentionally re-uses the same SQLAlchemy session and
validation logic as rest_routes.py so the two APIs can never drift
out of sync with each other.
"""
from typing import Optional

import strawberry
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal


@strawberry.type
class FieldType:
    id: str
    type: str
    label: str
    required: bool
    options: Optional[list[str]]
    placeholder: Optional[str]


@strawberry.type
class SchemaType:
    id: int
    name: str
    version: int
    fields: list[FieldType]

    @staticmethod
    def from_model(row: models.SchemaDefinition) -> "SchemaType":
        fields = [
            FieldType(
                id=f["id"],
                type=f["type"],
                label=f["label"],
                required=f.get("required", False),
                options=f.get("options"),
                placeholder=f.get("placeholder"),
            )
            for f in row.definition
        ]
        return SchemaType(id=row.id, name=row.name, version=row.version, fields=fields)


def _get_session() -> Session:
    return SessionLocal()


@strawberry.type
class Query:
    @strawberry.field
    def schemas(self) -> list[SchemaType]:
        db = _get_session()
        try:
            rows = db.query(models.SchemaDefinition).all()
            latest_by_name = {}
            for row in rows:
                current = latest_by_name.get(row.name)
                if current is None or row.version > current.version:
                    latest_by_name[row.name] = row
            return [SchemaType.from_model(r) for r in latest_by_name.values()]
        finally:
            db.close()

    @strawberry.field
    def schema(self, name: str, version: Optional[int] = None) -> Optional[SchemaType]:
        db = _get_session()
        try:
            q = db.query(models.SchemaDefinition).filter(models.SchemaDefinition.name == name)
            if version is not None:
                q = q.filter(models.SchemaDefinition.version == version)
            else:
                q = q.order_by(models.SchemaDefinition.version.desc())
            row = q.first()
            return SchemaType.from_model(row) if row else None
        finally:
            db.close()


schema = strawberry.Schema(query=Query)
