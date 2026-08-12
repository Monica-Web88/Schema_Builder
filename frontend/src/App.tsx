import { useEffect, useState } from "react";
import AuthoringCanvas from "./components/AuthoringCanvas";
import RuntimeRenderer from "./components/RuntimeRenderer";
import Login from "./components/Login";
import { FieldSchema, SchemaDefinition } from "./types/schema";
import { getSchema, listSchemas, saveSchema, setToken, submitFormData } from "./api/client";

type View = "author" | "preview";

export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([]);
  const [schemaName, setSchemaName] = useState("onboarding_form");
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [view, setView] = useState<View>("author");
  const [status, setStatus] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const canAuthor = role === "author" || role === "admin";

  useEffect(() => {
    if (role) refreshSchemaList();
  }, [role]);

  async function refreshSchemaList() {
    try {
      setSchemas(await listSchemas());
    } catch {
      // Non-fatal: schema list is a convenience, not required to author.
    }
  }

  async function handleLoad() {
    setStatus(null);
    try {
      const schema = await getSchema(schemaName);
      setFields(schema.definition);
      setStatus(`Loaded "${schemaName}" (v${schema.version}).`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load schema.");
    }
  }

  async function handleSave() {
    setStatus(null);
    try {
      const saved = await saveSchema(schemaName, fields);
      setStatus(`Saved "${saved.name}" as v${saved.version}.`);
      refreshSchemaList();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save schema.");
    }
  }

  async function handlePreviewSubmit(data: Record<string, unknown>) {
    try {
      const result = await submitFormData(schemaName, data);
      setSubmitResult(
        result.valid
          ? "✅ Submission passed server-side validation."
          : `❌ Server rejected it: ${result.errors.map((e) => e.message).join(" ")}`
      );
    } catch (err) {
      setSubmitResult(err instanceof Error ? err.message : "Submit failed.");
    }
  }

  if (!role) {
    return (
      <div className="app-shell centered">
        <header>
          <h1>Schema Forge</h1>
          <p className="tagline">Author a schema once. Render it anywhere, forever.</p>
        </header>
        <Login
          onLoggedIn={(r) => {
            setRole(r);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>Schema Forge</h1>
          <p className="tagline">Signed in as role: {role}</p>
        </div>
        <button
          className="link-btn"
          onClick={() => {
            setToken(null);
            setRole(null);
          }}
        >
          Sign out
        </button>
      </header>

      <div className="toolbar">
        <input
          className="schema-name-input"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          placeholder="schema name, e.g. onboarding_form"
        />
        <button onClick={handleLoad}>Load</button>
        <button onClick={handleSave} disabled={!canAuthor} title={!canAuthor ? "Viewer role can't save schemas" : ""}>
          Save new version
        </button>
        <div className="view-toggle">
          <button className={view === "author" ? "active" : ""} onClick={() => setView("author")}>
            Author
          </button>
          <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
            Live Preview
          </button>
        </div>
      </div>

      {status && <p className="status-line">{status}</p>}

      <div className="main-panels">
        {view === "author" ? (
          <AuthoringCanvas fields={fields} onChange={setFields} />
        ) : (
          <div className="preview-panel">
            <RuntimeRenderer fields={fields} onSubmit={handlePreviewSubmit} />
            {submitResult && <p className="status-line">{submitResult}</p>}
          </div>
        )}

        <aside className="schema-sidebar">
          <h3>Saved schemas</h3>
          <ul>
            {schemas.map((s) => (
              <li key={s.name}>
                <button className="link-btn" onClick={() => setSchemaName(s.name)}>
                  {s.name} <span className="version-badge">v{s.version}</span>
                </button>
              </li>
            ))}
            {schemas.length === 0 && <li className="empty-state">None yet.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}
