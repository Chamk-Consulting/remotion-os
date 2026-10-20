# 10 · Migration architecture and decisions

Status: **Phase 2 plan, written for scenario B (new Next.js app).** Scenario A notes are marked **[A]**. Every ADR is **PROPOSED** until the user approves, and must be re-checked after B-01 (doc 07).

Guiding principle: **port domain logic unchanged; rewrite only the UI layer; keep visuals by porting the CSS verbatim; keep storage contracts identical.** This is the least disruptive route that preserves the experience.

---

## 1. Strategy options evaluated (brief §6.1)

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| S1 Big-bang rewrite | Rebuild everything, switch once | Clean | 12 apps and ≈20k dense lines; no partial release; maximum drift risk (R-03, R-21) | ✗ |
| S2 Wrap the legacy file in Next.js (iframe or raw HTML) | Ship the file inside a Next.js page | Instant parity | Not a migration ("no superficial conversion", brief §1) | ✗ as an end state |
| **S3 Incremental strangler with a legacy bridge** | New OS shell + kernel in React first; apps migrated one by one in dependency order; **unmigrated apps open as a window that hosts the legacy file in app mode** (`/legacy/Remotion_Desktop.html#app=<key>`, same origin, so it shares the same localStorage keys and syncs through `storage` events) | Partial releases; parity is testable per app; data stays shared; the brief's "incremental route-by-route" option applied per app | Temporary weight (each legacy frame boots 6.5 MB); legacy chrome visible inside the frame; `hrPeople` cannot use the bridge (D-B01), so HR must be migrated before release or the legacy copy patched (deviation) | **✓ Selected** |

Evidence that the bridge works without modifying the source: `osBootApp` (L21038) boots any lowercase `OS_SOLO` key standalone, and all stores sync across windows through `storage` events (doc 06 §3.4). Removing the bridge is the exit criterion of Phase C.

## 2. Architecture decision records

### ADR-01 · Framework and baseline
Next.js (latest stable at scaffold, ≥15), App Router, React 19, TypeScript `strict`, pnpm, ESLint (next config) and Prettier. **[A]** Use the target's versions and tooling; no upgrades as part of this migration.

### ADR-02 · Rendering model: server layout, client-only OS
- `app/layout.tsx` (server): `<html>`, `next/font` (Inter, Noto Sans Arabic), the global CSS layers, and an inline pre-paint script equivalent to the source. It sets `lang`, `dir`, `html.dark|light` from `remotion-lang` / `remotion-theme` so that the first frame matches.
- `app/page.tsx` and `app/apps/[appKey]/page.tsx` render `<OsRoot mode="desktop|standalone" appKey>` via `next/dynamic(() => import(...), {ssr:false})`.
- No RSC data fetching (there is no backend). Pure domain modules are isomorphic but run on the client.
- Static export (`output:"export"`) stays possible, with `generateStaticParams` for the 11 app keys.

### ADR-03 · Typed app registry (replaces 9 tables, 2 key chains and 3 wrapper chains)
```ts
interface AppManifest {
  key: AppKey;                      // "hrPeople", "calcsci", …
  aliases?: string[];               // "docs", "explorer", "calculator"
  nameKey: string;                  // i18n key (t)
  glyph: { bg: string; svg: string };          // exact source SVG + gradient
  category: LauncherCategory; installedByDefault: boolean;
  placement: { rail?: number; dock?: number; dynamicDock?: boolean; seedShortcut?: { flagKey: string; col: number; row: number } };
  window: { w: (vp) => number; h: (vp) => number; minW: number; minH: number; className: string };
  solo: boolean;                    // app mode / pop-out / app full screen
  storageKeys: string[];            // cross-window sync subscriptions
  load: () => Promise<{ default: ComponentType<AppProps> }>;   // code split
  legacy?: boolean;                 // true → LegacyBridgeWindow until migrated
}
```
A single `openApp(key, {from, mode})` replaces `OS_OPEN`, `dkOpenX`, `OS_DOCK`, `osSoloKey` and the L11857 chain. Simulated apps (telehealth, Keep Flow, …) become manifests with `simulated:true`, which reproduce the "Opened X" toast (parity).

### ADR-04 · Extension points instead of monkey-patching
Each observed patch target becomes an explicit API:

| Patched in source | Target API |
|---|---|
| `renderDock` (×10), `dkOpenX` (×9), `osRelabel` (×9) | registry-driven `<Dock>` and `useI18n()` re-render |
| `gotoDesk/addDesk/closeDesk/setDesks/renderDesks/renderWs` | `desktopStore` actions + `onDesktopChange` subscription |
| `ACTIONS`, `SC_CATS` | `commandRegistry.register()` + `shortcutService` (scoped priorities) |
| `osWinOpen/osFocus/osClose/osMin` wrappers (v55/v56) | `windowStore` with middleware for desktop ownership, app mode and full screen |
| per-app `dcClick` ×26, `dcRibbonHTML` ×9, `feCtl`, `feViewHTML`… | per-app plugin registries (block types, ribbon tabs, importers/exporters, field types) |

Rule: for each function, implement the **effective** behaviour (the last wrapper in source order), proven by tests (R-03).

### ADR-05 · State and persistence: Zustand with identical storage contracts
- One store per source singleton (doc 06 §2), each with `persist` mapped to **exactly the same key and JSON shape** (40 keys + IndexedDB `remotion-docs-live`).
- `storage`-event subscription per store (external changes, legacy bridge, pop-outs).
- Writes debounced with the source's timings (250 / 500 / 900 ms).
- Version handling reproduces the source (accept `v:1`; otherwise current behaviour) until Q-03/Q-06 approve migrations.
- Healthcare bus ported 1:1 as `busService` over `remotion-bus` (same keys, retries, catch-up) so legacy-bridge apps and migrated apps interoperate during transition.
- **[A]** Reuse the target's state library if one exists.

### ADR-06 · Styling: verbatim CSS in cascade layers first
- Split L5–L6856 into area files **in the original order**: `styles/legacy/00-tokens.css` … `styles/legacy/14-healthcare.css`. Import them once from the root layout inside `@layer legacy` (and `@layer legacy-app` for app CSS) to preserve source order.
- Class names stay identical, so React components emit the same classes. This is the cheapest path to pixel parity and keeps the `.dc-h` collision (VP-02) faithfully.
- New component-scoped styles use CSS Modules. **No Tailwind or UI kit during parity phases** (brief §6.1). **[A]** If the target uses Tailwind preflight, load the legacy layers after it and add a scoped reset where diffs show.
- Tokens remain CSS variables, with all three dark-mode selectors (doc 05 §1).

### ADR-07 · Motion: keep the source mechanisms
- Port WAAPI calls as small hooks (`useAnimate(ref)`, `useFlip`), with the same durations and easings, gated by a `useReducedMotion()` equal to `lkRM()` (OS setting OR the lock-screen preference).
- View Transitions for theme and language through a `startViewTransition` helper with the source fallbacks.
- No new animation library unless a specific behaviour (for example `layoutId`-style genie) cannot be reproduced with WAAPI. In that case adopt Motion (Framer Motion) as a documented exception.

### ADR-08 · i18n: keep both source mechanisms behind one provider
- `I18N` dictionaries → `locales/{en,fr,de,ar}/*.json` (777 shell keys + 469 AI/OS + 1,290 `fe_` + 1,839 `dc_` + app packs), loaded per app chunk.
- `L4("fr|en|de|ar")` stays as a helper in phase 1 (≈2,890 call sites). Converting them to keys is a later refactor.
- `t()` keeps the source semantics (EN fallback, then key; first-occurrence placeholder replacement, D-A21 reproduced).
- `dir` and `lang` are set on `<html>`, as in the source.

### ADR-09 · Rich text and DOM-measured features
Documents' contentEditable editing, `execCommand` formatting and DOM-measured pagination stay as **imperative islands** inside React components (refs + `useLayoutEffect`), with the exact source logic ported to TS. Replacing them with TipTap/Lexical is a post-parity deviation.

### ADR-10 · Third-party libraries and assets
- `pdfjs-dist@3.11.174` (worker copied to `/public/pdf.worker.min.js`), `mammoth@1.6.0`, `pdf-lib@1.17.1` via npm, loaded with dynamic `import()` at the same moments as `feLoadScript` today.
- Official forms: decode the two base64 blobs into `/public/official/vph-*.pdf|docx` (byte-identical, SHA-256 recorded) and fetch on demand (Q-11).
- Fonts: `next/font/google` for Inter and Noto Sans Arabic. The document metric fonts (Arimo, Tinos, Cousine, Carlito, Caladea) are self-hosted.

### ADR-11 · Host integrations behind adapters
- `AiProvider`: implementation 1 = `window.claude.use("sample")` when present; implementation 2 = "unavailable", reproducing the source error state. A server LLM route only with Q-05 approval.
- `DownloadService`: `window.claude.use("downloads")` when present, else `<a download>` (the source fallback).
- `EntitiesApiClient`: the same request contract (doc 06 §3.3).

### ADR-12 · Testing architecture
- **Domain golden tests:** run the source functions in a Node VM against fixture inputs, store the outputs as JSON, and assert that the TS ports match them (the Calculator harness already validated 80/80 tools this way).
- **E2E:** Playwright journeys (doc 04) against both the legacy file and the new app, using the same test code through page objects keyed by the same class names.
- **Visual:** Playwright screenshots per screen/state/viewport/theme/direction against the legacy baseline.
- Details are in doc 13.

### ADR-13 · Defect handling
Reproduce by default; fix only the approved set (doc 09 §4). Every fix is logged in doc 12 as `APPROVED_DEVIATION`.

### ADR-14 · Security posture during migration
No new PHI stores, no telemetry, no new network calls, libraries bundled (SRI concern removed), React escaping (removes 2 XSS vectors). Real auth, encryption and server persistence are explicitly **out of scope** (Q-04, Q-06).

## 3. Server vs Client boundaries

| Layer | Component type |
|---|---|
| `app/layout.tsx`, `app/page.tsx`, `app/apps/[appKey]/page.tsx`, `not-found.tsx`, `error.tsx` | Server (static shell, fonts, CSS, pre-paint script) |
| `OsRoot` and everything below (shell, windows, apps) | Client (`"use client"`, `ssr:false`) |
| `packages/domain/*` (pure TS) | Isomorphic, no DOM or `window` |

## 4. Migration mapping (brief §6.2)

| Source | Target |
|---|---|
| Static markup L6857–L7177 | `components/shell/*` React components emitting the same ids and classes |
| Global CSS L5–L6856 | `styles/legacy/*.css` in `@layer`, same order |
| `I18N`, `t`, `L4`, `nf`, `loc` | `lib/i18n/*` + locale JSON |
| Shell singletons | `stores/*` (Zustand, same storage keys) |
| `osWinOpen`/`OSW` + v55/v56 | `components/os/WindowLayer`, `stores/windows.ts`, `lib/os/snap.ts` (pure geometry from L20908–L20926) |
| `OS_*`, `DK_APPS`, `AL_APPS`, chains | `apps/registry.ts` (`AppManifest[]`) |
| `osMenu` | `components/os/Menu` (portal, same classes) |
| `#app=<key>` | `/apps/[appKey]` + hash redirect |
| Each app's `xxOpen` + body builders | `apps/<key>/App.tsx` + `apps/<key>/views/*` |
| Each app's pure functions | `packages/domain/<key>/*` unchanged |
| `localStorage` writes | store `persist` adapters |
| `remotion-bus` | `lib/bus/*` (same contract) |
| `window.claude` | `lib/host/{ai,downloads}.ts` adapters |
| CDN `feLoadScript` | dynamic `import()` of npm packages |
| Base64 blobs | `/public/official/*` |
| Print iframes | `lib/print.ts` (same HTML) |

## 5. Target folder structure (scenario B)

```
remotion-os/
├─ app/ layout.tsx · page.tsx · apps/[appKey]/page.tsx · not-found.tsx · error.tsx
├─ public/ official/ · pdf.worker.min.js · legacy/Remotion_Desktop.html (bridge only, removed at Phase C exit)
├─ styles/legacy/ 00-tokens.css … 14-healthcare.css
├─ src/
│  ├─ os/ OsRoot.tsx · shell/ (TopBar, Rail, Widgets, Dock, DesktopsPanel, Tray, Wallpaper, Palette, NotificationCenter, Keyboard, Menus, Lock, SignIn, Register, Power) · windows/ · desktop/ · menus/ · legacy-bridge/
│  ├─ apps/ registry.ts · ai/ · launcher/ · files/ · terminal/ · forms/ · documents/ · calculator/ · billing/ · hr/ · patients/ · calendar/ · cabinet/ · planning/ · _kit/ (shared hr-* components)
│  ├─ stores/ (one per storage key family)
│  ├─ lib/ i18n/ · motion/ · shortcuts/ · bus/ · host/ · print/ · download/
│  └─ locales/ en/ fr/ de/ ar/
├─ packages/domain/ shell · os · forms · documents · calculator · billing · hr · healthcare  (pure TS + golden tests)
├─ tests/ e2e/ · visual/ · golden/ · fixtures/
└─ plans/migration/html-to-nextjs/ (this documentation)
```

## 6. Implementation sequence (dependency order)

1. **Foundation (A):** scaffold, CSS layers, fonts, i18n, motion, stores with storage contracts, test harnesses, baseline capture.
2. **Shell and kernel (B):** registry, window manager (snap, desktops, workspaces, app mode, pop-out, full screen), menus, desktop layer, dock/rail/top bar, overlays (lock, sign-in, register, power), notifications, palette, keyboard, shortcuts; Launcher, Files, Terminal; **legacy bridge** for all other apps.
3. **Shared services:** download, notifications API, bus, `_kit` (hr-* components), read APIs (Forms, HR, Billing, registry of practitioners/services).
4. **Apps (C), most isolated first:** Calculator → Forms → Documents → HR (needed by healthcare; fixes D-B01) → Billing → Patients → Calendrier → Cabinet → Planning → Remotion AI.
5. **Integrations (D):** AI and download adapters, entities API, pdf.js/mammoth/pdf-lib, ICS, print.
6. **Parity and hardening (E),** then **release (F).**

## 7. Decision summary

| Decision | Status |
|---|---|
| Strategy S3 (incremental + legacy bridge) | PROPOSED, needs Q-08 |
| CSS verbatim in layers; no UI kit | PROPOSED, depends on Q-01 |
| Same storage keys and shapes | PROPOSED |
| Effective-behaviour porting with golden tests | PROPOSED |
| Reproduce defects except the fix set | PROPOSED, needs Q-03 |
| No backend, auth or AI server in scope | PROPOSED, Q-04/05/06 |
| Everything | **Re-validate after B-01** |
