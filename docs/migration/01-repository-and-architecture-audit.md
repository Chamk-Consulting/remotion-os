# 01 · Repository and architecture audit

Status: **Phase 1, read-only. Complete for the source. Incomplete for the target**, because the target repository is not available (see §2 and doc 07).
Audit date: 2026-10-14. Line references `Lnnnnn` are **file line numbers** in `source/Remotion_Desktop.html`.

Labels: **FACT** (verified in code or by running it) · **INFERENCE** · **QUALITY** (assessment) · **RISK** · **UNKNOWN** · **REC** (recommendation).

---

## 1. What was provided

| Item | Path in this audit package | Facts |
|---|---|---|
| Migration brief | (user attachment) | 10 sections. It asks for Phase 1 (audit) and Phase 2 (plan) only, with no application-code changes until approval. |
| Source application | `source/Remotion_Desktop.html` | One file of 6,515,233 bytes and 27,218 lines. SHA-256 `5a452785991220a7e98d4bfacb46696ec92b3825590417dcd541446e8f9ccedd`. |
| Target Next.js repository | **not provided** | No GitHub account is linked to the session (`list_repos` failed: "no GitHub account linked"). No archive was attached. **UNKNOWN → blocker B-01.** |

There are no other assets: no package.json, lockfile, tests, CI, Dockerfile, deployment manifest, env file or documentation (FACT). Only the single HTML file was supplied.

## 2. Repository boundaries

- **Source.** FACT: the whole legacy application is self-contained in one HTML document. Everything is inline: one `<style>` block for the CSS, the markup, and one `<script>` block for the JS. There is no module system, no build output and no source maps.
- **Target.** UNKNOWN. The user's earlier conversations mention a Next.js "Web OS" repository (`omnios`) that hosts the REDaction/Documents app and is described as "the platform and visual authority". This brief instead requires the target to be an **existing Next.js application**. Until it is attached, doc 07 assesses the target conditionally (scenario A: the existing Web OS repo; scenario B: a new Next.js app).
- **Shared packages / design system / backend / auth / deployment infra.** None exist on the source side (FACT). Their existence on the target side is UNKNOWN.

## 3. Physical structure of the source file

| Part | File lines | Size | Notes |
|---|---|---|---|
| Wrapper `<head>` + reset style | L1 | – | `meta charset/viewport`, safe-area padding. Looks like an export wrapper (INFERENCE). |
| `<title>`, Google Fonts `<link>` | L2–L4 | – | Inter 400–700 and Noto Sans Arabic 400–700 |
| CSS (one `<style>`) | L5–L6856 | 759 KB | ≈8,960 rule blocks, 162 custom properties, 136 `@keyframes`, 22 `@container` rules, 22 `prefers-reduced-motion` blocks |
| Static markup | L6857–L7177 | 321 lines | 135 element ids. Wallpaper canvas, shell, top bar, rail, widgets, dock, desktops panel, toast, notification centre, account/keyboard/system menus, on-screen keyboard, shortcuts dialog, palette, lock screen, sign-in, registration, power screen |
| JavaScript (one `<script>`) | L7178–L27216 | 5.72 MB | 20,039 lines. ≈2,212 named `function` declarations. 1.08 MB of it is two base64 blobs (official PDF and DOCX forms, L18962 and L19864). ≈0.6 MB is i18n dictionaries on single lines (L10450, L11054, L11238, L11624, L12310). |
| Boot | L27212–L27215 | – | `window.__aiOn=true; applyLang(lang); drawWall(); if(innerWidth<860) setWs(false)` |

### 3.1 Functional areas inside the script (FACT; each area has its own detailed inventory)

| # | Area | JS lines | CSS lines | Inventory |
|---|---|---|---|---|
| A | OS shell core: i18n, wallpaper, top bar, rail, widgets, dock, virtual desktops, on-screen keyboard, shortcuts, system menu, palette, lock, sign-in, registration, notifications, account, theme | L7178–L10448 | L5–L1737 | `evidence/inventories/01-shell-core.md` |
| B | Remotion AI, free desktop, OS layer (menus, windows, launcher, Files, Terminal), window manager v55, app mode / pop-out v56, full screen | L10449–L12310, L20843–L21067 | L1738–L2603, L5108–L5153 | `02-ai-desktop-os.md` |
| C | Formulaires & Enquêtes (Forms & Surveys) | L12311–L14340 (+ dictionary L12310) | L2604–L3774 | `03-forms.md` |
| D | Documents (clinical document editor, versions v42–v71) | L14341–L20842 | L3775–L5107, L6672–L6807 | `04-documents.md` |
| E | Calculator & scientific tools (v58) | L21068–L22598 | L5154–L5585 | `05-calculator.md` |
| F | Facturation & Revenus (Billing, v61) | L22599–L23823 | L5586–L5848 | `06-billing-hr.md` |
| G | RH & Paie (HR & Payroll, v62–v63) and the shared `hr-*` UI kit | L23824–L24462 | L5849–L6057 | `06-billing-hr.md` |
| H | Healthcare suite: shared foundation + event bus, Patients & Dossiers médicaux, Gestion Calendrier, Gestion Cabinet, Calendar & Planning | L24463–L27216 | L6058–L6671 | `07-healthcare-suite.md` |

## 4. Technology inventory

| Concern | Finding | Label |
|---|---|---|
| Framework | None. Vanilla ES2020+ (optional chaining, BigInt, `structuredClone`-era APIs), no transpilation. | FACT |
| Rendering | HTML template strings assigned to `innerHTML` (497 occurrences on 438 lines), `outerHTML` (46), `insertAdjacentHTML` (25) | FACT |
| Events | Document-level delegated listeners (195 `document.addEventListener`), many in capture phase with `stopImmediatePropagation` ordering, plus 503 `addEventListener` calls in total | FACT |
| Extension mechanism | **Monkey-patching**: at least 252 `{const _x=fn; fn=function(){…_x()…}}` wrappers. For example, `renderDock` is wrapped 10 times and Documents' `dcClick` 26 times. Behaviour depends on script order. | FACT; QUALITY: the main structural migration risk |
| State | Module-level mutable singletons per area (`desks`, `OSW`, `FE`, `DC`, `CA`, `BI`, `HR`, `PA`, `CL`, `CB`, `PL` …) | FACT |
| Persistence | `localStorage` only (40 keys), plus 1 IndexedDB database (`remotion-docs-live`). No server. | FACT (doc 06) |
| Styling | One global stylesheet with per-app class prefixes (`ai-`, `dk-`, `os-`, `al-`, `fm-`, `tm-`, `fe-`, `dc-`, `ca-`, `bi-`, `hr-`, `pa-`, `cl-`, `cb-`, `pl-`). CSS variables for tokens. Light and dark themes via `prefers-color-scheme`, `html.dark` and `[data-theme]`. RTL via `[dir="rtl"]` (128 selectors). | FACT |
| Motion | Web Animations API (`el.animate`, 329 calls), CSS keyframes (136), View Transitions API (theme and language switch). Gated by a user/OS reduced-motion check (`lkRM()`). | FACT |
| i18n | 4 languages: en, fr, de, ar (RTL). Two mechanisms: `I18N` dictionaries with `t(key)` (shell, AI, OS, Forms, Documents), and inline pipe strings `L4("fr\|en\|de\|ar")` (Calculator, Billing, HR, healthcare suite; ≈2,890 call sites). | FACT |
| Third-party code | None bundled. Loaded at runtime from cdnjs **without Subresource Integrity**: pdf.js 3.11.174 (+ worker), mammoth 1.6.0, pdf-lib 1.17.1. Fonts from Google Fonts. | FACT (L14082, L15378, L15379, L18976) |
| Host integration | `window.claude.use("sample")` (LLM sampling for Remotion AI, Forms AI) and `window.claude.use("downloads")` (file saving in Documents). Present only when the page runs inside a Claude artifact host. | FACT (L10588, L10845, L16972). RISK: absent on a normal Next.js deployment |
| Network | Optional user-configured "entities API" (`fetch` with Bearer token, L19624–L19625) in Documents. No other fetch/XHR/WebSocket/SSE. | FACT |
| Build / test / lint / CI | None | FACT |
| Deployment assumptions | Runs as a static file. App mode uses `#app=<key>` on the same URL; pop-out uses `window.open`. | FACT |

## 5. Architecture as implemented

```
index.html (single document)
├─ CSS (global, prefixed per app, tokens on :root)
├─ Static shell markup (top bar, rail, widgets, dock, overlays)
└─ <script> (evaluated top to bottom; order = dependency graph)
   ├─ Shell core ── exposes globals: t, lang, I18N, toast, desks, renderDock, ACTIONS, SC_CATS, pushNc …
   ├─ AI + desktop + OS layer ── "kernel": osWinOpen/OSW (windows), OS_OPEN/OS_DOCK/DK_APPS/AL_APPS (app tables),
   │                             dkOpenX (open chain), osMenu (menus), fsData (virtual FS), alStore (installed apps)
   ├─ Forms ──────────────── registers via OS tables and wrappers; exposes feS/feLoad/feOpenForm, feLoadScript
   ├─ Documents ──────────── uses Forms' feLoadScript + icons; exposes dcSaveFile, DC_KEY
   ├─ Window manager v55/v56 ─ wraps osWinOpen/osFocus/osClose, adds OS_SOLO + #app= boot
   ├─ Calculator ─────────── defines L4 (used by every later app)
   ├─ Billing ────────────── exposes biSt/biSave/biGo/BI_KEY
   ├─ HR ─────────────────── defines the hr-* kit (hrE, hri, hrRM …) reused by the healthcare suite; exposes hrSt
   └─ Healthcare suite ───── shared bus (remotion-bus) + Patients, Calendrier, Cabinet, Planning
```

Key architectural facts:

1. **There is no app registry object.** An app exists as entries in 9 global tables plus 2 hand-maintained key chains (L11857, L20981) plus 3 wrapped functions (`dkOpenX`, `renderDock`, `osRelabel`). Nine apps repeat the same 12-step recipe (inventory 02 §1.4.3).
2. **Cross-app coupling goes through globals and shared storage.**
   - Billing reads Forms (`feS`).
   - Patients reads Forms, Billing and HR.
   - Calendrier writes into Billing's store (L26072–L26074) and reads HR leave (`hrSt()`, L25494).
   - Cabinet and Planning call Calendrier functions under a borrowed role (`cbAsCal` L26130, `plAsCb` L26775).
   - The healthcare suite has a persisted event bus (`remotion-bus`, about 31 event types, 6 consumers, L24472–L24483).
3. **Load-order dependencies.** Some utilities are defined in one app and used by later ones:
   - `L4` is defined in Calculator (L21374).
   - `feLoadScript` is defined in Forms (L14082) and used by Documents.
   - `hrE`/`hri` are defined in HR and called 2,386 and 581 times by the healthcare suite.
4. **Multi-window.** App mode and pop-out re-boot the entire document in a new window with `#app=<key>` (L21038). Windows synchronise through `storage` events per store key.

QUALITY: inside each app, the domain logic is clean and largely pure: integer money, formula engines, state machines, time-zone maths, availability engine, validators. The UI layer is the opposite: string-rendered, layered by patches, with document-global listeners. A migration should **port the domain logic almost unchanged** and **rewrite the UI layer** while keeping the visuals.

## 6. Environment variables and configuration

FACT: there are none in the source. Configuration lives in user-editable stores (for example `dcS.api.url/token` for the entities API, billing configuration and tax sets). The target's environment conventions are UNKNOWN (doc 07).

## 7. Obsolete, deprecated or conflicting elements

| Item | Evidence | Label |
|---|---|---|
| `document.execCommand` for rich text, undo/redo and copy (18 uses) | Documents editor, on-screen keyboard, copy fallbacks | FACT. RISK: deprecated API that a React rich-text editor would replace |
| Runtime CDN script injection without SRI | `feLoadScript` L14082 | FACT. RISK: supply chain |
| Two pdf.js-era libs (mammoth used only by v1 import paths; later importers are in-house) | inventory 04 §7 | FACT |
| Dead code and duplicate implementations (e.g. first `biFormList` L22801 references undefined `feSt`; three HTML escapers; two key chains) | inventories | FACT |
| CSS class collisions between apps (`.dc-h`, `.dc-sep`, `.dc-sw` used by both the desktop context menu and Documents) | L1659–L1679 vs Documents CSS | FACT |

## 8. Runtime baseline (verified by running the source)

Method: Chromium (Playwright, headless) loaded the file from disk at 1440×900, 1024×768 and 390×844, in light and dark, plus each of the 11 standalone apps through `#app=<key>`. The script is `evidence/shoot.js`, the log is `evidence/screenshots/log.json`, and the images are in `evidence/screenshots/`.

| Check | Result |
|---|---|
| Uncaught JS errors at load (15 runs) | **0** (FACT) |
| Failed requests | Google Fonts only (blocked by the audit sandbox's network allowlist, not a source defect). The UI rendered with fallback fonts. |
| Load to first paint | ≈3.5–4.5 s per run, including a 2.5 s settle wait (not a performance measurement) |
| Standalone app boot | 10 of 11 apps boot into app mode. **`#app=hrPeople` boots the whole desktop instead** (defect D-B01: regex `/#app=([a-z]+)/` at L21038 drops capital letters). FACT, confirmed both visually and in code. |
| Mobile 390 px | The shell switches to a phone layout: icon grid, stacked widgets, dock (FACT, screenshot) |

## 9. Counts (repository level)

| Metric | Count | Basis |
|---|---|---|
| Functional areas | 8 (A–H) | §3.1 |
| Window-based apps (`OSW` keys) | 12: `apps` (launcher), `files`, `terminal`, `forms`, `documents`, `calcsci`, `billing`, `hrPeople`, `patients`, `calendar`, `cabinet`, `planning`, plus the Remotion AI slide-over panel | inventory 02 §12 |
| Apps eligible for app mode / pop-out (`OS_SOLO`) | 11 | L20980 |
| Simulated dock/rail apps (toast only) | e.g. telehealth, Keep Flow, connections, meetings, analytics, commerce, browser, pages, mail, photos, media, boards, maps, messages, accounting | inventory 02 §1.4.3 |
| localStorage keys / IndexedDB DBs | 40 / 1 | doc 06 |
| Languages | 4 (1 RTL) | doc 05 |
| Defects recorded across areas | 158 (27 + 20 + 26 + 15 + 22 + 27 + 21) | inventories §13 |

Next: doc 02 (routes and screens).
