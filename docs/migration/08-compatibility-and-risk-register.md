# 08 · Compatibility and risk register

Status: **complete for the source side.** Target-side compatibility risks are listed as conditional, because the target is UNKNOWN (doc 07).

Scale: Severity **S1 critical · S2 high · S3 medium · S4 low**. Likelihood **H / M / L**. Ranking = severity first, then likelihood.

---

## 1. Compatibility analysis (brief §4.8)

| # | Topic | Source behaviour (FACT) | Next.js implication | Mitigation |
|---|---|---|---|---|
| C-01 | Static HTML and script initialisation | One script, top-to-bottom; globals hoisted; boot at L27212 | No global script order in React; modules must declare their dependencies | Explicit service modules (i18n, toast, windows, registry, bus) initialised in one `OsProvider` |
| C-02 | Client-only browser APIs | 30+ APIs (doc 06 §3.5) | SSR would crash (`window`, `localStorage`, canvas) | The OS mounts with `next/dynamic(..., {ssr:false})` under a server layout; pure modules stay isomorphic |
| C-03 | Direct DOM manipulation | 497 `innerHTML` (438 lines), 195 document listeners, ≈252 monkey patches | Must become React components and scoped handlers; patches → registries/hooks | ADR-03/04; port app by app with parity tests |
| C-04 | CSS and global-style conflicts | One global sheet, ≈8,960 rules, prefix collisions (`.dc-h`…) | Next.js global CSS ordering by import; Tailwind preflight (if the target uses it) changes defaults | Port the CSS verbatim in source order under `@layer legacy`; import once in the root layout |
| C-05 | Routing and deep links | Only `#app=<key>`, read once | App Router segments | `/apps/[appKey]` + hash compatibility redirect |
| C-06 | Asset paths | Everything inline; two base64 blobs (≈1.08 MB) for official forms | Bundling 1 MB of base64 into JS hurts load | Move the blobs to `/public/forms/*.pdf|docx` (same bytes, checksum-verified) and fetch lazily |
| C-07 | Third-party scripts | cdnjs pdf.js/mammoth/pdf-lib at runtime | CSP and SRI issues; versions drift | npm `pdfjs-dist@3.11.174`, `mammoth@1.6.0`, `pdf-lib@1.17.1` via dynamic `import()`; pdf.js worker served from `/public` |
| C-08 | Event listeners and cleanup | Listeners registered at load, never removed; ResizeObservers leak (Billing D7) | React effects need cleanup; Strict Mode double-mounts | `useEffect` cleanup; idempotent init guards |
| C-09 | Auth and cookies | none (simulated) | Nothing to break; real auth is out of scope | — |
| C-10 | SSR and hydration | n/a | Clock, theme, language, random seeds and `Date.now()` differ between server and client | Render the OS client-only; theme and language set before paint with an inline script equal to the source (`html.dark` / `dir`) |
| C-11 | Caching and stale data | Cross-window via `storage` events; `rev` checks | React state must react to external storage changes | Store subscription to `storage` events (`useSyncExternalStore`) |
| C-12 | Cross-origin and CSP | Entities API fetch; Google Fonts; blob/data URLs; `window.open` | Strict CSP would block inline styles, blob workers and data images | Documented CSP with the required sources (doc 14) |
| C-13 | Dependency conflicts | none in the source | UNKNOWN in the target (React version vs libraries) | Verify after B-01 |
| C-14 | Browser support | View Transitions, CSS Highlight API, `longOffset` Intl, Compression Streams: Chromium-first with fallbacks in code | Same | Keep the fallbacks; test matrix in doc 13 |
| C-15 | `window.claude` host APIs | Live AI and downloads use them | Absent outside the Claude artifact host | Adapter interface: `AiProvider` and `DownloadService`, with the source's own fallbacks as defaults (Q-05) |
| C-16 | Multi-window app mode | `window.open(same URL#app=key)` re-boots the full OS | Same pattern with `/apps/[key]` | Keep; shared stores via storage events |
| C-17 | Rich text with `execCommand` | Documents and on-screen keyboard | Works in React via a `contentEditable` island, but React reconciliation conflicts | Keep a non-React-managed editable island for parity (ADR-09), with a later editor upgrade as a deviation |
| C-18 | DOM-measured pagination | Documents measures after render | Needs `useLayoutEffect`, fonts loaded (`document.fonts.ready`) | Same algorithm in a layout effect |
| C-19 | `document.write` print iframes | Billing, HR, Patients | Works client-side | Keep, or move to a print route later |
| C-20 | Data compatibility with existing users' browsers | 40 keys with demo-reseed-on-mismatch | A new app on a **different origin** starts empty; on the **same origin** it reads existing data | Same keys and shapes; versioned migrations; export/import if the origin changes (doc 14) |

## 2. Risk register (ranked)

| ID | Risk | Sev | Lik | Affected | Mitigation | Verification |
|---|---|---|---|---|---|---|
| R-01 | **Target repository unknown** → plan may conflict with existing architecture/design | S1 | H | all | Resolve B-01; re-run doc 07 | doc 07 rewritten with FACTs |
| R-02 | **Design authority conflict** (source visuals vs Web OS design system) | S1 | M | all UI | Decision Q-01 before Phase B | signed decision in doc 10 |
| R-03 | **Behaviour drift when flattening ≈252 monkey patches** (effective behaviour = last wrapper) | S1 | H | Documents (191), Forms (29), shell/OS | Port the *effective* behaviour per function; golden/E2E parity tests per app before UI rewrite | parity matrix rows VERIFIED with evidence |
| R-04 | **Health data exposure** stays the same or worsens (PHI in localStorage) | S1 | M | Patients, Calendrier, Planning, Forms, Documents, AI | No new client PHI stores; same keys; separate approved security workstream (Q-06) | security checklist doc 13 §6 |
| R-05 | **Silent data loss on quota** (existing defect) carried over | S2 | H | 7 apps | Reproduce as-is unless approved; surface failure as an approved fix (Q-03) | quota test case |
| R-06 | **Cross-app coupling broken by migration order** (X-01…X-14) | S2 | H | healthcare, billing, HR | Migrate shared services first (registry, i18n, notifications, download, bus, HR read API, Forms read API, Billing read API); use the legacy-iframe bridge for unmigrated apps (ADR-02) | cross-app E2E suite |
| R-07 | **Visual regressions** from cascade order, collisions, fonts, portals | S2 | H | all | Verbatim CSS port in order; screenshot diffs per screen and state; fonts loaded | Playwright visual diffs ≤ threshold |
| R-08 | **Live AI unavailable** outside the Claude host | S2 | H | AI, Forms AI, Documents downloads | Adapter + source fallbacks; decision Q-05 | AI journey tests in both modes |
| R-09 | **Domain-logic regressions** (money, tax, numbering, formulas, time zones/DST, availability, duplicate scoring, calculator numerics) | S2 | M | Billing, Calendrier, Patients, Forms, Documents, Calculator | Extract pure modules unchanged; golden tests generated by executing the **source** functions in a Node VM (the Calculator harness already exists) | golden suites green |
| R-10 | **Storage schema incompatibility** → reseed wipes user data | S2 | M | all stores | Keep shapes; add a versioned migrate path instead of reseed only with approval | fixture round-trip tests |
| R-11 | **Rich-text editor and pagination fidelity** | S2 | M | Documents | contentEditable island + same measurement code | document fixture screenshots + exported files compared |
| R-12 | **Import/export format fidelity is UNKNOWN** in the source itself | S2 | M | Documents (25 imports, 15 exports) | Build a fixture corpus; record source outputs as the baseline | binary/structural diffs |
| R-13 | **Performance**: 5.7 MB script today; naive port → large bundles | S3 | M | load time | Code-split per app (`next/dynamic`); move blobs to static files; lazy CDN libs | bundle report, LCP budget |
| R-14 | **Hydration and Strict Mode double effects** (timers, listeners, seeding run twice) | S3 | H | all | Idempotent init; client-only OS | console clean in dev |
| R-15 | **Keyboard shortcut conflicts** in React (layered priority, capture phase) | S3 | M | shell, Documents, Forms, Calculator | Central shortcut service with scopes; tests per combo | shortcut E2E table |
| R-16 | **RTL regressions** (128 selectors + JS mirroring) | S3 | M | all | RTL screenshot set; mirrored-maths unit tests | Arabic suite |
| R-17 | **Accessibility regressions** (or carrying gaps over) | S3 | M | dialogs, menus | Keep existing roles; focus-trap fixes only as approved deviations | axe scans + keyboard tests |
| R-18 | **CDN/supply chain** (no SRI) | S3 | L | imports | Bundle from npm at pinned versions | lockfile review |
| R-19 | **Time-zone hard-coding** (clock `Africa/Tunis`) misread as a requirement | S4 | M | shell | Reproduce; flag as defect D-A03 | — |
| R-20 | **Defects mistaken for intended behaviour** (158 recorded) | S3 | M | all | Defect register with decision per item (Q-03) | register reviewed |
| R-21 | **Scope size**: ≈20,000 dense JS lines, 12 apps, ≈343 screens | S2 | H | schedule | Phased plan with per-app gates; legacy bridge allows partial releases | phase gates |
| R-22 | **Same-origin requirement for data continuity** | S3 | M | existing users | Deploy on the same origin as the current file, or provide export/import | release checklist |
| R-23 | **Entities API token in plaintext** carried over | S3 | M | Documents | Keep (parity); flag to Q-06 | — |
| R-24 | **CSV formula injection** in exports (existing) | S3 | M | Patients, Cabinet, Planning, Billing | Keep unless approved; recommended fix | — |
| R-25 | **Planning privacy leak** of patient names (existing) | S2 | H | Planning | Recommend an approved fix during the migration (it violates the source's own permission model) | permission E2E |
| R-26 | **Borrowed role persisted** (`cbAsCal`, `plAsCb`) | S2 | M | Calendrier, Cabinet, Planning | Recommend an approved fix; the service-API design removes it naturally | — |
| R-27 | **Legacy-bridge iframes** (transition) are heavy (each boots 6.5 MB) and show the legacy chrome | S3 | M | unmigrated apps during transition | Time-box; one legacy frame at a time | perf check |

## 3. Security, privacy, performance, accessibility and maintainability summary

- **Security:** simulated auth and RBAC; secrets and PHI in localStorage; no SRI; unescaped interpolations (shell `a.email` L10306; Calculator import fields); CSV injection; `url()` kept in imported CSS (Documents D13).
- **Privacy:** PHI in 6+ stores and in AI conversation logs (attachment text); workspace context sent to the LLM (names, org, events, tasks).
- **Performance:** single 6.5 MB document; ≈1 MB of base64 parsed at load; every pop-out re-boots everything; undo stacks store full-document JSON (Documents 100 snapshots, Forms 80).
- **Accessibility:** good roles and keyboard support in menus and desktop; dialogs mostly lack focus traps; palette lacks `aria-activedescendant`; launcher nests interactive elements; streaming `aria-live` noise.
- **Maintainability:** monkey-patch layering; 7 dialog implementations; 3 HTML escapers; 2 hand-maintained key chains; i18n split across 2 mechanisms.
