"use client";

export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787").replace(/\/$/, "");
}

export function apiUrl(path: string) {
  if (!path.startsWith("/")) return `${apiBaseUrl()}/${path}`;
  return `${apiBaseUrl()}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(`Could not reach the API at ${apiBaseUrl()}. Start the backend and try again.`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res;
}
