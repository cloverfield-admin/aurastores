function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugify(value: string): string {
  return normalize(value) || "workspace";
}

export function uniqueSlug(value: string): string {
  return `${slugify(value)}-${crypto.randomUUID().slice(0, 8)}`;
}

export function branchCodeFromName(value: string): string {
  const normalized = normalize(value).replace(/-/g, "");
  const prefix = normalized.slice(0, 6).toUpperCase() || "BRANCH";
  return `${prefix}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}
