# 07 · Target Next.js assessment

Status: **INCOMPLETE. The target repository was not available during the audit (blocker B-01).**

FACT: no repository was attached and no GitHub account is linked to the session (`list_repos` → "no GitHub account linked"). No file of the target was inspected, so **nothing in this document is a FACT about the target.** It defines (1) what must be verified, (2) how each answer changes the plan, and (3) a provisional assessment for the two plausible scenarios.

---

## 1. What must be verified once the repository is attached (checklist)

| # | Question (brief §4.7) | How it will be verified | Impact on plan if… |
|---|---|---|---|
| T-01 | Next.js version; App Router or Pages Router | `package.json`, `app/` vs `pages/` | Pages Router → ADR-02 routes become `pages/apps/[appKey].tsx`; no layouts/RSC |
| T-02 | React and TypeScript versions, `strict` | `package.json`, `tsconfig.json` | React <18.3 → no `useSyncExternalStore`-based stores; TS non-strict → the plan keeps strict only for new modules |
| T-03 | Route structure and layouts | tree of `app/` | An existing OS route → mount the migrated shell there rather than at `/` |
| T-04 | Server/Client Component boundaries | `"use client"` usage | — |
| T-05 | **Existing shared components and design system** | `components/`, `packages/ui`, tokens | **Decisive:** if the Web OS design system is the "visual authority" (the user's earlier statement), there is a direct conflict with this brief's "preserve the source visual identity". → Q-01 |
| T-06 | Styling framework (Tailwind / CSS Modules / CSS-in-JS) and global CSS policy | config files | Tailwind preflight resets would alter source visuals → layer the source CSS *after* preflight or scope it (ADR-06) |
| T-07 | Data-fetching conventions | code | Only relevant to the entities API and future services |
| T-08 | Auth integration (NextAuth/Auth.js, middleware) | `middleware.ts`, auth config | If real auth exists, the simulated lock and sign-in screens must be wired or gated → Q-04 |
| T-09 | API routes / server actions / backend clients | `app/api`, `actions` | A backend could host AI sampling (Q-05) and storage (Q-06) |
| T-10 | State management (Zustand / Redux / Context) | deps | ADR-05 reuses whatever exists |
| T-11 | Error/loading conventions | `error.tsx`, `loading.tsx` | — |
| T-12 | Tests (Vitest/Jest, Playwright/Cypress) | config | ADR-11 reuses them |
| T-13 | Env var conventions (`NEXT_PUBLIC_*`) | `.env.example`, `next.config` | — |
| T-14 | Build, lint, type-check, deploy workflows | `package.json` scripts, CI files, Dockerfile, Vercel config | doc 14 runbook commands |
| T-15 | **Existing OS shell, window manager or app registry** in the target | code search (`window`, `dock`, `registry`, `manifest`) | If the target already has a window manager, the plan changes from "port the source WM" to "map source apps onto the target WM" (reuse rule, brief §4.7) |
| T-16 | Existing versions of the same apps (Documents/REDaction, Forms) in the target | code search | Conflict resolution per app: source vs target implementation → Q-02 |
| T-17 | i18n library | deps | Map `I18N`/`L4` onto it, or keep ADR-08 |
| T-18 | CSP / headers | `next.config`, middleware | pdf.js worker, blob URLs, data-URL images and inline styles need CSP allowances |

Classification to be produced per finding (brief §4.7): *Reusable as-is · Reusable with adaptation · Replaceable with approved equivalent · Missing · Conflicting · Unsafe/unsuitable.*

## 2. Scenario A: the existing "Web OS" Next.js repository (INFERENCE from the user's earlier conversations)

Context the user provided earlier (not verified here):
- They have a Next.js Web OS platform ("omnios") hosting several apps, including REDaction/Documents.
- They described its design system as "the platform and visual authority".
- They planned to turn standalone apps into plug-and-play OS apps that reuse the OS design system, auth and services.

Provisional assessment:

| Source element | Likely classification in scenario A | Reason |
|---|---|---|
| OS shell, window manager, dock, desktops | **Conflicting or reusable with adaptation** | Two OS shells cannot both be "the" shell; one must win (Q-01) |
| App registry | Reusable with adaptation if the target has one | Map the 12 source apps into it |
| Documents | **Conflicting** (a REDaction/Documents app already exists) | Q-02: which implementation survives? |
| Design tokens | Conflicting if target tokens differ | Q-01 |
| Calculator, Billing, HR, Patients, Calendrier, Cabinet, Planning, Forms | Missing → implement | — |

## 3. Scenario B: a new Next.js application dedicated to this migration

Provisional assessment: everything is **Missing → implement**, with no conflicts. Doc 10 is written for scenario B by default, with notes for scenario A. Proposed baseline:

| Concern | Proposal | Rationale |
|---|---|---|
| Framework | Latest stable Next.js at scaffold time (≥15; exact version pinned and recorded in doc 15), App Router, React 19, TypeScript strict | The brief requires idiomatic Next.js for the installed version |
| Package manager | pnpm | — |
| Styling | Source CSS ported as global stylesheets per area under `@layer`, plus CSS Modules for new code; **no Tailwind during parity phases** | Pixel parity (doc 05 VP-01) and "don't introduce UI kits without need" (brief §6.1) |
| State | Zustand (+ `persist` with the **same storage keys and shapes**) | Small; supports external storage events; matches the singleton model |
| Tests | Vitest (domain golden tests), Playwright (E2E + screenshots) | Playwright is already used for the baseline |
| Deployment | Static export (`output: "export"`) is possible because there is no backend → any static host; or `next start` / Docker | doc 14 |

## 4. Current target status summary

| Item | Status |
|---|---|
| Target located | **No (B-01)** |
| Version / router known | UNKNOWN |
| Reusable components identified | 0 (not assessable) |
| Conflicts identified | 2 potential (Q-01 shell/design authority, Q-02 Documents), INFERENCE only |
| Target build/test baseline | UNKNOWN |

**Action required from the user:** attach the target (owner/repo or .zip), or confirm scenario B. This document will then be rewritten with FACT-level findings, and docs 10–14 will be adjusted where marked "scenario A".
