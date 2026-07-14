"use client";

import { getEngineAccessToken } from "@/lib/supabase/browser-client";

/**
 * Client for the Go engine (`aurestores-engine`), which backs the admin console.
 *
 * Calls do not reach the engine directly. They go through the same-origin proxy at
 * `src/app/api/engine/[...path]/route.ts`, which forwards the path verbatim — the
 * engine serves plain HTTP, and an HTTPS page may not call http://, so a direct
 * request is blocked as mixed content. Paths below stay written as the engine's
 * own (`/api/v1/...`); only the base changes.
 *
 * Auth still rides on an `Authorization: Bearer` header rather than the Supabase
 * cookie, because the engine only knows how to read a bearer token. The proxy
 * forwards that header untouched.
 */
const ENGINE_URL = "/api/engine";

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
