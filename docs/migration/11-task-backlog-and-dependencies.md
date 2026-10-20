# 11 · Task backlog and dependencies

Status: **Phase 2 plan, not started.** No task may begin before approval and the resolution of B-01, B-02 and B-03 (doc 09).

Size scale: S ≤2 days · M 3–5 days · L 1–2 weeks · XL 2–4 weeks (one experienced engineer). Uncertainty is given as ±%.

Paths assume scenario B (doc 10 §5). **[A]** means re-map paths once the target is known.

Task IDs use the phase letter. The first Phase B task is named `B-01T` so it cannot be confused with blocker B-01 (doc 09).

Common acceptance criteria apply to every task unless stated otherwise: `tsc --noEmit`, lint and unit tests pass; no console errors; parity matrix rows updated with evidence (doc 12); no new localStorage keys; no new network calls.

---

## Phase A · Foundation

| ID | Task and purpose | Source | Target | Deps | Features | Acceptance criteria | Tests | Risk / rollback | Size |
|---|---|---|---|---|---|---|---|---|---|
| A-01 | Resolve the target repository and rerun the doc 07 FACT pass | — | doc 07 | B-01 | all | Doc 07 rewritten with FACTs; ADRs confirmed or amended | — | — | S ±50% |
| A-02 | Scaffold the app (scenario B) or a migration branch (A) | — | repo root | A-01 | — | `pnpm build` and `pnpm dev` succeed; strict TS | CI smoke | trivial rollback | S |
| A-03 | Capture the **legacy baseline with real fonts**: screenshots of every screen/state in doc 02 at 1440/1024/390, light/dark, LTR/RTL | file | `tests/visual/baseline/` | A-02 | all | ≥1 image per screen in doc 02 §3; manifest JSON | Playwright | none | M ±30% |
| A-04 | Golden-test harness: run source functions in a Node VM (extend `evidence/` Calculator harness) | file | `tests/golden/harness.ts` | A-02 | domain | Harness evaluates any named source function on a fixture | self-test | — | M |
| A-05 | Split CSS L5–L6856 into ordered area files under `@layer`; import in the root layout | L5–L6856 | `styles/legacy/*` | A-02 | visuals | Concatenated files are byte-identical to the source CSS (excluding layer wrappers) | checksum test | revert import | S |
| A-06 | Root layout: fonts (`next/font`), wrapper reset (L1), pre-paint script (lang/dir/theme) | L1–L4, L7505–L7509, L10414–L10447 | `app/layout.tsx` | A-05 | theme, i18n | First paint matches the source theme and `dir`; no flash | visual | — | S |
| A-07 | i18n provider: dictionaries → locale JSON; `t`, `nf`, `loc`, `L4` with source semantics | L7179–L7509, L10450, L11054, L11238, L11624, L12310, L21374, packs L26670/L27197 | `src/lib/i18n`, `src/locales` | A-02 | 4 languages | Key counts equal the source (777 shell; 3,167 per language on L12310…); EN fallback; golden `t()` cases | unit + golden | — | M ±30% |
| A-08 | Motion utilities: `useReducedMotion` (= `lkRM`), `useAnimate`, `useFlip`, view-transition helper | L8897, L7662, L10428 | `src/lib/motion` | A-02 | motion | Same durations/easings; reduced motion respected | unit | — | S |
| A-09 | Storage layer: typed persist adapters for the 40 keys + IndexedDB, with `storage`-event subscription | doc 06 §1 | `src/stores/_persist.ts` | A-02 | persistence | Round-trip fixtures of every key are byte-stable; cross-tab update test | unit + e2e | never writes when parsing fails | M |
| A-10 | Shortcut service with scopes and priorities (overlay > dialog > menu > app > OS) | L8523–L8685, L9914 | `src/lib/shortcuts` | A-02 | shortcuts | 56-row catalogue reproduced; custom shortcuts load from `remotion-custom-sc` | unit + e2e | — | M |
| A-11 | CI pipeline: typecheck, lint, unit, golden, e2e (sharded), visual | — | CI config | A-02 | — | Green on main | — | — | S **[A]** |

## Phase B · Shell, kernel and shared structure

| ID | Task and purpose | Source | Target | Deps | Features | Acceptance criteria | Tests | Risk / rollback | Size |
|---|---|---|---|---|---|---|---|---|---|
| B-01T | App registry (`AppManifest`) for all 12 window apps + simulated dock/rail apps | inv. 02 §1.4, L7603, L7724, L11241, L11734, L11746, L11807, L11853, L20980 | `src/apps/registry.ts` | A-07 | launch | Every key, alias, glyph, category and placement reproduced; `openApp` covers dock, rail, top bar, desktop, launcher, Files, terminal | unit | — | M |
| B-02 | Window manager: open (genie), focus, min/max/restore, drag, 8-edge resize, snap + preview, Win+arrows, per-desktop/workspace ownership, all-desktops, move-to, minis | L11805–L11851, L20843–L20978 | `src/os/windows/*`, `packages/domain/os/snap.ts` | B-01T, A-08 | J-OS-06 | All interactions in inv. 02 §4.4 #101–113 behave identically | e2e + visual | XL risk; feature-flag per mechanic | XL ±30% |
| B-03 | App mode, pop-out, full screen; `/apps/[appKey]` + `#app=` redirect | L20979–L21067 | `app/apps/[appKey]`, `src/os/appmode` | B-02 | J-OS-07 | 11 keys boot standalone **including hrPeople** (D-B01 fix, approved); blocked-pop-up dialog | e2e | — | M |
| B-04 | Menus (multi-level) and sliding view menus | L11681–L11731, L8452 | `src/os/menus` | A-10 | all context menus | Keyboard and RTL behaviour identical | e2e | — | M |
| B-05 | Top bar (fitTop c1–c10), rail, widgets (weather, clock Africa/Tunis as-is, Today, calendar, notes, tasks), dock (running/min indicators), toast | L7595–L7742, markup | `src/os/shell/*` | B-01T | J-OS-01 | Visual diff within threshold at 3 widths | visual + e2e | — | L |
| B-06 | Wallpaper painter (procedural canvas, day/night scenes) | L7511–L7593 | `packages/domain/shell/wallpaper.ts` + `<Wallpaper>` | A-02 | visuals | Pixel diff at DPR 1 within threshold for 10 scenes | visual | — | S |
| B-07 | Virtual desktops and workspaces (panel, thumbnails, HUD, rename, context menu, swipe, undo) | L7744–L7968, L20844–L20886 | `src/os/desktops/*`, `stores/desktops.ts` | B-02 | J-OS-04, J-OS-05 | Keys `remotion-desks` / `remotion-ws-desks` identical | e2e | — | L |
| B-08 | Desktop layer (grid icons, selection, rubber band, DnD, ghost drags, file drop, folders, Quick Look, trash, view options) | L11237–L11622, L11753–L11803 | `src/os/desktop/*`, `packages/domain/os/grid.ts` | B-07, B-04 | J-OS-16 | Interactions #48–72 identical; Cut defect reproduced | e2e | — | L |
| B-09 | Overlays: lock (5 faces, idle states), sign-in, registration (5 steps), power screens; simulated auth preserved | L8874–L9912 | `src/os/overlays/*` | B-05 | J-OS-08…10 | Simulation rules identical (≥4 chars, PIN 1234, OTP any 6 digits); `inert` background | e2e | Q-04 | L ±25% |
| B-10 | Notification centre, banners, reminders, `pushNc` API | L9926–L10197 | `src/os/notifications/*` | B-05 | J-OS-12, X-09 | Filters, snooze, DND, quiet hours, chime identical | e2e | — | M |
| B-11 | Account menu, org units, statuses, auto-away, profiles | L10199–L10408 | `src/os/account/*` | B-04 | J-OS-15 | — | e2e | — | M |
| B-12 | Command palette, system menu (8 views), shortcuts dialog + recorder | L8687–L8872, L8607–L8685 | `src/os/palette`, `src/os/system` | A-10, B-04 | J-OS-11, J-OS-14 | — | e2e | — | M |
| B-13 | On-screen keyboard (4 layouts + pad, suggestions, accents, float, settings) | L8005–L8521 | `src/os/keyboard/*` | B-05 | J-OS-13 | Typing parity on input/textarea/contentEditable | e2e | — | L |
| B-14 | Language and theme switching with view transitions | L7638–L7681, L7978–L8004, L10412–L10447 | `src/os/i18n-ui` | A-07, A-08 | J-OS-02, J-OS-03 | Staggered panels + circular reveal; RTL | visual | — | S |
| B-15 | Launcher, Files manager + virtual FS, Terminal | L11950–L12297 | `src/apps/{launcher,files,terminal}` | B-02, B-08 | J-OS-17…19 | Interactions #73–100 identical | e2e | — | L |
| B-16 | **Legacy bridge window** for unmigrated apps (same-origin `/legacy/…#app=key` in an `<iframe>` inside an OS window) | file | `src/os/legacy-bridge` | B-02 | all unmigrated apps | Data written in the bridge appears in migrated apps through `storage` events, and vice versa | e2e | heavy; time-boxed | M |
| B-17 | Shared services: `DownloadService`, notifications API, print helper, `_kit` (hr-* components: shell nav, bar, buttons, inputs, table, drawer, dialog with source behaviour, KPI, filters, wizard) | L5849–L6057, `hrE`/`hri`/`hrRM` | `src/apps/_kit`, `src/lib/{download,print}` | B-04 | C9, C6–C8, C10 | Kit storybook pages match the HR screenshots | visual | — | L |
| B-18 | Healthcare bus service (same contract over `remotion-bus`) + shared registry (`remotion-shared`) | L24463–L24529 | `src/lib/bus`, `packages/domain/healthcare/shared` | A-09 | X-01…X-04 | Golden tests on emit/dispatch/retry/catch-up; interop with the legacy bridge | unit + e2e | — | M |

## Phase C · Applications (dependency order)

| ID | Task and purpose | Source | Target | Deps | Features | Acceptance criteria | Tests | Risk / rollback | Size |
|---|---|---|---|---|---|---|---|---|---|
| C-01 | Calculator: engine + units + all 126 registry entries' logic (80 generic tools + custom-page engines) as pure TS | L21068–L21373, L21611–L22563 | `packages/domain/calculator` | A-04 | J-CA-* | Golden outputs equal the source for all 126 entries + curated cases (incl. reproduced D-E01 negative temperature) | golden | — | L ±20% |
| C-02 | Calculator UI (shell, nav, generic tool page, 13 custom pages, history, settings, import/export) | L21373–L22598 | `src/apps/calculator` | C-01, B-17 | J-CA-* | Interaction rows (81) identical; container sizes | e2e + visual | bridge rollback | L |
| C-03 | Forms domain (formula, logic v2, validation, deps/cycles, CSV, table ops, scoring) | inv. 03 §11 | `packages/domain/forms` | A-04 | J-FE-03/04 | Golden equality | golden | — | M |
| C-04 | Forms UI: shell + 15 views + editor (3 panes, 80 field types registry, DnD, properties, undo 80, autosave) | L12311–L13597 + overrides | `src/apps/forms` | C-03, B-17 | J-FE-01/02 | Effective behaviour of 29 overrides reproduced | e2e + visual | XL risk | XL ±30% |
| C-05 | Forms preview/test, rules/versions/share/automations tabs, dialogs (wizard, import, AI, review, autofill, a11y check), templates, blocks | L13598–L14340 | `src/apps/forms/*` | C-04 | J-FE-04…08 | Simulated features stay labelled; import defect reproduced (Q-03) | e2e | — | L |
| C-06 | Documents domain (formula engine, NIR/NISS, PHQ-9/GAD-7, QR, SHA-256, ZIP, PDF writer, all importers/exporters, Word converter, signing state machine, templates data) | inv. 04 §11.3 | `packages/domain/documents` | A-04 | J-DC-* | Golden equality; exported files structurally equal for the fixture corpus | golden + file diffs | U-04 | XL ±40% |
| C-07 | Documents UI: library views, template gallery, editor (header, ribbon 8 tabs, panes, canvas with contentEditable island, right panel, status, find), drawers, dialogs, print centre | L14341–L20842 | `src/apps/documents` | C-06, B-17, A-10 | J-DC-01…08 | 191 patches flattened; visual parity of the sample report pages | e2e + visual | XL risk | XL ±40% |
| C-08 | Documents special kinds: exact PDF forms (pdf-lib), Word-exact, "open as is" (IndexedDB), save back to Word; official files to `/public` | L18963–L20842 | `src/apps/documents/kinds/*` | C-07, D-02 | J-DC-04, J-DC-10 | Byte-identical official files; filled-PDF diff | e2e + file diff | — | L |
| C-09 | HR domain + UI (11 pages, 14 placeholders, wizard, import/export, profile) | L23824–L24462 | `packages/domain/hr`, `src/apps/hr` | B-17 | J-HR-* | Interaction groups (36) identical; `hrSt` read API exposed | golden + e2e | — | L |
| C-10 | Billing domain (money, totals, lifecycle, numbering, payments, pricing, quotes, recurring, reporting, recon) | L22599–L22835 | `packages/domain/billing` | A-04 | J-BI-* | Golden equality (incl. reproduced VAT defect D-F02 unless approved) | golden | — | L |
| C-11 | Billing UI (36 pages, editor, drawers, dialogs, charts, template designer) | L22836–L23823 | `src/apps/billing` | C-10, B-17 | J-BI-* | 70 interaction groups identical | e2e + visual | — | XL ±25% |
| C-12 | Patients domain + UI (11 pages, record with 24 sections, wizard, merge, documents, DQ, audit) | L24530–L25426 | `packages/domain/patients`, `src/apps/patients` | B-18, C-09, C-10, C-05 | J-PA-*, X-06…X-08 | Permissions per simulated role identical; bus events identical | golden + e2e | PHI (R-04) | XL ±25% |
| C-13 | Calendrier domain (time zones/DST, availability, booking integrity, recurrence, conflicts, ICS, links) + UI | L25427–L26098 | `packages/domain/calendar`, `src/apps/calendar` | B-18, C-09, C-12 | J-CL-*, X-01, X-05 | DST fixtures (Europe/Paris) equal the source; billing intake identical | golden + e2e | — | XL ±30% |
| C-14 | Cabinet domain + UI (visits, reception, waiting room + display, ops timeline, tasks, reports) | L26099–L26685 | `src/apps/cabinet` | C-13 | J-CB-*, X-02, X-03 | Borrowed-role persistence removed (D-H02, approved) | e2e | — | L |
| C-15 | Planning domain + UI (calendar DnD/resize, smart booking, waiting list, secondary views) | L26686–L27210 | `src/apps/planning` | C-13, C-14 | J-PL-*, X-04 | Privacy fix D-H03 (approved); undo defect reproduced unless approved | e2e | — | L |
| C-16 | Remotion AI (history, thread, composer, attachments, demos, VPH panel, form card, smart edits, tool calling) | L10449–L11236 | `src/apps/ai` | D-01 | J-AI-* | Demos identical; live path works when the host exists, otherwise shows the source error state | e2e | Q-05 | L |
| C-17 | Remove the legacy bridge | — | — | C-01…C-16 | — | No legacy iframe reachable; `/legacy` deleted | e2e | keep a tag for rollback | S |

## Phase D · Integrations

| ID | Task | Deps | Acceptance criteria | Size |
|---|---|---|---|---|
| D-01 | Host adapters: `AiProvider` (`window.claude.use("sample")` or unavailable), `DownloadService` | A-02 | Both modes tested; source fallbacks reproduced | S |
| D-02 | Bundle pdf.js 3.11.174 (+ worker), mammoth 1.6.0, pdf-lib 1.17.1 from npm; lazy load | A-02 | Same versions; no cdnjs requests | S |
| D-03 | Entities API client (same contract, 8 s timeout, Bearer token from the store) | C-07 | Mock server contract test | S |
| D-04 | ICS import/export, CSV/XLSX import/export, print paths verified across apps | C-09…C-15 | File diffs equal the source | M |
| D-05 | Cross-window sync (storage events) for all stores + bus cross-tab | A-09, B-18 | Pop-out + main window e2e per app | M |

## Phase E · Parity and hardening

| ID | Task | Acceptance criteria | Size |
|---|---|---|---|
| E-01 | Full visual regression pass vs baseline (A-03) | No unexplained diffs above threshold (doc 13 §4) | L |
| E-02 | Responsive pass (390/768/1024/1440/1920 + window-size `data-sz`) | All screens checked | M |
| E-03 | RTL (Arabic) pass | Mirrored behaviour identical | M |
| E-04 | Accessibility pass (axe + keyboard), no regressions vs source | ≤ source violations; approved fixes logged | M |
| E-05 | Performance: bundle split per app, LCP/INP budgets (doc 13 §7) | Budgets met | M |
| E-06 | Security checklist (doc 13 §6) | All items pass | S |
| E-07 | Defect register reconciliation (158 items: reproduced / approved fix) | Each item has a status and evidence | S |

## Phase F · Deployment and release

| ID | Task | Acceptance criteria | Size |
|---|---|---|---|
| F-01 | Production configuration (env, CSP, headers, caching) | doc 14 checklist | S **[A]** |
| F-02 | Build artifact verification (`next build`, static export or server), deep-link and refresh test for `/` and 11 `/apps/*` | All pass | S |
| F-03 | Staging deploy + smoke tests | doc 14 smoke list green | S |
| F-04 | Data-continuity rehearsal (same origin, or export/import) | Fixture data survives | S (Q-07) |
| F-05 | Release runbook + rollback rehearsal | Rollback < 15 min demonstrated | S |

## Dependency graph (critical path)

```
A-01 → A-02 → {A-03, A-04, A-05 → A-06, A-07, A-08, A-09, A-10, A-11}
A-07 → B-01T → B-02 → {B-03, B-07 → B-08, B-15, B-16}
B-04 ← A-10 ;  B-05 ← B-01T ;  B-17 ← B-04 ;  B-18 ← A-09
C-01 → C-02 ; C-03 → C-04 → C-05 ; C-06 → C-07 → C-08
B-17 → C-09 → C-10 → C-11
{B-18, C-09, C-10, C-05} → C-12 → C-13 → C-14 → C-15
D-01 → C-16 ;  all C → C-17 → E-* → F-*
```
Critical path: A-01 → A-02 → A-07 → B-01T → B-02 → B-17 → C-09 → C-12 → C-13 → C-14 → C-15 → C-17 → E → F.

## Effort summary (indicative, ±35%)

| Phase | Tasks | Estimate (engineer-weeks) |
|---|---|---|
| A Foundation | 11 | 4–6 |
| B Shell and kernel | 18 | 14–20 |
| C Applications | 17 | 34–48 |
| D Integrations | 5 | 3–4 |
| E Parity and hardening | 7 | 5–7 |
| F Release | 5 | 1–2 |
| **Total** | **63** | **≈61–87 engineer-weeks** |

The estimates assume one experienced engineer per stream. Phases C and E parallelise across 2–3 engineers once B is done.
