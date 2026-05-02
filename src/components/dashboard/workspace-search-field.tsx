"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useWorkspaceSearchQuery } from "@/lib/queries/workspace-search";
import type { WorkspaceSearchHit } from "@/lib/repositories/workspace-search/workspace-search.repository";

const DEBOUNCE_MS = 350;

function sectionTitle(kind: WorkspaceSearchHit["kind"]): string {
  switch (kind) {
    case "branch":
      return "Branches";
    case "staff":
      return "Team";
    case "product":
      return "Products";
    default:
      return "";
  }
}

function kindIcon(kind: WorkspaceSearchHit["kind"]): string {
  switch (kind) {
    case "branch":
      return "storefront";
    case "staff":
      return "person";
    case "product":
      return "inventory_2";
    default:
      return "search";
  }
}

type WorkspaceSearchFieldProps = {
  className?: string;
};

export function WorkspaceSearchField({ className }: WorkspaceSearchFieldProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
      setHighlightedIndex(0);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  const searchQuery = useWorkspaceSearchQuery(debouncedQuery);
  const hits = searchQuery.data?.hits ?? [];
  const showPanel = open && debouncedQuery.length >= 2;

  const listActiveIndex =
    !showPanel || hits.length === 0
      ? -1
      : highlightedIndex < 0
        ? 0
        : Math.min(highlightedIndex, hits.length - 1);

  const selectHit = useCallback(
    (hit: WorkspaceSearchHit) => {
      router.push(hit.href);
      setInputValue("");
      setDebouncedQuery("");
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [router],
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) {
      if (event.key === "Escape") {
        setInputValue("");
        setDebouncedQuery("");
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (hits.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => {
        const base = i < 0 ? -1 : i;
        return base < hits.length - 1 ? base + 1 : 0;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => {
        const base = i < 0 ? 0 : i;
        return base <= 0 ? hits.length - 1 : base - 1;
      });
      return;
    }

    if (event.key === "Enter" && listActiveIndex >= 0 && listActiveIndex < hits.length) {
      event.preventDefault();
      const hit = hits[listActiveIndex];
      if (hit) {
        selectHit(hit);
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ""}`}>
      <label className="relative block w-full sm:w-72">
        <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--app-text-faint)]">
          search
        </span>
        <input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search workspace"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="workspace-search-results"
          aria-autocomplete="list"
          className="w-full rounded-full border-0 bg-[var(--app-input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] outline-none ring-1 ring-transparent transition focus:bg-[var(--app-surface)] focus:ring-[var(--app-link-teal)]/25"
        />
      </label>

      {showPanel ? (
        <div
          id="workspace-search-results"
          role="listbox"
          className="aura-card-tint absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-xl border py-2 shadow-lg"
        >
          {searchQuery.isFetching && hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--app-text-muted)]">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--app-text-muted)]">No matches yet.</p>
          ) : (
            hits.map((hit, index) => {
              const prev = hits[index - 1];
              const showHeading = index === 0 || hit.kind !== prev?.kind;
              const active = index === listActiveIndex;
              return (
                <div key={`${hit.kind}-${hit.id}`}>
                  {showHeading ? (
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                      {sectionTitle(hit.kind)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition ${
                      active ? "bg-[var(--app-search-hit-active)]" : "hover:bg-[var(--app-list-hover)]"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectHit(hit)}
                  >
                    <span className="material-symbols-outlined notranslate mt-0.5 text-base text-[var(--app-text-muted)]">
                      {kindIcon(hit.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[var(--app-header-title)]">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="mt-0.5 block truncate text-xs text-[var(--app-text-muted)]">{hit.subtitle}</span>
                      ) : null}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
