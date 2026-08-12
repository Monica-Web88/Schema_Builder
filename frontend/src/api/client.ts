import { SchemaDefinition, FieldSchema } from "../types/schema";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.ts).
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : "/api";

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function login(username: string, password: string) {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Invalid username or password.");
  const data = await res.json();
  setToken(data.access_token);
  return data as { access_token: string; role: string };
}

export async function register(username: string, password: string, role: string) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function listSchemas(): Promise<SchemaDefinition[]> {
  return request("/schemas");
}

export async function getSchema(name: string): Promise<SchemaDefinition> {
  return request(`/schemas/${encodeURIComponent(name)}`);
}

export async function saveSchema(name: string, fields: FieldSchema[]): Promise<SchemaDefinition> {
  return request("/schemas", {
    method: "POST",
    body: JSON.stringify({ name, fields }),
  });
}

export async function submitFormData(name: string, data: Record<string, unknown>) {
  return request<{ valid: boolean; errors: { field: string; message: string }[] }>(
    `/schemas/${encodeURIComponent(name)}/submit`,
    { method: "POST", body: JSON.stringify({ data }) }
  );
}
