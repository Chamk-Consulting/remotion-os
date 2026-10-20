# 02 · Route and screen inventory

Status: **complete for the source**. Each area's screen list is taken from its inventory (`evidence/inventories/0X-*.md §2`), and those inventories cite every screen to a line. This document consolidates them and adds the migration view: proposed target route, auth, data, states and complexity.

---

## 1. URL routes in the source (FACT)

The source has **one document URL** and **one hash parameter**. There is no path routing, query routing, `history.pushState` or `hashchange` listener. The hash is read once at load (L21038).

| # | URL | Purpose | Auth | Data | Entry | Evidence |
|---|---|---|---|---|---|---|
| R1 | `/<file>.html` | Full OS desktop: shell, desktop and windows | Simulated lock and sign-in overlays; none enforced | All 40 localStorage keys + 1 IndexedDB | Direct open, refresh | L6857, L27212 |
| R2 | `/<file>.html#app=<key>` | **Standalone app mode**: only that app, full window, title `"<App> · Remotion"`, "To desktop" button | Same as R1 | That app's store(s) | `osPopout` (`window.open`), pop-up-blocked dialog link, manual | L21015–L21039 |

Valid `<key>` values (`OS_SOLO`, L20980): `documents`, `forms`, `files`, `terminal`, `calcsci`, `billing`, `hrPeople`, `patients`, `calendar`, `cabinet`, `planning`. Aliases go through `osSoloKey`: `docs→documents`, `explorer→files`, `calculator→calcsci`.

- **Defect D-B01 (FACT, verified in a browser):** `#app=hrPeople` boots the full desktop because the regex is `[a-z]+`.
- Refresh and deep links: refreshing R2 re-boots the same app (FACT). In-app navigation (Billing page, Patient record, Calendar date…) is **not** in the URL and is lost on refresh (FACT: no history API usage, inventory 02 §1.4.4).

## 2. Proposed target routes (REC, details in doc 10)

| Target route | Replaces | Rendering | Notes |
|---|---|---|---|
| `/` | R1 | Server layout + client-only OS (`next/dynamic`, `ssr:false`) | Single OS surface. Windows are client state, not routes, to preserve the window-manager experience |
| `/apps/[appKey]` | R2 `#app=<key>` | Same OS bundle in standalone mode | `appKey` is validated against the manifest, so camelCase works (fixes D-B01) |
| `/apps/[appKey]/[...view]` | (new, optional) | same | Optional deep links into app pages (Billing page id, patient record). Phase E, behind approval (deviation AD-03) |
| `/#app=<key>` compatibility | R2 | client redirect → `/apps/<key>` | Keeps old pop-out links working |

The public booking page (Calendrier) and the waiting-room display (Cabinet) are **in-window previews** in the source (FACT, inventory 07 §2.2/§2.3). They stay that way for parity. Separate public routes are a post-parity product decision (doc 09, U-12).

## 3. Screen inventory by area

Method: a "screen" is any distinct view, page, tab, dialog, drawer, wizard or overlay a user can reach.

| Area | Top-level screens | Sub-screens / dialogs / drawers / menus | Source of truth |
|---|---|---|---|
| A · Shell core | 33 | 37 sub-views, 16 menus/popovers | inv. 01 §2 |
| B · AI, desktop, OS layer, WM | 42 (AI 17, desktop 8, OS 17) | 10 windows/dialogs, 16 menu roots | inv. 02 §2, §12 |
| C · Forms & Surveys | 16 views (15 nav + editor) | 6 editor tabs, 13 panels, 9 modals/drawers, 16 menus | inv. 03 §2 |
| D · Documents | 11 library views + template gallery (5 collections) + editor | 5 drawers, 16 dialogs, 10 menus, 17 dropdowns, 4 document kinds with their own canvases | inv. 04 §2 |
| E · Calculator | 127 screens: Home + 126 registry entries (80 generic tools, 46 custom pages; 13 page types) | 2 dialogs, 2 drawers, 5 popovers | inv. 05 §2 |
| F · Billing | 36 pages (6 groups) | 3 drawers, ≈24 dialogs, 7-step editor, 7 menus | inv. 06 §2.1–2.2 |
| G · HR | 25 page ids (11 real, 14 "in preparation" placeholders) | 1 drawer, ≈20 dialogs, 8-step add wizard, 5-stage import, 7 profile tabs | inv. 06 §2.3–2.5 |
| H · Patients | 11 pages + record with 24 sections | ≈32 dialogs/drawers/menus, 8-step registration wizard | inv. 07 §2.1 |
| H · Gestion Calendrier | 11 pages (agenda: 5 modes × 3 day layouts) | ≈20, 9-step booking wizard, public booking preview | inv. 07 §2.2 |
| H · Gestion Cabinet | 12 pages | ≈16, public waiting-room display | inv. 07 §2.3 |
| H · Calendar & Planning | 13 pages (calendar: 5 modes) | ≈16, 5-section smart booking panel | inv. 07 §2.4 |
| **Total** | **≈343 distinct top-level screens/pages** (127 of them Calculator screens: Home + 126 registry entries) | **≈300 dialogs, drawers, menus and overlays** | — |

INFERENCE: counts are approximate where inventories grouped similar dialogs (marked "≈"). The route matrix alone is **not** the screen inventory: almost every screen sits behind a click inside the single route.

## 4. Route-level matrix (one row per entry surface)

The brief asks for per-route detail. Because the source has one route plus 11 app modes, the matrix is given per **app surface** (what a route maps to). Exhaustive per-screen detail is in the cited inventories.

Legend: Auth = what the source enforces (all simulated). States: L loading · E empty · Er error · S success · PD permission-denied.

| Surface | Entry points | Layout / shell | Auth & permissions (source) | Data / APIs | Main actions → transitions | States present | Responsive | i18n / RTL | Status | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|
| OS desktop (R1) | load; "To desktop" from app mode | Top bar, rail, widgets, dock, desktop layer, windows layer | Lock/sign-in overlays simulated: any ≥4-char password, PIN 1234, any 6-digit OTP (L8916, L8879, L9688) | 11 shell keys + desktop/fs/apps keys | open apps, switch desktops/workspaces, palette, notifications, lock | L (boot anim), E (empty desktop), Er (lockout), S | Phone layout <860 px; top bar compaction c1–c10 | 4 langs, RTL mirrored | Functional | XL |
| Lock screen | Ctrl+Alt+L, menus, idle | overlay, `shell.inert` | simulated (5 faces) | `remotion-lk`, `remotion-acc` | unlock → desktop | L, Er, lockout 30 s, glance, sleep | yes | yes | Functional (simulated auth) | L |
| Sign-in | sign out, add account | overlay | simulated (email, SSO, passkey, providers, gov ID) | `remotion-si`, accounts | sign in → boot | L, Er, lockout, reset done | yes | yes | Functional (simulated) | L |
| Registration (5 steps) | sign-in "Create one" | overlay wizard | simulated verification and org directory | `remotion-accs-extra` | create → open workspace | per-field Er, progress, success | carousel hidden < 1400 px | yes | Functional (simulated) | L |
| Remotion AI panel | top-bar AI, desktop "Ask AI", app `remotionAI` | slide-over dialog | none | `remotion-ai`; **`window.claude.use("sample")`** | chat, demos, VPH form panel | L (thinking), streaming, Er (5 mapped codes), E (no match) | narrow <860, form panel ≥1200 | yes (VPH form FR-only by design) | Functional; live answers host-dependent | L |
| Launcher (`apps`) | top bar Apps, rail, dock, tray | OS window | none | `remotion-apps` | open, install (fake 1.3 s), favourite | E "No apps", installing | yes | yes | Functional (install simulated) | M |
| Files (`files`) | dock, rail, top bar, desktop | OS window | none | `remotion-fs`, desks, trash | navigate, select, DnD, rename, tag, upload | E, no-result | yes | yes | Functional | L |
| Terminal (`terminal`) | dock, desktop menu | OS window | none | virtual FS | 12 commands | "command not found" | yes | partial | Functional | S |
| Forms (`forms`) | dock (dynamic), launcher, desktop, `#app=forms` | `hr`-less own shell `.fe` | none (share/access settings stored, not enforced) | `remotion-forms`; `window.claude`; pdf.js/mammoth CDN | create, edit, preview, publish (simulated), review submissions | E per list, Er validation, test mode, done | container queries | yes | Functional; publish/share/automations simulated | XL |
| Documents (`documents`) | dock, launcher, desktop, `#app=documents` | own shell `.dc` | none (sharing simulated) | `remotion-docs`, `remotion-docs-xp`, `remotion-dc-lvmode`, IndexedDB `remotion-docs-live`; CDN pdf.js/mammoth/pdf-lib; `window.claude.use("downloads")`; optional entities API | create from 119 templates, edit, import 25 types, export 15 formats, sign, print | Saving/All saved, checker, E lists | yes | yes (+document language) | Functional; format fidelity UNKNOWN | XL |
| Calculator (`calcsci`) | dock, launcher, desktop, `#app=calcsci` | own shell `.ca` | none | `remotion-calc` | 126 tools, history, import/export JSON | Er (84 error keys) | container | yes | Functional (80/80 tools ran) | XL |
| Billing (`billing`) | same | `bi-` shell | simulated roles (5 roles / 20 perms, switchable) | `remotion-billing`; reads Forms; written by Calendrier | invoice lifecycle, payments, recon, reports | PD lock page, E, Er card | yes | yes (L4) | Functional | XL |
| HR (`hrPeople`) | same; **`#app=hrPeople` broken (D-B01)** | `hr-` shell | simulated (4 roles / 18 perms + field-level map) | `remotion-hr` | employees CRUD, wizard, import/export, leave | PD, E, Er per page; 14 placeholders | `data-sz` s/m/l | yes | Functional (placeholders honest) | L |
| Patients (`patients`) | same | `hr-` kit | simulated RBAC + care-team ABAC + break-glass | `remotion-patients`, bus | register, record sections, merge, documents | L skeleton 380 ms, E, Er, PD | yes | yes | Functional | XL |
| Calendrier (`calendar`) | same | `hr-` kit | simulated | `remotion-calendar`, bus; writes Billing | booking wizard, drag reschedule, ICS, links | conflicts, E, Er, PD | yes | yes + time zones | Functional (notifications simulated) | XL |
| Cabinet (`cabinet`) | same | `hr-` kit | simulated | `remotion-cabinet`, reads calendar/shared | check-in, waiting room, tasks, reports | live indicator, E, PD | yes | yes | Functional | L |
| Planning (`planning`) | same | `hr-` kit | simulated | `remotion-planning`, reads calendar/cabinet | calendar DnD, smart booking, waiting list | E, conflicts | yes | yes | Functional (privacy defects, doc 08) | L |

## 5. Conditional and hidden screens (must not be lost)

| Hidden screen | How it is reached | Evidence |
|---|---|---|
| Patient record (24 sections) | Only from directory, search, notifications, or other apps' links (`paOpenPatient`) | inv. 07 §2.1 |
| HR full profile | Hidden nav id `profile`, from the employee drawer | inv. 06 §2.3 |
| Billing `editor` | From "New invoice", rows, drafts, appointments to bill | inv. 06 §2.1 |
| Exact-form / Word-exact / "as is" document canvases | Document `kind` set by template or import mode | inv. 04 §2.5 |
| Public booking preview, public waiting-room display | Buttons inside Calendrier/Cabinet | inv. 07 |
| Pop-up-blocked dialog | `window.open` returns null | L21020 |
| Lock glance / sleep / signed-out modes | Idle timers, sign-out | inv. 01 §2 #15 |
| Role- or permission-dependent pages | Each healthcare and business app hides pages per role (`biPageOk`, `hrGo`, `paPageOk`, `clCan`, `cbCan`) | inventories 06, 07 |
| Phone layouts (<860 px) | Viewport | screenshots `mobile-390-light.png` |

## 6. Migration complexity and risk by surface

| Surface | Complexity | Main risk |
|---|---|---|
| OS shell + window manager + registry | XL | 252 monkey-patch extension points must become explicit APIs without behaviour drift |
| Documents | XL | 191 wrapper patches; rich-text `execCommand`; DOM-measured pagination; format fidelity untested |
| Forms | XL | 29 overrides; DnD; formula/logic engines must stay identical |
| Calculator | XL (engine L) | 126 tools; golden-test harness already exists |
| Billing | XL | Money/tax correctness; numbering semantics |
| Patients / Calendrier | XL each | Health-data privacy; DST/time-zone correctness; bus semantics |
| Cabinet / Planning / HR | L each | Shared `hr-*` kit must be extracted first |

Counts used in this document: 2 source URL forms, 11 app-mode keys, ≈343 top-level screens, ≈300 secondary surfaces, 12 window apps, 4 auth overlays (lock, sign-in, registration, power).
