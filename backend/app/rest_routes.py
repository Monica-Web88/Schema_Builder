from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas as api_schemas
from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.database import get_db
from app.validation import validate_submission

router = APIRouter()


# ---------------------------------------------------------------- auth ----

@router.post("/auth/register", response_model=api_schemas.UserOut)
def register(payload: api_schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken.")
    if payload.role not in [r.value for r in models.Role]:
        raise HTTPException(status_code=400, detail="Invalid role.")
    user = models.User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/token", response_model=api_schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    token = create_access_token(
        {"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return api_schemas.Token(access_token=token, role=user.role.value)


@router.get("/auth/me", response_model=api_schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ------------------------------------------------------------- schemas ----

@router.post(
    "/schemas",
    response_model=api_schemas.SchemaDefinitionOut,
    dependencies=[Depends(require_role(["admin", "author"]))],
)
def create_or_version_schema(
    payload: api_schemas.SchemaPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Creates a new schema, or — if a schema with this name already
    exists — writes a new, incremented version and flips the old
    version's `is_latest` flag off. Old versions are never mutated
    or deleted, so any UI/data built against v1 keeps working after
    v2 ships.
    """
    latest = (
        db.query(models.SchemaDefinition)
        .filter(models.SchemaDefinition.name == payload.name)
        .order_by(models.SchemaDefinition.version.desc())
        .first()
    )
    next_version = (latest.version + 1) if latest else 1

    if latest:
        latest.is_latest = 0

    row = models.SchemaDefinition(
        name=payload.name,
        version=next_version,
        definition=[f.model_dump() for f in payload.fields],
        is_latest=1,
        created_by_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/schemas", response_model=list[api_schemas.SchemaDefinitionOut])
def list_schemas(db: Session = Depends(get_db)):
    """Returns only the latest version of each named schema."""
    subq = (
        db.query(
            models.SchemaDefinition.name,
            func.max(models.SchemaDefinition.version).label("max_version"),
        )
        .group_by(models.SchemaDefinition.name)
        .subquery()
    )
    rows = (
        db.query(models.SchemaDefinition)
        .join(
            subq,
            (models.SchemaDefinition.name == subq.c.name)
            & (models.SchemaDefinition.version == subq.c.max_version),
        )
        .all()
    )
    return rows


@router.get("/schemas/{name}", response_model=api_schemas.SchemaDefinitionOut)
def get_latest_schema(name: str, db: Session = Depends(get_db)):
    row = (
        db.query(models.SchemaDefinition)
        .filter(models.SchemaDefinition.name == name)
        .order_by(models.SchemaDefinition.version.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Schema not found.")
    return row


@router.get("/schemas/{name}/versions", response_model=list[api_schemas.SchemaDefinitionOut])
def get_schema_versions(name: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.SchemaDefinition)
        .filter(models.SchemaDefinition.name == name)
        .order_by(models.SchemaDefinition.version.asc())
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Schema not found.")
    return rows


@router.get("/schemas/{name}/versions/{version}", response_model=api_schemas.SchemaDefinitionOut)
def get_schema_version(name: str, version: int, db: Session = Depends(get_db)):
    row = (
        db.query(models.SchemaDefinition)
        .filter(models.SchemaDefinition.name == name, models.SchemaDefinition.version == version)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Schema version not found.")
    return row


# ---------------------------------------------------------- submissions ----

@router.post("/schemas/{name}/submit", response_model=api_schemas.ValidationResult)
def submit_form_data(name: str, payload: api_schemas.SubmissionPayload, db: Session = Depends(get_db)):
    """Validates arbitrary user data against the latest version of a named schema."""
    row = (
        db.query(models.SchemaDefinition)
        .filter(models.SchemaDefinition.name == name)
        .order_by(models.SchemaDefinition.version.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Schema not found.")

    fields = [api_schemas.FieldSchema(**f) for f in row.definition]
    return validate_submission(fields, payload.data)
