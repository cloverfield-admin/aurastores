# Dashboard app routes

These are normal folders under `src/app/dashboard/` (no hidden route-group names), so they show clearly in the file explorer.

| Path | URL |
|------|-----|
| `page.tsx` | `/dashboard` — network overview |
| `stock/page.tsx` | `/dashboard/stock` |
| `stock/add/page.tsx` | `/dashboard/stock/add` |
| `sales/page.tsx` | `/dashboard/sales` |
| `sales/add/page.tsx` | `/dashboard/sales/add` |
| `insights/page.tsx` | `/dashboard/insights` |
| `pay/page.tsx` | `/dashboard/pay` |
| `onboarding/…` | `/dashboard/onboarding/…` |

Shared UI: root `layout.tsx` wraps everything with `DashboardShell`.
