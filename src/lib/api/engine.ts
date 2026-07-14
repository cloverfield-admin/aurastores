"use client";

import { getEngineAccessToken } from "@/lib/supabase/browser-client";

/**
 * Client for the Go engine (`aurestores-engine`).
 *
 * This is the ONLY part of the web app that calls the engine directly rather than
 * going through a Next.js route handler, and it is deliberate: the admin console's
 * backend lives entirely in the engine, so it is also the pilot for the pending
 * Next→Go cutover.
 *
 * Two consequences follow, and both bite only in the browser (never under curl):
 *   - the engine's ALLOWED_ORIGINS must list this web origin, or every request
 *     dies at the CORS preflight; and
 *   - auth rides on an `Authorization: Bearer` header, not the Supabase cookie,
 *     because the cookie is not sent cross-origin.
 */
const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";

export type EngineFieldError = { field: string; message: string };

export class EngineApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: EngineFieldError[];

  constructor(status: number, code: string, message: string, details?: EngineFieldError[]) {
    super(message);
    this.name = "EngineApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Maps `details` onto a per-field error map for a form. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) {
      out[d.field] = d.message;
    }
    return out;
  }
}

/**
 * The org currently being viewed read-only ("view as store"), or null.
 *
 * Module-level rather than prop-drilled: every `adminFetch` in an impersonated
 * view needs it, and threading it through each hook would mean one forgotten call
 * silently reading the ADMIN's own org instead of the store on screen. The
 * impersonation provider is the only writer.
 */
let impersonateOrgId: string | null = null;

export function setImpersonationTarget(orgId: string | null) {
  impersonateOrgId = orgId;
}

export function getImpersonationTarget(): string | null {
  return impersonateOrgId;
}

type EngineInit = RequestInit & {
  /** Send X-Aura-Impersonate-Org. Only meaningful on GETs; the engine refuses writes. */
  impersonate?: boolean;
};

type EngineEnvelope<T> =
  | { data: T; page?: EnginePage }
  | { error: { code: string; message: string; details?: EngineFieldError[] } };

export type EnginePage = {
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
};

/**
 * Calls the engine and unwraps its `{data}` / `{error}` envelope.
 *
 * Payloads stay snake_case on purpose. The engine emits snake_case JSON tags, and
 * auto-camel-casing would be a silent-breakage machine (a renamed field would
 * quietly read `undefined` rather than failing loudly). These admin types are new
 * and only this console reads them, so there is nothing to be consistent with.
 */
export async function adminFetch<T>(path: string, init?: EngineInit): Promise<T> {
  if (!ENGINE_URL) {
    throw new EngineApiError(
      0,
      "engine_not_configured",
      "NEXT_PUBLIC_ENGINE_URL is not set, so the admin console has no backend to talk to.",
    );
  }

  const token = await getEngineAccessToken();
  if (!token) {
    throw new EngineApiError(401, "unauthenticated", "Your session expired. Sign in again.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.impersonate && impersonateOrgId) {
    headers.set("X-Aura-Impersonate-Org", impersonateOrgId);
  }

  const response = await fetch(`${ENGINE_URL}${path}`, {
    ...init,
    headers,
    mode: "cors",
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as EngineEnvelope<T> | null;

  if (!response.ok || !payload || "error" in payload) {
    const error = payload && "error" in payload ? payload.error : null;
    throw new EngineApiError(
      response.status,
      error?.code ?? "internal",
      error?.message ?? "The request failed.",
      error?.details,
    );
  }

  return payload.data;
}

/** Like `adminFetch`, but also returns the keyset `page` envelope (audit log). */
export async function adminFetchPaged<T>(
  path: string,
  init?: EngineInit,
): Promise<{ data: T; page: EnginePage | null }> {
  if (!ENGINE_URL) {
    throw new EngineApiError(0, "engine_not_configured", "NEXT_PUBLIC_ENGINE_URL is not set.");
  }
  const token = await getEngineAccessToken();
  if (!token) {
    throw new EngineApiError(401, "unauthenticated", "Your session expired. Sign in again.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${ENGINE_URL}${path}`, {
    ...init,
    headers,
    mode: "cors",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as EngineEnvelope<T> | null;
  if (!response.ok || !payload || "error" in payload) {
    const error = payload && "error" in payload ? payload.error : null;
    throw new EngineApiError(
      response.status,
      error?.code ?? "internal",
      error?.message ?? "The request failed.",
      error?.details,
    );
  }
  return { data: payload.data, page: payload.page ?? null };
}
