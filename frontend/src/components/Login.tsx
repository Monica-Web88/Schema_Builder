import { useState } from "react";
import { login, register } from "../api/client";

interface Props {
  onLoggedIn: (role: string) => void;
}

export default function Login({ onLoggedIn }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("author");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "register") {
        await register(username, password, role);
      }
      const result = await login(username, password);
      onLoggedIn(result.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="login-panel">
      <h2>{mode === "login" ? "Sign in" : "Create an account"}</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {mode === "register" && (
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">Viewer (read + submit only)</option>
              <option value="author">Author (build schemas)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </label>
        )}
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="primary-btn">
          {mode === "login" ? "Sign in" : "Register & sign in"}
        </button>
      </form>
      <button
        type="button"
        className="link-btn"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
