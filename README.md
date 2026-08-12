# Schema Forge

A hosted authoring platform: non-technical users design a form or
admin screen visually, and the system generates a live, fully
validated UI from a JSON schema at runtime — no redeploy, no
per-form code.

Built as a demonstration of platform-level frontend architecture:
the deliverable isn't a form, it's the *system that generates
forms* — schema authoring, versioning, RBAC, and dual REST/GraphQL
APIs.

## Stack

| Layer      | Tech                                              |
|------------|----------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Vitest + Testing Library |
| Backend    | Python, FastAPI, SQLAlchemy, Strawberry GraphQL     |
| Auth       | JWT (python-jose) + bcrypt, role-based access control |
| Data       | SQLite (swap via `DATABASE_URL` env var)            |
| Testing    | pytest (backend, 17 tests) · vitest (frontend, 10 tests) |

## Quickstart

```bash
# Terminal 1 — backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, register an account (pick role
`author`), and build a form. Switch to "Live Preview" to see it
render — and submit — for real, validated server-side.

## What it demonstrates, and why it maps to a lead
front-end/platform + Identity role

- **Architectural thinking, not component-building.** The core
  artifact is a schema, not a page — the same `FieldSchema[]` drives
  both the authoring canvas and the runtime renderer, so there's no
  "design it, then separately implement it" gap.
- **Microservices / API design (REST *and* GraphQL).** Both surfaces
  read the same underlying data so they can't drift; each is a
  deliberate choice for a different consumer (internal admin CRUD vs.
  a single-round-trip embed).
- **Identity-adjacent RBAC.** Three roles (`admin` / `author` /
  `viewer`) gate schema mutation at the API layer via a FastAPI
  dependency (`require_role`), not just hidden in the UI.
- **TDD in practice, not retrofitted.** 27 tests total, written
  against behavior (versioning, RBAC enforcement, conditional
  validation) rather than implementation details.
- **A real hard problem, solved:** schema versioning. Saving an
  edited schema never mutates the old row — it writes a new version
  and keeps every prior one queryable, so nothing that was already
  generated from v1 breaks when v2 ships.

## Project layout

```
schema-forge/
  backend/     FastAPI service — see backend/README.md
  frontend/    React app — see frontend/README.md
```
