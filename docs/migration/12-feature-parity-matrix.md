# 12 · Feature parity matrix

Status (updated 2026-10-15, Phase 3 started): **83 PLANNED, 73 IN_PROGRESS, 0 VERIFIED** (counted from the rows after slice 13). A row is VERIFIED only when the React implementation replaces the legacy bridge on the live route and its checks pass.

Original status: Each row was ASSESSED in Phase 1 and has a backlog task (doc 11). No row is IMPLEMENTED or VERIFIED, because no code has been written (Phase 3 has not started).

Status values (brief §6.4): `NOT_ASSESSED · ASSESSED · PLANNED · IN_PROGRESS · IMPLEMENTED · VERIFIED · BLOCKED · APPROVED_DEVIATION`.

Rules:
- A row reaches **VERIFIED** only with evidence from the doc 13 checks: functional E2E, visual diff and golden tests where relevant. Code that compiles is not evidence.
- "Source class" repeats the source behaviour classification (F functional, S simulated, Pa partial, D decorative, B broken, PNV present-not-verified). **The target must reproduce the class**: simulated stays simulated unless the row becomes `APPROVED_DEVIATION`.
- The "Source" column gives file line ranges in `source/Remotion_Desktop.html`. Control-level detail is in `evidence/inventories/`.

## 1. Summary

ASSESSED and PLANNED count every row that has reached that stage (all of them); the other columns count the rows currently at that status. Updated after each slice.

| Area | Rows | ASSESSED | PLANNED | IN_PROGRESS | IMPLEMENTED | VERIFIED | BLOCKED | APPROVED_DEVIATION |
|---|---|---|---|---|---|---|---|---|
| A Shell core | 24 | 24 | 24 | 24 | 0 | 0 | 0 | 0 |
| B AI / desktop / OS / WM | 22 | 22 | 22 | 22 | 0 | 0 | 0 | 0 |
| C Forms & Surveys | 16 | 16 | 16 | 16 | 0 | 0 | 0 | 0 |
| D Documents | 20 | 20 | 20 | 20 | 0 | 0 | 0 | 0 |
| E Calculator | 10 | 10 | 10 | 10 | 0 | 0 | 0 | 0 |
| F Billing | 14 | 14 | 14 | 14 | 0 | 0 | 0 | 0 |
| G HR | 10 | 10 | 10 | 10 | 0 | 0 | 0 | 0 |
| H Healthcare suite | 26 | 26 | 26 | 26 | 0 | 0 | 0 | 0 |
| X Cross-app | 14 | 14 | 14 | 14 | 0 | 0 | 0 | 0 |
| **Total** | **156** | **156** | **156** | **156** | **0** | **0** | **0** | **0** |

Every row depends on blocker B-01 (target repository) before it can move to IN_PROGRESS.

## 2. Matrix

### A · Shell core (24 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-A01 | Boot sequence and boot animation | L9901, L27212 | F | B-05 | IN_PROGRESS | — | — |
| P-A02 | Top bar with progressive compaction (fitTop c1–c10) | L7649 | F | B-05 | IN_PROGRESS | region diff 0.000% (light/dark/ar/mobile); dual-run E2E | — |
| P-A03 | Workspace menu (open at load ≥860 px) | L7618–L7636 | F | B-05 | IN_PROGRESS | dual-run E2E "workspace menu" | U-07 |
| P-A04 | Language menu and animated language switch (VT) | L7638–L7681 | F | B-14 | IN_PROGRESS | dual-run E2E "language switch" | — |
| P-A05 | Light/dark/auto theme with circular reveal | L10412–L10447 | F | B-14 | IN_PROGRESS | dual-run E2E "theme toggle" | — |
| P-A06 | Procedural wallpaper (5 day + 5 night scenes) | L7511–L7593 | F | B-06 | IN_PROGRESS | region diff 0.000% | — |
| P-A07 | Rail (8 items + add) | L7600–L7616 | F/D | B-05 | IN_PROGRESS | dual-run E2E `shell-ai` "sidebar" (rail DOM), `shell-slice1`; region diff 0.000% | — |
| P-A08 | Dock (13 apps + trash) with running/min indicators | L7723–L7742 | F | B-05 | IN_PROGRESS | dual-run E2E `shell-windows` (running / minimised marks), `shell-ai` (calendar date tile); region diff 0.000% | running mark on all window apps = approved fix D-B05 |
| P-A09 | Widgets: weather/forecast (static), clock (Africa/Tunis), Today, mini calendar, quick notes, tasks | L7683–L7721, L8376 | S/F/D | B-05 | IN_PROGRESS | dual-run E2E calendar + notes; region diff ≤0.009% | D-A01–A04, D-A26 reproduced |
| P-A10 | Virtual desktops panel (add ≤12, rename, wallpaper, close+undo, HUD, swipe, keyboard) | L7744–L7968 | F | B-07 | IN_PROGRESS | React preview: 4 dual-run E2E (`shell-desktops`) + window minis (`shell-windows`) | — |
| P-A11 | On-screen keyboard (4 layouts + pad, suggestions, accents, float/dock, auto-hide) | L8005–L8386 | F/Pa | B-13 | IN_PROGRESS | dual-run E2E `shell-kb` (7 tests, incl. typing into a bridged app field); visual 4 scenes 0.000% | Ctrl+V partial (kept); D-A30, D-A31 reproduced |
| P-A12 | Keyboard menu (4 views, settings) | L8388–L8521 | F | B-13 | IN_PROGRESS | dual-run E2E `shell-kb`; visual 2 scenes 0.000% | stale views after in-menu changes reproduced (like D-A28) |
| P-A13 | Shortcut catalogue (56 rows) + global handler | L8523–L8606, L9914 | F/D | A-10 | IN_PROGRESS | catalogue extracted from source; dual-run E2E of 27 shortcut steps | 23 rows 'not in preview' (D); D-A09 AltGr risk reproduced |
| P-A14 | Shortcuts dialog + custom shortcut recorder | L8607–L8685 | F | B-12 | IN_PROGRESS | dual-run E2E; visual 3 scenes 0.000% | D-A29 reproduced (recorder closes the panel) |
| P-A15 | System menu (8 views) | L8687–L8798 | F/D | B-12 | IN_PROGRESS | dual-run E2E (views, keys, actions); visual 3 scenes 0.000% | D-A28 reproduced (stale views); lock/restart/shutdown pending B-09 |
| P-A16 | Search / command palette | L8800–L8872 | F | B-12 | IN_PROGRESS | dual-run E2E; visual 2 scenes 0.000% | OSK typing into the palette field covered by `shell-kb` |
| P-A17 | Lock screen: 5 faces, glance, sleep, a11y options, power popover | L8874–L9067 | S/F | B-09 | IN_PROGRESS | dual-run E2E `shell-lock` (3 tests); visual 4 scenes 0.000% | simulated auth (Q-04) kept: any 4+ character password, PIN 1234 |
| P-A18 | Sign-in screen (email/SSO/passkey/providers/gov ID, reset) | L9068–L9252 | S | B-09 | IN_PROGRESS | dual-run E2E `shell-lock` (2 tests); visual 4 scenes 0.000% | "Create one" opens the registration wizard |
| P-A19 | Registration wizard (5 steps + creating/created) | L9254–L9899 | S/F | B-09 | IN_PROGRESS | dual-run E2E `shell-register` (3 tests); visual 4 scenes 0.000% | OTP any 6 digits (S) kept; ported as a typed imperative island (doc 15 slice 9) |
| P-A20 | Power screen (restart/shutdown/sign-out) | L9901–L9912 | S | B-09 | IN_PROGRESS | dual-run E2E `shell-lock` "power"; visual 1 scene 0.000% | includes the shell boot animation (L9901) |
| P-A21 | Notification centre, banners, reminders, pushNc API | L9926–L10197 | F/S | B-10 | IN_PROGRESS | 5 dual-run E2E (`shell-nc`) incl. bridged-app pushNc; visual 4 scenes 0.000% | D-A10 snooze undo reproduced |
| P-A22 | Account menu (status, profile, profiles, accounts, units) | L10199–L10395 | F/S | B-11 | IN_PROGRESS | dual-run E2E "account menu"; visual 3 scenes ≤0.001% | all rows reach real surfaces (sign out, add account → sign-in screen) |
| P-A23 | Auto-away after 5 min | L10401–L10408 | F | B-11 | IN_PROGRESS | ported 1:1 (timer, activity events); no time-travel test yet | — |
| P-A24 | i18n: 4 languages, RTL, 777 keys, t()/nf()/loc() | L7179–L7509 | F | A-07 | IN_PROGRESS | I18N runtime equality (4,528 keys) | D-A21 reproduced |

### B · AI, desktop, OS layer, window manager (22 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-B01 | Remotion AI panel: history, search, filter, rename, delete | L10449–L10790 | F/Pa | C-16 | IN_PROGRESS | React shell (default on `/` since slice 11): dual-run E2E `shell-ai` (history, groups, search highlight, filter, header, max, close / Escape / Ctrl+K, conversation switch); visual 5 scenes 0.000% | D-B25 reproduced (popovers close on open) |
| P-B02 | AI composer: attachments, workspace context, chips, create/more menus | L10734–L10760 | F | C-16 | IN_PROGRESS | dual-run E2E `shell-ai` (attachments text / binary, remove, workspace chip, prompt chips) | create / more menus unreachable in the source (D-B25) |
| P-B03 | AI live answers via window.claude (streaming, stop, error mapping) | L10836–L10882 | F (host) | C-16, D-01 | IN_PROGRESS | ported 1:1 (`window.claude.use("sample")`, streaming, stop, error mapping); without a host model both builds show "aiNoLive" — dual-run E2E | live answers only where the host provides `window.claude` (decision Q-05, default kept) |
| P-B04 | AI scripted demos (prep, form) and canned conversations | L10807–L10835, L10544 | S | C-16 | IN_PROGRESS | dual-run E2E `shell-ai` (prep demo, canned answers, cards, see-more, feedback, task ticks) | sample data (S) |
| P-B05 | VPH form side panel (5 steps, original overlay) | L10895–L11051 | F/S | C-16 | IN_PROGRESS | dual-run E2E `shell-ai` (5 steps, source list tabs, original overlay, validation errors, certification, done); visual French 0.000% | sample document (S) |
| P-B06 | In-chat form card, smart edits regex parser, set_fields tool | L11053–L11235 | F | C-16 | IN_PROGRESS | dual-run E2E `shell-ai` (card, smart edits "poids 72 kg…", "ville: Lyon", validate by message, no-model fallback) | `set_fields` only with a host model; D-B24 reproduced (quick replies inert) |
| P-B07 | Desktop icon layer: grid, selection, rubber band, DnD, keyboard | L11274–L11405 | F | B-08 | IN_PROGRESS | React preview: 6 dual-run E2E (`shell-desktop`), visual 0.001% | — |
| P-B08 | Desktop actions: new, rename, copy/cut/paste, duplicate, move to desktop | L11406–L11458 | F/Pa | B-08 | IN_PROGRESS | dual-run E2E (`shell-desktop`, `shell-menus`) | D-B03 cut, D-B21 reproduced |
| P-B09 | Folder windows, Quick Look, trash window | L11461–L11515 | F | B-08 | IN_PROGRESS | dual-run E2E incl. folder item menu | "Ask AI" pending C-16 |
| P-B10 | Ghost drags (dock/rail/launcher/Files → desktop/folder/trash) | L11517–L11548 | F | B-08 | IN_PROGRESS | dual-run E2E `shell-apps` (dock → desktop, launcher card → folder, Files rows → Files place / desktop / trash), identical DOM + storage | — |
| P-B11 | OS file drop onto desktop | L11550–L11561 | F | B-08 | IN_PROGRESS | dual-run E2E `shell-ai` (dragenter hint + `filedrop`, drop of text + binary files, toast, storage) | — |
| P-B12 | Desktop and item context menus (multi-level) | L11681–L11731, L11861–L11927 | F/S | B-04 | IN_PROGRESS | 7 dual-run E2E (`shell-menus`); 5 visual scenes ≤0.011% | share/download/open-with S; Files/Terminal targets native since slice 10; AI/Settings targets pending B-12/C-16 |
| P-B13 | Window chrome + window manager basics (open genie, focus, min/max/close) | L11805–L11851 | F | B-02 | IN_PROGRESS | dual-run E2E `shell-windows` (chrome, geometry, stacking, dock marks); visual chrome 0.000% | D-B23 reproduced; stacking by z-index (deviation, doc 15) |
| P-B14 | v55: 8-edge resize, snapping, Win+arrows, window menu | L20907–L20960 | F | B-02 | IN_PROGRESS | dual-run E2E (menu rows, halves/quarters, previous size, Win+arrows, drag-snap preview, edge/corner resize) | — |
| P-B15 | v55: windows per desktop/workspace, show on all, move to, desktop minis | L20843–L20906, L20970–L20977 | F | B-02 | IN_PROGRESS | dual-run E2E (desktop switch, minis, move, all desktops, workspaces own desktops, `remotion-ws-desks` identical) | — |
| P-B16 | v56: app mode, pop-out window, pop-up-blocked dialog, #app= boot | L20979–L21039 | F/B | B-03 | IN_PROGRESS | route E2E: 11/11 /apps/* boot incl. hrPeople (bridge); dual-run E2E app mode, solo bar, app menus, pop-out | D-B01 approved fix; pop-out opens `/apps/<key>` |
| P-B17 | v56: full screen app / desktop | L21042–L21067 | F | B-03 | IN_PROGRESS | menu rows + shortcuts ported; Fullscreen API not exercisable headless | — |
| P-B18 | Applications launcher (nav, categories, sort, grid/list, install S) | L11950–L12012 | F/S | B-15 | IN_PROGRESS | dual-run E2E `shell-apps` (views, categories, search, sort, list, favourites, install, both context menus incl. v56 app-mode rows, add to desktop, uninstall); 3 visual scenes 0.000% | D-B07 reproduced; install simulated (S) |
| P-B19 | Files manager (places, crumbs, list/grid, detail, tags, DnD, upload) | L12013–L12250 | F | B-15 | IN_PROGRESS | dual-run E2E `shell-apps` (places, sort, views, selection, detail, rename, new folder, copy / paste, delete + undo, trash, tags, search, history, keyboard, Get info, folders in Files roots); 3 visual scenes 0.000% | upload not exercised by E2E yet |
| P-B20 | Terminal (12 commands, history, completion) | L12252–L12297 | F | B-15 | IN_PROGRESS | dual-run E2E `shell-apps` (all 12 commands, history, Tab completion, desktop / Files / trash effects); 1 visual scene 0.000% | — |
| P-B21 | Sidebar (rail) show/hide + peek | L11929–L11936 | F | B-05 | IN_PROGRESS | dual-run E2E `shell-ai` "sidebar" (Ctrl+B, menu toggle, `remotion-rail` across reloads; the peek button is hidden by the source CSS in both) | — |
| P-B22 | Tray in desktops panel (desktop menu, apps, show desktop, battery, network) | L7783, L11937–L11948 | F/Pa | B-07 | IN_PROGRESS | dual-run E2E "tray desktop menu" | volume = key sound (Pa) |

### C · Forms & Surveys (16 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-C01 | Forms app shell, nav (15 views), header, tabs | L12698–L12730 | F | C-04 | IN_PROGRESS | dual-run E2E `shell-forms` (open, navigation: all 15 views, header, tabs, language); visual fe-editor-light, fe-overview-light, app-forms 0.000% | — |
| P-C02 | Overview and analytics (hard-coded KPIs/series) | L12882–L12900, L14161 | S | C-05 | IN_PROGRESS | dual-run E2E `shell-forms` (overview, analytics); golden `forms-domain` (chart data); visual fe-overview-light, fe-ar-tablet 0.000% | — |
| P-C03 | Form lists (all/mine/shared/category/archive/trash) + search | L12874–L12880 | F | C-04 | IN_PROGRESS | dual-run E2E `shell-forms` (every list, search, open from list) | — |
| P-C04 | Create: blank / template (12) / wizard / AI / import / compose / duplicate | L12985, L14013–L14131 | F/S | C-05 | IN_PROGRESS | dual-run E2E `shell-forms` "create" (blank, template, AI draft, import, compose, duplicate, wizard); golden (every template / kind document, local AI planner) | AI empty draft risk |
| P-C05 | Editor canvas: 80 field types, sections, pages, widths per device | L12530–L12620, L13598–L13710 | F | C-04 | IN_PROGRESS | golden `forms-domain` (every field type: new field, canvas HTML, controls in 4 languages; widths per device); dual-run E2E editor (devices, components, sections, pages) | — |
| P-C06 | Properties panel (field/section/form) incl. type-specific | L12621–L12697, L13890–L13932 | F/Pa | C-04 | IN_PROGRESS | dual-run E2E editor (field / section / form properties, label, required, width) | repeat toggle refresh defect reproduced |
| P-C07 | Drag & drop of components/fields/sections | L13244–L13290 | F | C-04 | IN_PROGRESS | dual-run E2E (component and field drag and drop on the canvas) | — |
| P-C08 | Undo/redo (80) + autosave + Ctrl+S | L12908–L12945 | F | C-04 | IN_PROGRESS | dual-run E2E editor (undo / redo buttons and Ctrl+Z, Ctrl+S, autosave committed on close) | — |
| P-C09 | Formula engine (no eval) + scoring | L13784–L13829 | F | C-03 | IN_PROGRESS | golden `forms-domain` (28 expressions: tokens, trees, references, evaluation, errors; scoring); mutation-checked | — |
| P-C10 | Logic v2 (AND/OR, 9 operators) + page rules + dependency/cycle analysis | L13830–L13842, L13933–L13966 | F/B | C-03 | IN_PROGRESS | golden (9 operators × value shapes, AND / OR, visibility, dependency analysis); dual-run E2E rules tab | BR-04 reproduced/approved |
| P-C11 | Live preview desktop + phone, validation, summary, test submit | L12731–L12842, L13164–L13243, L13973–L14002 | F | C-05 | IN_PROGRESS | dual-run E2E preview (fill, validation, pages, devices, options, test submission); golden (prefill, every control with values, validation on every page of the 8 seeded forms); visual fe-preview-dark 0.000% | — |
| P-C12 | Publish, versions, share (links/tokens/invites), automations | L12843–L12873, L13138–L13163 | S/F | C-05 | IN_PROGRESS | dual-run E2E (publish, versions and restore, share invites and tokens, automations, more menu) | S stays labelled |
| P-C13 | Submissions review (approve/correction/reject, audit) | L14132–L14168 | F/S | C-05 | IN_PROGRESS | dual-run E2E submissions review (filters, open, approve, correction) | — |
| P-C14 | Autofill with provenance + accessibility check | L14169–L14200 | F/D | C-05 | IN_PROGRESS | golden (autofill from profile / record / pasted text, accessibility check); dual-run E2E (autofill, a11y in preview) | — |
| P-C15 | Reusable blocks, favourites, recents, copy/paste fields | L13843–L13880 | F | C-05 | IN_PROGRESS | dual-run E2E editor (reusable blocks, favourites filter, component filters); create from blocks | — |
| P-C16 | Import JSON/CSV/PDF/DOCX (pdf.js, mammoth) | L14058–L14102 | F/B | C-05, D-02 | IN_PROGRESS | dual-run E2E import (CSV / JSON tabs); golden CSV parsing and type guessing (pdf.js / mammoth loaders kept, not exercised offline) | BR-02 id remap defect |

### D · Documents (20 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-D01 | Library views (overview + 9 lists + by domain) | L15175–L15226 | F | C-07 | IN_PROGRESS | dual-run E2E `shell-documents` "library" (11 views, template fields, search, open); visual dc-library-dark 0.000% | — |
| P-D02 | Template gallery: 16 essentials, 80 health, 16 professional, 4 official PDF, 3 Word | L14541–L14573, L15786–L15978, L17291–L17411 | F | C-07 | IN_PROGRESS | golden `documents-domain` (every template document: 16 essentials, the bundled gallery, every field-document family and variant); dual-run E2E (gallery, preview, use a template, exact Word form); visual dc-templates-fr 0.000% | U-05 |
| P-D03 | Editor header, ribbon (8 tabs), status bar | L14652–L14708 | F | C-07 | IN_PROGRESS | dual-run E2E "editor" (8 ribbon tabs, status bar); visual dc-editor-light, dc-insert-light, app-documents 0.000% | — |
| P-D04 | Pages / Plan pane with drag reorder | L15421–L15493, L17064–L17156 | F | C-07 | IN_PROGRESS | dual-run E2E "editor" (pages / plan, grid / list, add, move, duplicate pages) | — |
| P-D05 | Canvas: block rendering, contentEditable editing, selection, toolbar states | L14588–L14636, L14828–L14861 | F | C-07 | IN_PROGRESS | dual-run E2E "editor" (selection, view modes page / read / web, zoom, block duplicate / delete, undo / redo / Ctrl+Z); table cell editing | — |
| P-D06 | Block library (90 entries) + properties (General/Display/Condition) | L14409–L14425, L14709–L14772 | F | C-07 | IN_PROGRESS | golden (every insertable block type); dual-run E2E (component panel, properties general / display / condition) | — |
| P-D07 | Real pagination (v44) + columns layout | L16363–L16448, L18867–L18937 | F | C-07 | IN_PROGRESS | dual-run E2E view modes and page thumbnails; visual dc-ar-tablet (read view) 0.000% | — |
| P-D08 | Tables: formulas, cell selection, merge/split, paste, resize | L15576–L15661, L18778–L18866 | F/B | C-06 | IN_PROGRESS | golden (table formulas: SUM, AVERAGE, MAX, IF, errors; mutation-checked); dual-run E2E table cell editing | BR-05 reproduced |
| P-D09 | Charts (12+ kinds) + themes/palettes | L18064–L18239, L18526–L18631, L18721–L18777 | F | C-07 | IN_PROGRESS | dual-run E2E (chart components added); golden (block text and statistics for every chart in the templates) | — |
| P-D10 | Comments, history (versions), assistant (rule-based) drawers | L15277–L15340 | F/S | C-07 | IN_PROGRESS | dual-run E2E "comments, versions" (new comment, resolve, named version, restore) and the AI assistant drawer | — |
| P-D11 | Find & replace | L17412–L17480 | F | C-07 | IN_PROGRESS | dual-run E2E find and replace (matches, navigation, case, replace one / all) | — |
| P-D12 | Quality checker | L17481–L17575 | F | C-07 | IN_PROGRESS | golden (quality check on every template document); dual-run E2E quality drawer | — |
| P-D13 | Multi-person signing + certificate | L18240–L18452 | F/S | C-07 | IN_PROGRESS | dual-run E2E signing (set-up, signers, request review, approve, in-person signature on the pad, lock) | legal value S |
| P-D14 | Export: 15 formats + print centre | L16449–L17063, L19507–L19581 | F/Pa | C-06, C-07 | IN_PROGRESS | dual-run E2E export (menu, dialog with every format's preview, Markdown download compared, exact-Word DOCX download); approved fix D-D04 test (Ctrl+P only when Documents is in front) | print centre entry D-D05 reproduced; D-D04 fixed (approved) |
| P-D15 | Import v2 (25 extensions) + review v70 | L17576–L18063, L20023–L20232 | PNV | C-06 | IN_PROGRESS | golden (bundled engine: Markdown both ways, plain text, HTML import); dual-run E2E import entry points | U-04 fidelity |
| P-D16 | Exact PDF forms (pdf-lib) | L18963–L19169 | F | C-08 | IN_PROGRESS | dual-run E2E (exact form documents open and export); typed exact-form model | — |
| P-D17 | Word-exact documents | L19170–L19506, L19865–L20022 | F | C-08 | IN_PROGRESS | dual-run E2E (official VPH Word form opened page for page, its gallery previews and DOCX export) | — |
| P-D18 | Open as is (IndexedDB) + save back to Word | L20233–L20842 | F | C-08 | IN_PROGRESS | ported with the IndexedDB store; structural check only (no fixture file in the suites yet) | — |
| P-D19 | Entities directory + optional API source | L19582–L19675 | F | C-07, D-03 | IN_PROGRESS | golden (entity fields `e.*`); typed entity model | token plaintext (R-23) |
| P-D20 | Generic building blocks (lists, cover, letter header, stamp, QR…) | L19676–L19849 | F | C-07 | IN_PROGRESS | golden (every building-block type, incl. stamp, QR code, cover page) | — |

### E · Calculator (10 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-E01 | Engine: tokenizer, Pratt parser, evaluator (no eval) | L21068–L21267 | F | C-01 | IN_PROGRESS | golden `calculator-domain` (73 expressions × 3 angle modes, both sides evaluated from the source); dual-run E2E `shell-calculator` (quick calculation, scientific) | — |
| P-E02 | Units registry (34 categories, 291 units) + constants (30) | L21268–L21372 | F/B | C-01 | IN_PROGRESS | golden: every conversion in all 34 categories (3 values per unit pair) and all constants equal the source; E2E converters and unit expressions | D-E01, D-E02 reproduced (golden and E2E) |
| P-E03 | Shell: nav, search, home, history, favourites, settings | L21373–L21610 | F | C-02 | IN_PROGRESS | dual-run E2E `shell-calculator` (navigation, sections, search, keyboard, history panel, angle, favourites, quick calculation, settings); visual `ca-home-light`, `app-calcsci` 0.000% | — |
| P-E04 | 80 generic tools (math, science, engineering, finance, dates, programmer, specialised) | L21701–L22563 | F | C-01, C-02 | IN_PROGRESS | golden: every generic tool run with defaults, examples and every select / segment option (> 300 runs) and date edge cases equal the source; E2E generic tools (fields, units, segments, keep, CSV) | 80/80 executed in both builds |
| P-E05 | Standard calculator (memory, tape, keyboard) | L21965–L22001 | F | C-02 | IN_PROGRESS | dual-run E2E (keypad, percent, memory, repeat =, errors, tape, keyboard incl. Ctrl chords, copy); visual `ca-std-dark` 0.000% | D-E14 shortcut hijack reproduced |
| P-E06 | Scientific calculator + variables | L22002–L22034 | F/Pa | C-02 | IN_PROGRESS | dual-run E2E (functions, 2nd / hyp, preview, evaluate, error caret, STO with reserved name, variables, units) | D-E06 reproduced (`max(1,2)` in comma locales) |
| P-E07 | Graph (pan/zoom) + expression editor (highlight, autocomplete) | L22035–L22108 | F | C-02 | IN_PROGRESS | dual-run E2E graph (functions, window, zoom, fit, reset, wheel, drag, hover, zeros, plotted SVG compared) and editor (sample, results, errors, autocomplete, reference, toolbar, export, save); visual `ca-graph-light` 0.000% | — |
| P-E08 | Converters + constants library + unit-aware expressions | L22109–L22216 | F | C-02 | IN_PROGRESS | dual-run E2E converters (value, picker search / keyboard, swap, shortcuts, favourites, precision, keep) and library (constants, custom constants, unit expressions); visual `ca-ar-tablet` 0.000% | D-E02 reproduced |
| P-E09 | Programmer calculator | L22217–L22247 | F | C-02 | IN_PROGRESS | dual-run E2E library test (value, base, width, signed, operation, bits, invalid input) | — |
| P-E10 | Backup/restore JSON + history exports | L22522–L22563 | F/Pa | C-02 | IN_PROGRESS | dual-run E2E settings (every select, custom units, variables, export, import, reset) incl. a crafted backup | D-E11 reproduced; **D-E13 approved fix applied** (source injects markup at all three sites, port at none) |

### F · Billing (14 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-F01 | Domain: integer money, taxes (bp), totals, rounding | L22606–L22661 | F | C-10 | IN_PROGRESS | native (`src/apps/billing/billing.ts`, structural AST check against the source: only documented edits); unit `billing-store` (rounding, money parsing, line / VAT totals); dual-run E2E `shell-billing` compares DOM and `remotion-billing` after every step | — |
| P-F02 | Invoice lifecycle + gap-free numbering + snapshots | L22676–L22748 | F | C-10 | IN_PROGRESS | dual-run E2E `shell-billing` "editor" (issue checklist, number F-2026-00238, snapshot) and "catalogue" (numbering prefix change) | — |
| P-F03 | Payments (allocations, idempotency, statuses) | L22749–L22770 | F | C-10 | IN_PROGRESS | dual-run E2E `shell-billing` "payments" (record with allocation, reversal, receipt drawer) | — |
| P-F04 | Quotes, credit notes, corrections, recurring | L22771–L22783, L22742 | F/B | C-10 | IN_PROGRESS | dual-run E2E `shell-billing` "editor" (credit note with required reason, correction = credit note + new draft); "navigation" (quotes, recurring pages) | D-F02 VAT reproduced |
| P-F05 | Appointments → draft invoice (incl. no-show) | L22783–L22790 | F | C-10 | IN_PROGRESS | dual-run E2E `shell-billing` "navigation" (appointments to bill page); seed drafts from appointments compared through `remotion-billing` | D-F03 reproduced |
| P-F06 | Reporting (facts, receivables, aging, allocation) | L22804–L22831 | F | C-10 | IN_PROGRESS | dual-run E2E `shell-billing` "reports" (periods, previous period, breakdowns, outstanding by party, allocation basis) | — |
| P-F07 | Simulated roles (5) / permissions (20) with role switcher | L22684–L22697 | S | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "navigation" (role menu, practitioner and front-desk views, simulated practitioner) | — |
| P-F08 | Shell, router (36 pages), tables, filters, drawer, search | L22916–L23146 | F | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "navigation" (all 30 pages, nav groups, back stack, global search + keyboard) and "invoices" (filters, sort, columns, pages, selection, bulk, saved views, CSV download); visual `bi-invoices-dark` 0.000% | — |
| P-F09 | Invoice renderer (A4), list, drawer, split-screen editor (7 steps) | L23147–L23296 | F | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "editor" (7-step editor, lines from services, free line, discounts menu, notes); visual `bi-drawer-light` (A4 preview with `bi-doc-css`) and `bi-editor-fr` 0.000% | — |
| P-F10 | Dashboard, activity, revenue analytics, outstanding | L23410–L23546 | F/Pa | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "reports" and "open"; visual `bi-dash-light`, `bi-ar-tablet` 0.000% | D-F04 reproduced |
| P-F11 | Payments pages: record, transactions, partial, refunds, methods, reconciliation | L23547–L23649 | F | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "payments" (record, transactions menu, refunds status + dialog, reconciliation confirm-all, bank CSV import, partial payments, methods toggle) | — |
| P-F12 | Catalogue: services, pricing, packages, discounts, taxes, payers | L23661–L23729 | F | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "catalogue" (service dialog incl. linked-form tab, validation error, pricing rule, package, discount, tax verification, payers) | — |
| P-F13 | Template designer, configuration, numbering, legal, terms, audit | L23730–L23788 | F | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "catalogue" (template designer: switch, block toggle and move; numbering; legal; terms; settings currency; audit filter) | — |
| P-F14 | Integrations page (7 static cards) | L23776 | D | C-11 | IN_PROGRESS | dual-run E2E `shell-billing` "catalogue" (integrations page DOM) | — |

### G · HR (10 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-G01 | Domain: model, validation, derived states, mutations + audit | L23824–L23913 | F | C-09 | IN_PROGRESS | native (`src/apps/hr/hr.ts`, structural AST check against the source: only documented edits); dual-run E2E `shell-hr` (5 tests) compares DOM and `remotion-hr` after every step | — |
| P-G02 | Simulated roles (4) / perms (18) + field-level map | L23845–L23860, L23902 | S | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` "roles" (role menu, manager view, administrator nav) | D-G17 leave not gated reproduced |
| P-G03 | Employees list (filters, saved views, density, grouping, columns, bulk) | L24049–L24113, L24443–L24462 | F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` "employees" (search, filters, chips, sort, columns, density, grouping, pages, cards, selection, bulk bar, saved searches); visual 0.000% | — |
| P-G04 | Employee drawer + full profile (7 tabs) | L24117–L24158 | F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` "employee" (drawer, row menu, 6 profile tabs); visual profile dark 0.000% | — |
| P-G05 | Dialogs: edit, amendment, documents, leave request | L24159–L24182 | F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` "employee" (edit, amendment incl. validation error, leave request, document upload, contract dialog) | — |
| P-G06 | Add wizard (8 steps) | L24204–L24237 | F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` (validation error, 8 steps, record created); visual wizard 0.000% | — |
| P-G07 | Import CSV/XLSX (mapping, validation, report) + export | L24238–L24284 | F/B | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` (CSV import: manual mapping, validation, duplicate skipped, error row, report; export dialog) | D-G18, D-G19 reproduced; XLSX via shared `src/lib/zip` |
| P-G08 | Dashboard, directory, contracts, org chart, HR documents | L24348–L24386 | F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` "other pages"; visual dashboard French 0.000% | — |
| P-G09 | Leaves timeline, requests, salaries | L24387–L24405 | F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` "other pages" (leave calendar, request approval, salaries as payroll officer) | — |
| P-G10 | 14 placeholder modules + settings | L24406–L24422 | D/F | C-09 | IN_PROGRESS | dual-run E2E `shell-hr` (3 placeholder modules, settings) | honest placeholders kept |

### H · Healthcare suite (26 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-H01 | Shared foundation: registry of practitioners/services | L24485–L24529 | F | B-18 | IN_PROGRESS | Ported in `src/apps/health/rm.ts` (registry, services, establishments, notification kinds); structural check: one difference (server guard on the storage listener); read by Patients and Calendar in the dual-run tests | —; bus (P-H02) still bridged |
| P-H02 | Event bus remotion-bus (idempotent, retries, catch-up, cross-tab) | L24472–L24483 | F | B-18 | IN_PROGRESS | Native in `src/apps/health/rm.ts` (Patients since slice 14, Calendar, Cabinet, Planning since slice 16; consumers installed at load in the source's order). Golden test `tests/golden/bus-domain.test.ts` runs the source's bus code beside the port: idempotent and keyless emits, dispatch order, done lists, retry schedule (400 ms × 3ⁿ, 3 retries, failure log), catch-up, cross-tab storage delivery, trimming (400 / 600 / 100), stale helper, and every producer call site (type, key); mutation-checked | D-H06, D-H07, D-H18 reproduced |
| P-H03 | Patients: directory, filters, saved views, preview drawer, export | L24909–L24966 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E `shell-patients` "directory" (filters, saved views, preview drawer, export); visual pa-list-light 0.002% | CSV injection (R-24) |
| P-H04 | Patients: registration wizard (8 steps) + duplicate detection | L24967–L25038, L24599–L24616 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "registration wizard" (8 steps to a saved record, duplicate check); visual pa-register-light | — |
| P-H05 | Patients: record frame + Fiche sections (11) | L25039–L25112 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "record" (Fiche sections) | D-H04 reproduced |
| P-H06 | Patients: Dossier médical sections (13), clinical entries, encounters, signing | L25113–L25202 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "clinical" (Dossier médical sections, entries, encounters, signing) | — |
| P-H07 | Patients: documents, consents, care team, relationships | L24644–L24711 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "patient file" (documents, consents, care team, relationships) | — |
| P-H08 | Patients: data quality (duplicates, merge, corrections, completeness) | L25251–L25295, L24720–L24736 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "data quality" (duplicates, merge, corrections); visual pa-dups-fr | — |
| P-H09 | Patients: simulated RBAC + care-team ABAC + break-glass | L24563–L24578 | S | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "data quality / roles / language" (role switch, break-glass) | Q-04/Q-06 |
| P-H10 | Patients: dashboard, archives, document register, forms, settings, audit | L25251–L25315 | F | C-12 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "data quality / roles / language" (dashboard, archives, register, settings, audit); visual pa-dash-dark, pa-ar-tablet | — |
| P-H11 | Calendrier: time-zone maths (DST) | L25434–L25456 | F | C-13 | IN_PROGRESS | golden test `tests/golden/calendar-domain.test.ts` runs the source's own clZ / clDateOf / clTimeOf beside the port (Europe/Paris gaps and folds, 5 zones); dual-run E2E `shell-calendar` (display zone menu) | — |
| P-H12 | Calendrier: availability engine + conflicts | L25493–L25543 | F | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E `shell-calendar` "booking wizard" (real slots, alternatives), "pages" (availability, exceptions, impacted appointments); visual cl-daypr-dark 0.001% | — |
| P-H13 | Calendrier: booking integrity + recurrence + lifecycle | L25544–L25599 | F | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "booking wizard" (single appointment, weekly series of 4, idempotent key), "drawer and lifecycle" (arrival → session → completion, cancel with reason, edit, reschedule, duplicate); golden recurrence keys | — |
| P-H14 | Calendrier: agenda (day/workweek/week/month/list; time/practitioner/room) | L25675–L25786 | F | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "open", "agenda" (day / work week / week / month / list; by time, practitioner, room; filters, mini month, display preferences, keyboard); visual cl-week-light 0.002%, cl-month-fr 0.017% | D-H10, D-H11 reproduced |
| P-H15 | Calendrier: 9-step booking wizard, drawer, drag reschedule | L25787–L25902 | F | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "booking wizard" (9 steps), "drawer and lifecycle", "drag and drop" (15-minute snap, blocked move with alternatives, undo); visual cl-wizard-light 0.002% | — |
| P-H16 | Calendrier: requests, planning, series, availability, resources | L25903–L25958 | F | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "pages" (requests: confirm, decline, link to a patient; planning; series; availability; resources with maintenance) | — |
| P-H17 | Calendrier: notifications outbox (simulated delivery) | L25603–L25613, L25959 | S | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "pages" (outbox filter, simulated provider failure, delivery, retry) | — |
| P-H18 | Calendrier: ICS import/export, sync cards, public booking links + preview | L25614–L25636, L25965–L25989 | F/S | C-13 | IN_PROGRESS | Native (default since slice 16): dual-run E2E "pages" (ICS export compared byte for byte except DTSTAMP, ICS import, booking link creation, public page preview with a request, revoke); golden ICS parser | — |
| P-H19 | Cabinet: dashboard, reception, check-in, walk-in, visit drawer | L26230–L26385 | F | C-14 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E `shell-cabinet` "open", "reception" (tabs, search, check-in with identity check, call, consultation, completion, cancel, walk-in with its conflict check, visit drawer); visual cb-dash-light 0.023%, cb-reception-dark 0.005% | — |
| P-H20 | Cabinet: waiting room + public display (privacy-safe) | L26386–L26417 | F | C-14 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E "waiting room and the public display" (display modes); D-H19 reproduced | D-H19 reproduced |
| P-H21 | Cabinet: ops timeline, practitioners, services, rooms & issues | L26418–L26509 | F | C-14 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E "waiting room…, daily operations, practitioners" (operational status menu, practitioner edit), "services, rooms…" (readiness, out of service reported to the Calendar on the bus, issues); visual cb-rooms-fr 0.002% | — |
| P-H22 | Cabinet: admin follow-up, tasks kanban, reports, config, audit | L26510–L26592 | F | C-14 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E "services, rooms…, administrative follow-up, tasks" (checklist, comment, status), "reports…, configuration, audit, roles, language" (CSV export compared, policies, announcements); "Calendar and Patients integration" (drawer link, readiness tags, completion traced in the visit, today's visit in the record) | — |
| P-H23 | Planning: calendar workspace with DnD move/resize, right panel | L26778–L26876, L26967–L26980 | F | C-15 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E `shell-planning` "open", "calendar workspace" (modes, navigation, mini month, filters, search, my calendars, display menu, drawer, context menu, keyboard); visual pl-week-light 0.002%, pl-ar-tablet 0.003% | — |
| P-H24 | Planning: smart booking panel, quick create, internal events | L26877–L26966 | F/Pa | C-15 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E "smart booking panel…" (smart slots, exact time, internal event with conflict notice, reschedule, cancel, check-in) | D-H05 undo reproduced |
| P-H25 | Planning: waiting list with auto-offer | L26751–L26765, L27024–L27035 | F | C-15 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E "secondary views" (waiting list: add, open, book), "roles, language, waiting-list offer…"; visual pl-wait-dark 0.001% | — |
| P-H26 | Planning: secondary views (schedule, list, patients, practitioners, rooms, series, availability, types, integrations, notifications, reports) | L26981–L27079 | F/B | C-15 | IN_PROGRESS | Native (default since slice 16; `?health=legacy` serves the bridge): dual-run E2E "secondary views" (all 12 views, reports CSV compared, notification delivery, Cabinet task from the schedule) | D-H03 approved fix (privacy) |

### X · Cross-app integrations (14 rows)

| ID | Feature | Source | Source class | Target task | Status | Verification evidence | Outstanding |
|---|---|---|---|---|---|---|---|
| P-X01 | X-01 Calendrier completed/no-show → Billing to-bill | L26071–L26074 | F | C-13, C-11 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-01" (complete and no-show in Calendar, Billing "appointments to bill" page and store); `shell-calendar` "drawer and lifecycle" | — |
| P-X02 | X-02 Cabinet → Calendrier status (borrowed role) | L26130 | F/B | C-14 | IN_PROGRESS | dual-run E2E `shell-cabinet` "reception" (check-in / call / start / finish write the Calendar appointment) and "Calendar and Patients integration" (reception stage in the Calendar drawer) | D-H02 approved fix |
| P-X03 | X-03 Cabinet room issue → Calendrier block | L26076–L26077 | F | C-14 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-03" (room out of service in Cabinet → Calendar resources page and agenda); `shell-cabinet` "services, rooms" (issue resolved → block removed) | — |
| P-X04 | X-04 Calendrier cancellation → Planning waiting-list offer | L26764 | F | C-15 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-04" (cancellation in the Calendar with Planning closed → Planning waiting list); `shell-planning` "waiting-list offer" | D-H05 reproduced |
| P-X05 | X-05 HR approved leave → Calendrier availability | L25494 | F | C-09, C-13 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-05" (leave requested and approved in HR → Calendar agenda and availability) | — |
| P-X06 | X-06 HR employees/establishments → healthcare names/sites | L24510, L24519 | F | C-09, B-18 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-06" (employee renamed in HR → Calendar, Cabinet practitioners, Patients care team) | — |
| P-X07 | X-07 Forms → Billing adapter and Patients clinical forms | L23652, L24753, L25250 | F | C-05 | IN_PROGRESS | Billing and Patients read the native Forms app's own store (`src/apps/forms/store.ts` re-exports `feS`, `feLoad` and the walkers from `forms.ts` since slice 18), as the source shares one `feS`; dual-run E2E `shell-billing` "catalogue" (linked-form list and field mapping) and `shell-forms` "Patients opens a form" (native `feOpenForm`, L-14 resolved) | — |
| P-X08 | X-08 Patients balance → Billing | L24752 | F | C-12 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-08" (Patients billing summary, "Open in Billing", a payment in Billing → outstanding €0.00 in the record) | — |
| P-X09 | X-09 Apps → notification centre (pushNc, rmNotify) | L10183, L24522 | F | B-10 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-09" (Calendar cancellation and rescheduling → banners and notification centre rows); `shell-nc` "bridged app notifications" | — |
| P-X10 | X-10 Apps → download service (dcSaveFile / host downloads) | L16972–L16986 | F | B-17, D-01 | IN_PROGRESS | shared `src/lib/download.ts` (dcSaveFile: host downloads when present, otherwise a browser download; non-accepted formats zipped) — used by HR export | Documents (native since slice 19) keeps the source's own copy of the save code (D-D export paths) |
| P-X11 | X-11 Any surface → open any app (dkOpenX chain) | L11862–L11873 | F | B-01T | IN_PROGRESS | In-app chains covered by dual-run E2E: Patients → Calendar (book, open appointment), Calendar → Cabinet (`shell-calendar`, `shell-cabinet`), Planning → Cabinet (`shell-planning`), Patients → Billing (dual-run E2E `shell-integrations` "X-08"); desktop and dock targets (`shell-desktop`, `shell-windows`) | — |
| P-X12 | X-12 Language switch re-labels every app (osRelabel) | L7991, L12300 | F | A-07 | IN_PROGRESS | dual-run E2E: `shell-windows` "language switch relabels windows" and the language step of every native app's suite (HR, Billing, Calculator, Forms, Documents, Patients, Calendar, Cabinet, Planning) | D-B22 reproduced |
| P-X13 | X-13 Pop-out ↔ main window sync (storage events) | L21041 and per app | F | D-05 | IN_PROGRESS | dual-run E2E `shell-integrations` "X-13": a second browser window in app mode (source `#app=calendar`, React `/apps/calendar`) cancels an appointment; the main window's Planning (open) receives it through the storage event and its Calendar repaints; notification store compared | D-H18 reproduced |
| P-X14 | X-14 Quick Look / desktop → Remotion AI with attachment | L11493 | F | C-16 | IN_PROGRESS | dual-run E2E `shell-ai` "entry points" (Ask AI on a document, Quick Look, OS file drop) | — |

## 3. Defect register (165 items, current behaviour recorded, not fixed)

ID scheme: `D-<area><n>`, where `<n>` is the item number in the area inventory's §13 (Billing items 1–16 are `D-F`, HR items 17–27 are `D-G`). Full descriptions with current vs expected behaviour and line evidence are in the inventories.

| Area | IDs | Count | Inventory |
|---|---|---|---|
| A Shell core | D-A01 … D-A31 | 31 | `01-shell-core.md §13` |
| B AI / desktop / OS / WM | D-B01 … D-B26 | 26 | `02-ai-desktop-os.md §13` (+ D-B21 … D-B26 below) |
| C Forms | D-C01 … D-C26 | 26 | `03-forms.md §13` |
| D Documents | D-D01 … D-D18 | 18 | `04-documents.md §13` (+ D-D16 … D-D18 below) |
| E Calculator | D-E01 … D-E23 | 23 | `05-calculator.md §13` (+ D-E23 below) |
| F Billing | D-F01 … D-F16, D-F29 | 17 | `06-billing-hr.md §14 (1–16)` (+ D-F29 below) |
| G HR (+ both apps) | D-G17 … D-G28 | 12 | `06-billing-hr.md §14 (17–27)` |
| H Healthcare | D-H01 … D-H21, D-F30 | 22 | `07-healthcare-suite.md §13` (+ D-F30 below) |
| **Total** | | **175** | |

Default decision (pending Q-03): **reproduce.** The proposed approved-fix set is D-B01, D-B05, D-B06, D-H02, D-H03, D-A22, D-E13 and D-D04 (doc 09 §4). Once approved, the matching rows move to `APPROVED_DEVIATION`.

### 3.0 Defects found during implementation

| ID | Defect | Evidence | Decision |
|---|---|---|---|
| D-B21 | A **mouse** click on an icon-menu row runs after the outside-pointerdown handler (L11405) has cleared the desktop selection, because that handler does not exempt `.os-menu`. Duplicate, Copy, Cut and Delete then do nothing (Open, Rename, Move to, Favourite, Share and Get info use the captured items and still work). Keyboard activation works | L11405, L11921–L11924; dual-run E2E `shell-menus` "mouse no-op" | reproduce (Q-03 c); candidate for an approved fix |
| D-B22 | After a language switch, `osRelabel` relabels the title-bar buttons by index, but the layout button was inserted first: the layout button reads "Minimise", Minimise reads "Maximise/Restore", Maximise reads "Close", and Close keeps the old language. Files and Terminal keep the old window aria-label | L12304, L20940; dual-run E2E "language switch relabels" | reproduce; candidate for an approved fix (accessibility) |
| D-A28 | The system menu renders its views once when it opens; only Appearance is refreshed later. After switching workspace from the menu, the Desktops view still lists the previous workspace's desktops (and other views show the state at opening) | L8752, L8785; dual-run E2E "system menu actions" | reproduce |
| D-A29 | In the shortcuts panel, clicking "Click, then press keys" or a custom row's × re-renders the body inside the click handler; the scrim's outside-click check then sees a detached target and closes the panel, which also stops recording. **Custom shortcuts cannot be recorded** | L8660–L8667, L8656; dual-run E2E "shortcuts panel" | reproduce; **recommended fix** (broken feature) |
| D-B23 | In Chromium, the first click anywhere in a window that is not in front does nothing: focusing re-appends the window to `#shell` during pointerdown and the browser drops the click (also for desktop folder windows) | L11810, L11468; dual-run E2E "close removes the running button"; guard `REPRO_D_B23` in `src/os/windows/stack.ts` | reproduce; **recommended fix** (one-line switch) |
| D-A30 | A stored **fixed** input language with an **automatic** layout (e.g. French + "Automatic") comes back after reload with the QWERTY layout: boot only applies the automatic layout when the keyboard follows the app language (L8041, L7987) | dual-run E2E "stored input language … keeps QWERTY" | reproduce |
| D-A31 | The docked keyboard lifts `.main` so the field stays visible, but measures the field while `.main` is still moving (transition .6s): right after opening or resizing the lift can over- or undershoot, depending on frame timing (L8326–L8336) | dual-run E2E compares the lift only after re-focusing (settled); observed 66–76 px for the same scene in the source | reproduce |
| D-B24 | The quick-reply buttons above the AI message box (`#aiCtx`: "Fill missing fields", "Open full form", "Draft a follow-up email", …) have no click handler: the thread's `[data-qr]` handler is on `#aiThread`, and `#aiCtx` sits in the composer, outside it. Clicking them does nothing | L11161–L11169, L11147; dual-run E2E "prep demo, quick replies" | reproduce (pending) |
| D-B25 | Every Remotion AI popover (conversation filter, Create, More, the conversation's Rename / Delete menu, the form's save menu) closes in the same click that opens it: the panel's own click listener (L10731) sees the new popover and a target outside it. Rename / delete chat, the filter and the Create / More prompts are unreachable by mouse | L10720–L10733; dual-run E2E "popovers" | reproduce (pending) — **recommended fix** |
| D-G28 | With animations on, HR & Payroll opens in its narrow (phone) layout even in a full-size window: `hrSize` reads `getBoundingClientRect()` while the opening animation still scales the window, and the ResizeObserver reads the same scaled box. It stays narrow until the window is resized. With reduced motion it opens in the large layout | L24005, L24425–L24432; reproduced (screenshots of both builds) | reproduce (pending) |
| D-F29 | Same as D-G28 for Billing & Revenue: with animations on, Billing opens in its narrow layout (`data-sz="s"`: navigation hidden behind the menu button, one-step editor) in a full-size window, because `biSize` and the ResizeObserver read the box while the opening animation scales the window. With reduced motion it opens in the large layout | L23009, L23791–L23795; reproduced (both builds measured `s` at 1440 × 900 with animations, `l` with reduced motion) | reproduce; fix together with D-G28 if approved |
| D-B26 | When app mode is already on (standalone boot, `/apps/<app>`), `osAppMode` opens the window before marking it solo, so the app's first render happens in a window hidden by `body.os-appmode .os-win:not(.os-solo)` and every size it measures is 0: the Calendar and Planning agendas stay at the start of the day instead of scrolling to working hours, and Planning starts in its narrow day view | L20991–L20996; found by the slice 16 standalone visual scenes (3–4% before reproduction) | reproduce; `pendingSolo` in `src/os/windows/apps.tsx` / `appmode.tsx` applies solo after the native body's first effects |
| D-E23 | In a Calculator tool page, ticking a checkbox that shows or hides other fields throws `focus is not a function`: the input handler re-renders the form and calls `n?.focus()` where `n` is `""` (a checkbox has no id, so `id&&…` yields the empty string, which optional chaining does not skip). The form is redrawn but the 90 ms recompute is never scheduled, so the result card stays as it was until the next input (e.g. Healthcare maths after “I understand”) | L21602; found while typing the port, confirmed in both builds (page error, unchanged result) | reproduce |
| D-F30 | Gestion Cabinet's live badge (“Up to date · 11:30”) is one text node; the 15-second tick (`cbTick`, L26650) rewrites the badge's last text node with “ · hh:mm”, so the “Up to date” label disappears on the first tick and never comes back until the page is re-rendered. | Found by the slice 16 dual-run test (the label depended on whether the tick had fired); confirmed in the source markup | Reproduced (default); the test compares only the time part |
| D-D16 | The bundled engine's `tableByName` (L15579) falls back to `tablesIn(S.doc)`, but no global `S` exists: a table formula that names a table not in the current document throws a ReferenceError instead of returning `#REF!` | L15579; found while typing the port | reproduce (the name is declared for the compiler only, nothing is emitted) |
| D-D17 | "Open as is" for OpenDocument text: the style resolver `res()` merges paragraph, text, cell, column and table properties but not table-row properties, so `res("table-row",…).r` is always undefined and ODT row heights (`min-row-height` / `row-height`) are never applied | L20499 | reproduce |
| D-D18 | For an exact Word document, the quality check override returns `{lv, msg}` items while the checker counts `x.sev`: the remaining-fields notice is counted under `undefined`, so the badge reads 0 and the item has no rule or key for ignore / go-to | L19982 | reproduce |

### 3.1 Highest-impact defects (for the decision meeting)

| ID | Defect | Impact | Proposed decision |
|---|---|---|---|
| D-H03 | Planning shows patient names to roles without the `appt.details` permission | privacy (PHI) | fix (approved deviation) |
| D-H01, D-D02, D-F13 | Save failures are swallowed while the UI shows "Saved" (quota) | silent data loss | reproduce now, recommend a fix (needs approval) |
| D-F02 | Partial credit notes use VAT-exempt lines | wrong accounting | recommend a fix (needs approval) |
| D-E01 | Negative temperatures are wrong in expressions (−40 °C → −1,023 °F) | wrong result | recommend a fix (needs approval) |
| D-C01 | JSON import breaks rule, score and chart references | broken logic | recommend a fix (needs approval) |
| D-B01 | `#app=hrPeople` boots the desktop | broken feature | fix (free with the manifest) |
| D-H05 | Planning booking "Undo" cancels the appointment, which notifies the patient and offers the slot | side effects | recommend a fix (needs approval) |
| D-G17 | HR leave request has no permission check | authorisation | recommend a fix (needs approval) |
| D-H02 | A borrowed role is persisted to another store | authorisation | fix (removed by the service API) |
| D-A09 | AltGr characters (€, @) may be swallowed by global shortcuts on Windows (INFERENCE) | typing broken for FR/DE users | verify in Phase A, then decide |
