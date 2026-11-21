import type { Character } from "@dnd/shared";
import { API_URL } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  createSheet: (data: Partial<Character> = {}) =>
    request<Character>("/api/sheets", { method: "POST", body: JSON.stringify(data) }),
  deleteSheet: (id: string) => request<void>(`/api/sheets/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
