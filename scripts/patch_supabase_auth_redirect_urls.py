#!/usr/bin/env python3
"""
Merge AuraPharma auth redirect URLs into Supabase Auth `uri_allow_list` via Management API.

Requires a Supabase personal access token (Dashboard → Account → Access Tokens).
Either export it in your shell, or add a line to `.env.local` (gitignored):

  SUPABASE_ACCESS_TOKEN=your_pat

Optional:
  export SUPABASE_PROJECT_REF='...'   # else inferred from SUPABASE_URL host (*.supabase.co)
  export EXTRA_AUTH_ORIGINS='https://your-prod.app,https://preview.vercel.app'  # comma-separated origins (no path)

Then:
  python3 scripts/patch_supabase_auth_redirect_urls.py

Include `/auth/recovery` in the allow list so `resetPasswordForEmail` redirect_to
matches Supabase Auth `uri_allow_list` (or add the same full URL in Dashboard →
Authentication → URL Configuration).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


def load_env_files() -> None:
    """Load `.env.local` / `.env` so Cursor/agent runs can pick up SUPABASE_ACCESS_TOKEN without inheriting your shell export."""
    root = Path(__file__).resolve().parent.parent
    for name in (".env.local", ".env"):
        path = root / name
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            if not key or key in os.environ:
                continue
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            os.environ[key] = val


def project_ref() -> str:
    explicit = os.environ.get("SUPABASE_PROJECT_REF", "").strip()
    if explicit:
        return explicit
    url = os.environ.get("SUPABASE_URL", "").strip()
    if url:
        host = urlparse(url).hostname or ""
        if host.endswith(".supabase.co"):
            return host.removesuffix(".supabase.co")
    return "puiogqeosrcellglmyla"

PATHS = (
    "/auth/callback",
    "/auth/recovery",
    "/auth/update-password",
    "/auth/verify-email",
)


def origins_from_env() -> list[str]:
    raw = os.environ.get("EXTRA_AUTH_ORIGINS", "").strip()
    if not raw:
        return []
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def default_local_origins() -> list[str]:
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


def urls_to_add() -> list[str]:
    out: list[str] = []
    for origin in default_local_origins() + origins_from_env():
        for path in PATHS:
            url = f"{origin}{path}"
            if url not in out:
                out.append(url)
    return out


def _curl_json(method: str, url: str, token: str, body: dict | None) -> dict | None:
    """Use curl so macOS/Python SSL store issues do not break Management API calls."""
    cmd = [
        "curl",
        "-fsS",
        url,
        "-H",
        f"Authorization: Bearer {token}",
    ]
    if method == "PATCH" and body is not None:
        cmd.extend(["-X", "PATCH", "-H", "Content-Type: application/json", "-d", json.dumps(body)])
    out = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip() or out.stdout.strip() or f"curl exit {out.returncode}")
    if not out.stdout.strip():
        return None
    return json.loads(out.stdout)


def get_config(token: str, ref: str) -> dict:
    url = f"https://api.supabase.com/v1/projects/{ref}/config/auth"
    data = _curl_json("GET", url, token, None)
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected empty auth config response")
    return data


def patch_uri_allow_list(token: str, ref: str, uri_allow_list: str) -> None:
    url = f"https://api.supabase.com/v1/projects/{ref}/config/auth"
    _curl_json("PATCH", url, token, {"uri_allow_list": uri_allow_list})


def merge_allow_list(existing: str | None, additions: list[str]) -> str:
    current = [u.strip() for u in (existing or "").split(",") if u.strip()]
    seen = set(current)
    for u in additions:
        if u not in seen:
            current.append(u)
            seen.add(u)
    return ",".join(current)


def main() -> int:
    load_env_files()
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        print(
            "Missing SUPABASE_ACCESS_TOKEN.\n"
            "  • Add it to .env.local (recommended for Cursor), or\n"
            "  • export SUPABASE_ACCESS_TOKEN in the same terminal you use to run this script.\n"
            "Create a token: https://supabase.com/dashboard/account/tokens",
            file=sys.stderr,
        )
        return 1

    ref = project_ref()
    add = urls_to_add()

    try:
        cfg = get_config(token, ref)
    except (RuntimeError, json.JSONDecodeError, OSError) as e:
        print(f"GET auth config failed: {e}", file=sys.stderr)
        return 1

    merged = merge_allow_list(cfg.get("uri_allow_list"), add)
    print("Adding (if missing):", *add, sep="\n  ")
    print("New uri_allow_list length:", len(merged.split(",")))

    try:
        patch_uri_allow_list(token, ref, merged)
    except (RuntimeError, json.JSONDecodeError, OSError) as e:
        print(f"PATCH auth config failed: {e}", file=sys.stderr)
        return 1

    print("Updated Supabase Auth redirect allow list for project", ref)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
