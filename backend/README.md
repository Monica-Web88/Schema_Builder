# Schema Forge — Backend

FastAPI service that stores versioned UI schemas and serves them over
both REST and GraphQL, with JWT auth and role-based access control.

## Run it

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
```

Interactive API docs: `http://localhost:8000/docs`
GraphQL playground: `http://localhost:8000/graphql`

## Run the tests

```bash
pytest -v
```

17 tests covering auth/RBAC, schema CRUD + versioning, and the
dynamic validation engine — all using an isolated in-memory SQLite
DB per test, no shared state.

## How it's put together

```
app/
  main.py            FastAPI app: wires REST + GraphQL + startup
  models.py          SQLAlchemy models (User, SchemaDefinition)
  schemas.py         Pydantic request/response models
  database.py        Engine/session setup (SQLite by default)
  auth.py            JWT issuing/verification + require_role() dependency
  validation.py       Validates arbitrary submitted data against a
                      dynamic (runtime-defined) schema
  rest_routes.py      /auth/*, /schemas/*, /schemas/{name}/submit
  graphql_schema.py   Strawberry GraphQL Query type, same data as REST
tests/
  test_auth.py         registration, login, role enforcement
  test_schema_crud.py  versioning behavior
  test_validation.py   the dynamic validation engine in isolation
```

### Design notes

**Why both REST and GraphQL.** The authoring UI does simple CRUD per
screen — REST fits naturally. A consumer embedding a generated form
wants exactly "this schema, these fields" in one round trip without
a new endpoint per use case — that's what the GraphQL query is for.
Both read from the same SQLAlchemy models, so they can't drift.

**Schema versioning.** Saving a schema under a name that already
exists doesn't overwrite the old row — it inserts a new one with an
incremented `version` and flips the previous row's `is_latest` off.
Old versions stay queryable forever (`GET /schemas/{name}/versions`),
so a UI or integration built against v1 keeps working after v3 ships.

**Why dynamic validation is its own module.** Pydantic validates
that a *schema* is well-formed at request time, but it can't
validate submitted *data* against a schema it doesn't know about
until runtime — you can't hand-write a model for a form that doesn't
exist until an author builds it. `validation.py` walks the stored
field list and checks required-ness, type, and conditional
visibility against whatever the author defined.

### Auth quickstart

```bash
# Register (role: admin | author | viewer)
curl -X POST localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pw12345","role":"author"}'

# Log in
curl -X POST localhost:8000/auth/token \
  -d "username=alice&password=pw12345"
# -> { "access_token": "...", "token_type": "bearer", "role": "author" }

# Use the token
curl -X POST localhost:8000/schemas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"onboarding","fields":[{"id":"full_name","type":"text","label":"Full Name","required":true}]}'
```
