# Schema Builder — Frontend

React + TypeScript app with two halves that share one data shape
(`FieldSchema[]`): an **authoring canvas** (build a form) and a
**runtime renderer** (run that form) — so "what you design" and
"what ships" can never disagree with each other.

## Run it

Requires the backend running at `http://localhost:8000` (see
`../backend/README.md`) — Vite proxies `/api` to it in dev.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## Run the tests

```bash
npm test
```

10 tests: client-side validation logic, plus RuntimeRenderer
behavior (renders fields, hides/shows conditional fields, blocks
submission on validation errors, calls `onSubmit` with clean data).

## Structure

```
src/
  App.tsx                    top-level state: auth, schema name, author/preview toggle
  components/
    Login.tsx                register/sign-in
    AuthoringCanvas.tsx       add/reorder(drag-drop)/edit/remove fields
    RuntimeRenderer.tsx       renders a live, validated form from FieldSchema[]
  api/client.ts               typed fetch wrapper for the FastAPI backend
  types/schema.ts              FieldSchema/SchemaDefinition types (mirrors backend Pydantic models)
  utils/validation.ts          client-side validation (mirrors backend for instant UX feedback)
  __tests__/                   vitest + React Testing Library
```

### Why a separate authoring canvas and runtime renderer

They're two different jobs against one shared contract. The canvas
mutates a `FieldSchema[]`; the renderer only ever reads one. A field
type, a conditional rule, a required flag — anything an author adds
is immediately renderable, because there's no separate "publish"
step. Author view and Live Preview are the same schema through two
different lenses.
