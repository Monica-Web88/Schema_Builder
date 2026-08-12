"""
ORM models.

Two entities matter for the demo:

- User: has a role that drives RBAC (admin / author / viewer).
- SchemaDefinition: a versioned JSON schema describing a UI. Every
  edit creates a NEW row with an incremented version instead of
  mutating the old one, so any previously-generated UI (and any
  data submitted against it) keeps working even after the schema
  evolves. This is the "live schema migration" behavior called out
  in the project write-up.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Enum as SAEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Role(str, enum.Enum):
    admin = "admin"
    author = "author"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(Role), nullable=False, default=Role.viewer)

    schemas = relationship("SchemaDefinition", back_populates="author")


class SchemaDefinition(Base):
    __tablename__ = "schema_definitions"
    __table_args__ = (UniqueConstraint("name", "version", name="uq_name_version"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    definition = Column(JSON, nullable=False)  # list[FieldSchema] as JSON
    is_latest = Column(Integer, default=1)  # 1/0 flag (sqlite has no native bool index)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", back_populates="schemas")
