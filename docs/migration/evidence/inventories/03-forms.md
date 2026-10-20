# 03 — "Formulaires & Enquêtes" (Forms & Surveys) — inventory

Source: `source/Remotion_Desktop.html` (read-only). All `Lnnnnn` refer to **file** line numbers.
Labels: **FACT** = read in code end-to-end; **INFERENCE** = deduced from code shape; **RISK** = likely problem; **UNKNOWN** = not determinable from this area.

---

## 1. Scope & line ranges

| Part | Lines | Size | Notes |
|---|---|---|---|
| i18n dictionary (fr/en/de/ar) | L12310 | 542,186 chars, one line | IIFE `const D={fr:{…},en:{…},de:{…},ar:{…}}; for(l in D) Object.assign(I18N[l],D[l])`. Each language has **3,167 keys**: `fe_*` 1,290, `dc_*` 1,839 (Documents app strings live here too), `os_*` 36, `calcsci` 1, `bi_app` 1. No empty `fe_` values in any language (FACT, parsed JSON). |
| Forms JS, v1 core | L12311–L13597 | ~1,290 lines | icons, types, seed data, controls, editor, properties, shell, preview, tabs, views, state/undo, ops, AI v1, publish/menus, preview behaviour, drag & drop, events, keyboard, OS registration |
| Forms JS, extension layers | L13598–L14340 | ~740 lines | Universal registry & domain libraries, presets, body map, ROM, new-type controls, formula engine, logic v2, library panel, copy/paste, reusable blocks, type props, form settings, preview behaviour v2, dialogs, creation modes, wizard, import, AI propose/preview/apply, submissions review, autofill, a11y check, share tokens, domain templates, extra events |
| Total JS (excluding L12310) | L12311–L14340 | 2,030 lines, ~328 k chars | 221 `function fe*` declarations, 33 `const fe*` helpers, **29 monkey-patch overrides** (22 `{const _x0=feX;feX=function…}` wrappers + 7 plain re-assignments: `feCond` L13840, `feCompList` L13847, `feCompsHTML` L13858, `feLogicHTML` L13934, `feRuleText` L13942, `feVisLeaves` L13976, `feAiRun` L14113) |
| CSS | L2604–L3774 | 1,171 lines, ~104 k chars | sections per css_outline: nav L2613, header L2637, tabs L2681, body L2697, stage L2731, field look L2793, drag L2859, AI bar L2868, properties L2888, toast L2938, preview L2946, patient-facing form L2978, preview options L3067, panes L3084, app views L3147, responsive L3209, nested blocks L3314, responsive widths L3343, field widgets L3365, spreadsheet tables L3437, table editor L3451, domain components/dialogs/review L3491, dialogs L3659, AI preview L3714, review L3720 |
| Static markup | none | — | The window body is built at runtime by `feBody()` L12947 and mounted by `osWinOpen("forms",…)` L13583. `markup.html` contains no `fe-` ids. |

Root DOM: `.fe` (grid nav + main) inside `.fe-win` OS window; children `nav.fe-nav`, `.fe-main`, `.fe-scrim[data-fe-close=all]`, `.fe-toast[role=status][aria-live=polite]` (L12949). Modals append `.fe-mback` inside `.fe` (L14006). OS menus (`osMenu`) render in `<body>` (outside the app root).

---

## 2. Screens / views / sub-pages

### 2a. App-level views (left nav `FE_NAV`, L12699; renderer `feViewHTML` L12885, wrapped L14151)

| # | View (`FE.view`) | Entry | Purpose / content | States |
|---|---|---|---|---|
| 1 | `overview` | nav "Vue d'ensemble" | 4 KPI tiles (`feKpis` L12884), "responses/week" bar chart (`feBars` L12882), 5 most recent forms | KPIs/bars are **hard-coded** numbers (248 responses, 87 %, 4 min 20, fixed 14-day series) — Simulated. No empty state for recent list. |
| 2 | `list:all` | nav | Table of non-archived, non-deleted forms (`feListForms` L12875, `feTable` L12878) + search box (`data-lq`) | Empty: `fe_noForms` |
| 3 | `list:mine` | nav | owner==="me" | same |
| 4 | `list:shared` | nav | owner!=="me" (seed owners "lau"/"ben" → "Dr Laurent"/"Dr Benali", L12876) | same |
| 5 | `templates` | nav, create-modal "Template" | Cards for `FE_TPL` (6 base L12457 + 6 domain L14210 = **12 templates**) | — |
| 6 | `library` | nav, "manage blocks" link | Reusable-blocks manager card (`feBlocksMgrHTML` L14160) + all component groups with "+" to add (`data-libadd`) | Empty blocks: `fe_noBlocks` |
| 7 | `list:surveys` / 8 `list:patients` / 9 `list:clinical` | nav | Category-filtered tables | Empty state |
| 10 | `subs` | nav (badge = count of `st==="new"`) | Submissions table, status chips (all/new/review/approved/correction/rejected/test with counts), CSV export | Empty: `fe_noSubs` |
| 11 | `analytics` | nav | KPIs + bars + page "funnel" (hard-coded % `[100,86,74,69,66]` L12900) + per-question answer distribution for the current form (`feQAnalyticsHTML` L14161) | Distribution uses *sample* answers synthesised by `feSubSample` (L14135) → Simulated |
| 12 | `auto` | nav | List of forms with count of enabled automations → opens editor on Automations tab | — |
| 13 | `list:arch` | nav | Archived forms | Empty |
| 14 | `list:trash` | nav | Deleted forms + "Empty trash" button when non-empty | Empty: `fe_trashEmpty` |
| 15 | `settings` | nav | 4 global toggles (autosave, AI, "encryption", "e-mail"), Reset sample data | — |
| 16 | `editor` | open a form (row, recent card, template, create flows) | Form editor shell `feEditorShell` L12721 = header + tabs + body | — |

Nav "help" card (L12703) → `data-aicreate` = create blank form + open AI ask bar.

### 2b. Editor tabs (`FE.tab`, `feTabsHTML` L12715, `feSetTab` L12969)

| Tab | Entry | Content | Notes |
|---|---|---|---|
| `editor` | default | 3-pane: left library panel (Components / Outline), centre page tabs + canvas + AI bar, right Properties (Field / Section / Form) | Header shows Sync, Publish, Preview |
| `preview` | tab, header "Preview" | Device rail (desktop 1440×900 / tablet 834×1194 / mobile 390×844), desktop frame + phone mock rendering the form twice (`fePvForm("d")`, `fePvForm("m")`), right "Preview options" panel; test-mode bar | Multi-step wizard, confirmation summary, thank-you screen, validation errors |
| `rules` | tab | Dependency analysis card (`feDeps` L13945), Page-display rules card, field rules list + inline "new rule" builder (`FE.rb`) | Empty: `fe_noRules`; dep OK state |
| `versions` | tab | Current version + saved/published snapshots with Restore | — |
| `share` | tab (hidden while on editor tab — see §13), More menu | Link + copy, access radio, e-mail invitations, iframe embed code, expiry date, invitation tokens | — |
| `auto` | tab (hidden on editor tab), More menu, Automations view | Up to 7 automation toggles (`FE_AU` L12868) + "add automation" menu | Simulated (nothing executes) |

Header variants (L12711): on editor tab → `sync`, `pub`, `pv`; on other tabs → `save` (save version), split `pub` + `pubm` (publish menu). Both: `more` menu, inline-editable title (`.fe-title`), status pill, breadcrumb (category → title or "New" when never published), "last saved x ago" (refreshed every 30 s, L13586).

### 2c. Panels / drawers / overlays inside the editor

| Panel | Builder | Notes |
|---|---|---|
| Library panel – Components | `feCompsHTML` (L13858 override) → search + 13 chips `FE_CHIPS` L13686 (all, base, choice, layout, adv, health, psy, physio, survey, business, blocks, fav, recent) + list `feCompList` L13847 + "Generate with AI" box | favourites star per row, blocks shown with version/scope |
| Library panel – Outline | `feOutlineHTML` L13856 | Tree pages → sections → fields (groups nested), badges req/logic/hidden; click navigates |
| Page tabs | `fePagesHTML` L12609 | + add page; context menu; dbl-click rename |
| Canvas | `feCanvasHTML` L12608 → `feSecHTML` L12605 → `feFldHTML`/`feGrpHTML` L12599/L12594 (badge wrapper L13884) | device class `dev-desktop/tablet/mobile`, CSS `zoom`, `dir=rtl` for Arabic content |
| AI bar | `feAiBarHTML` L12619 | ask form (toggle), chips: add section, make required, translate (+ language menu), add logic |
| AI preview popover | `feAiPreview` L14124 | `role=dialog`, checklist of proposed ops, Cancel / Apply |
| Properties – Field | `fePField` L12626 + `feXProps` L13916 (wrapper L13932) | type header (+ change type), label, key (copy), description, placeholder, options editor, type-specific props, required/read-only/hidden toggles, Validation, Logic (AND/OR), Data source, Layout/width, default value, cross-field validation, privacy class, translations, block box, repeat |
| Properties – Section | `fePSec` L12680 | title, description, columns 1–3, collapsed, duplicate, delete |
| Properties – Form | `fePForm` L12686 + wrapper L13968 | title, description, category, content language, confirmation message, login/accept/notif toggles, stats, + Domain, Respondents & distribution (anonymity, randomise, limit, start/end), Data (hidden-value policy, retention, AI policy) |
| Preview options | `fePvOptsHTML` L12812 + wrapper L14201 | theme (clinic/min/hi), colour picker + hex + 12 presets, logo & header asset pickers, show org, preview language, "all languages", behaviour toggles (progress, step numbers, save-later, required marks, read-only), simulation (prefill, show logic), Test mode, **View** (practitioner view, dark), **Autofill**, **Accessibility check**, share link |
| Nav drawer / props drawer / comps drawer | CSS classes `o-nav`, `o-comps`, `o-props` + `.fe-scrim` | narrow-window responsive drawers (L13296–13297) |
| Toast | `feToast` L12911 | optional Undo button (4.2 s, else 2.2 s) |

### 2d. Modals / drawers (`feModal` L14004)

| Modal | Entry | Content / steps | States |
|---|---|---|---|
| Create form | `data-newform` (views header "New") | 7 modes (`feCreateModal` L14014): blank, template, AI, import, compose from blocks, duplicate, guided wizard | — |
| AI generate | mode "ai" (L14021) | prompt textarea + 5 suggestion chips + "AI never publishes" note | empty prompt → toast |
| Compose from blocks | mode "compose" (L14023) | checkbox list of blocks | none picked → toast `fe_pickBlocks`; no blocks → `fe_noBlocks` |
| Duplicate | mode "dup" (L14024) | list of active + archived forms | — |
| Guided wizard | mode "wizard" (L14025, `feWizard` L14029) | Step 1 domain (8), Step 2 audience (4) + goal, Step 3 content language + number of sections (1–5), Step 4 options (signature, consent, score, logic) + summary → Generate | Back/Cancel |
| Import | mode "import" (`feImportModal` L14059) | tabs JSON / CSV / PDF-Word / OCR (OCR = "unavailable" panel); Analyse → preview table (toggle rows, retype), warnings; Create | parse error / empty / unknown type / no header / loading ("reading…") / format error / load error |
| Submission review (drawer) | click submission row (`feSubOpen` L14139) | header (initials, form, date, status tag), tabs Answers / Audit log, note textarea, actions Note / Reject / Request correction / Approve (hidden for `test`) | sample-data notice; correction notice |
| Autofill | Preview options "Autofill" (`feAutofillSuggest` L14171, modal L14180) | sources profile / previous submission / organisation / document (PDF/DOCX upload); table with value, confidence bar, status (confirmed/extracted/suggested/conflict/missing) | no suggestions → `fe_afNone`; conflicts unchecked by default |
| Accessibility check | Preview options (`feA11y` L14188) | score % + 8 checks | — |

### 2e. Menus (`osMenu`, shared OS component)

More (L13149), Publish options (L13304), Form row (L13158), Section (L13022 + "save as block" item injected L14208), Page (L13048; override L14207 is a no-op), Field context menu (L13442), Change type (L13061), Zoom (L13317), Table column (L13201, with "Type" submenu), Table row (L13210, editor and live), Logo/Header asset (L13239), Preview languages (L13389), Translate languages (L13325), Group "add inside" (L13335, submenus per group), Section "Add field" (L13339, first 3 groups only), Add automation (L13407). **16 menus.**

---

## 3. Components (string-rendering builders)

| Function | Line | Responsibility / variants |
|---|---|---|
| `FEI` icon set | L12312 (+54 icons L13599) | ~85 inline SVG strings, `aria-hidden` |
| `FE_T` type registry | L12398, L13643, `fePre` L13641 | type → [icon, label key]; 30 base + 20 new base + 30 presets = **80 component types** |
| `FE_G` library groups | L12399 → replaced in place L13676 | 9 groups: base(15), choice(10), layout(4), adv(8), health(13), psy(11), physio(11), survey(7), business(8) |
| `feField` / `feNewField` | L12414 / L12511 (+wrapper L13691) | field factory with per-type defaults; presets via `FE_PRE[id].make`; `blk:` prefix → block instance |
| `feCtl` | L12532 (+wrapper L13724) | Renders a control in **editor-mock** mode (`P=null`) or **live** mode (`P={vals,ro,uid}`). Types: text, email, number, date, phone(+33 prefix), textarea/allergy, select(radio/list), multi/history(chips), file, patient(4 sub-inputs), vitals(configurable set + BMI), meds(rows), clinical 0–10 scale, sat(5 faces), nps 0–10, rank(up/down), matrix(radio grid), sign(canvas), calc(BMI), yesno(+maybe), rating(3/5/7/10 stars), slider, table, chart, info(3 tones), divider, hidden, url, currency, percent, datetime, daterange, duration, age, address(5 parts), likert(+period), semantic differential(5/7/9), mood, chips, bodymap(front/back SVG), rom(L/R vs reference), strength(MRC 0–5 L/R), measure(dated series + sparkline), selector(pract/org/loc/appt sample lists), formula, score(+bands), privnote |
| `feTableHTML` | L12576 | spreadsheet-like table; editor mode (header inputs, column menu, default rows `tdef`) vs live mode; 9 cell types `FE_CTY` L12574; totals row (Σ / x̄) |
| `feChartHTML` / `feChartSVG` / `feChartData` | L12764 / L12752 / L12746 | bar / line / donut SVG; source = a table (x/y columns) or all numeric fields; sample data placeholder |
| `feBodySVG` | L13714 | 21 regions × front/back, L/R mirrored for back, `role=checkbox` per region in live mode |
| `feFace` | L12591 | 5 smiley SVGs |
| `feFldHTML`, `feGrpHTML`, `feSecHTML`, `feCanvasHTML`, `fePagesHTML` | L12599, L12594, L12605, L12608, L12609 | editor canvas; per-field toolbar (width tag, dup, del), resize handle, grip, badges |
| `feCompList`, `feCompRow`, `feChipsHTML`, `feOutlineHTML`, `feCompsHTML` | L13847, L13845, L13844, L13856, L13858 | library panel |
| `feRow`, `feTg`, `feDt`, `feOptEd` | L12622–L12624, L12678 | property-row, switch, collapsible `<details>` (open state in `FE.dto`), options editor |
| `fePField`, `feTypeProps`(+L13891), `feXProps`, `feLogicHTML`(L13934), `feCondRow`, `feWidthHTML`, `feSrcLayout`, `fePSec`, `fePForm`, `fePropsHTML` | L12626… | properties panel |
| `feHeadHTML`, `feTabsHTML`, `feNavHTML`, `fePill`, `feEditorShell` | L12708, L12715, L12701, L12705, L12721 | shell |
| `fePvForm`, `fePvFld`(+L13977), `fePreviewHTML`, `fePvOptsHTML`, `feHdrSVG`, `feLogoHTML` | L12794, L12787, L12830, L12812, L12736, L12743 | respondent preview |
| `feRulesHTML`(+L13961), `feRuleText`(L13942), `feVersionsHTML`, `feShareHTML`(+L14205), `feAutoHTML` | L12846, L12854, L12858, L12869 | tab panes |
| `feViewHTML`(+L14151), `feTable`, `feKpis`, `feBars`, `feBlocksMgrHTML`, `feQAnalyticsHTML` | L12885… | app views |
| `feModal`, `feModalClose`, `feMHead` | L14004–L14011 | dialog/drawer frame |
| `feWizard`, `feImportRender`, `feSubOpen`, `feAutofillModal`, `feA11y`, `feAiPreview` | L14029, L14060, L14139, L14180, L14188, L14124 | dialogs |
| Pure logic | `feTok`/`feParse`/`feRefs`/`feFormulaEval` L13785–L13826, `feNumOf` L13804, `feScoreOf`/`feBandOf` L13827–13828, `feLogicNorm`/`feCondOne`/`feCond`/`fePageOn` L13832–13841, `feDeps` L13945, `feCsvParse` L14070, `feGuessType` L14071, `feDocToRows` L14088, `feTblPaste`/`feTblRemap`/`feTblAgg` L13189/L13195/L12573, `feAgeOf` L13758, `feValStr` L12769(+L13760), `feSeeded` L13987, `feLum` L14187, `feSlug`/`feUniqKey` L12405/L12510, `feWalk`/`feFind`/`feFindSec` L12501–12509 | candidates for unchanged TS extraction |

Total distinct render/builder components ≈ **60**; pure-logic modules ≈ **25 functions**.

---

## 4. Interaction inventory

Classification: **F** Functional (read end-to-end), **P** Partial, **S** Simulated (sample data / no backend / toast only), **D** Decorative (stored or shown but no effect), **B** Broken/dead, **N** Present-not-verified.

### 4a. Shell, navigation, header

| Control | Handler | Class |
|---|---|---|
| Nav items (15) `data-go` | L13298 → `feGo` | F |
| Nav help "Create with AI" `data-aicreate` | L13299 | F |
| Burger / drawer open `data-fe-open` (nav/comps/props), close `data-fe-close`, scrim | L13296–13297 | F |
| Breadcrumb category button | `data-go` | F |
| Title inline rename (click `.fe-title`) | L13306, `feInlineEdit` L13054 | F |
| Header Sync | L13302 → `feCommit` | F (local save only) |
| Header Publish | `fePublish` L13139 | S (status flag + version snapshot; no server, no validation) |
| Header Preview | L13303 | F |
| Header Save (version) | `feSaveVersion` L13145 | F |
| Publish menu: Publish now / Schedule / Save as template | L13304 | F / S (toast only) / S (toast only) |
| More: Rename / Duplicate / Export JSON / Share / Automations / Unpublish / Archive (+undo) / Delete (+undo) | L13149–13155 | F / F / **P** (copies JSON to clipboard, `feDownload` L13146 — no file) / F / F / F / F / F |
| Tabs (6) | L13308 → `feSetTab` | F |

### 4b. Editor canvas & tools

| Control | Handler | Class |
|---|---|---|
| Device switch (desktop/tablet/mobile) ×2 locations | L13309 | F |
| Zoom − / + / menu (50–150 %, Fit) | L13316–13317, `feZoom` L13541 | F |
| Undo / Redo buttons | L13318 | F (80-step JSON snapshots) |
| Page tab click / add page / page context menu (rename, move L/R, delete) / dbl-click rename | L13328–13329, L13047, L13048, L13434 | F |
| Section header click (select) / collapse / "…" menu (rename, dup, collapse, up, down, move to page, delete, save as block) / "Add field" menu / dbl-click title rename / drag grip | L13339, L13342, L13022, L13432, L13427 | F (all) |
| "Add section" (canvas bottom) | `data-ai="sec"` → `feAddSection` | F |
| Field click select / Enter opens props / ArrowUp/Down select prev/next / dbl-click label rename | L13341, L13563, L13562, L13433 | F |
| Field toolbar dup / delete (+undo toast) | L13338 | F |
| Field resize handle (snap to 1/5…1, per device) | `feResize` L13245 | F |
| Field drag-move (pointer, auto-scroll, ghost, placeholder, group depth ≤3) | `feDragInit` L13253 | F |
| Field context menu: Properties, Duplicate, Copy, Cut, Paste, Save as block (groups), Required toggle, AI logic, Delete | L13436–13442 | F |
| Group header: add-inside menu / collapse | L13331–13335 | F |
| Click empty canvas → deselect | L13343 | F |
| Table (editor): header label inputs, column menu (type, edit options, required, insert L/R, move, duplicate, delete), add column (max 8), add default row, row menu (above/below/dup/move/clear/delete), default-value cells, multi-paste TSV, Enter/Arrow navigation | L13372–13383, L13201, L13210, L13502, L13509 | F |
| Chart type / source / x / y / show values | L13311, L13479 | F |

### 4c. Library panel

| Control | Handler | Class |
|---|---|---|
| Components/Outline switch `data-lp` | L14253 | F |
| Search `data-fe-q` | L13449 | F |
| 13 filter chips `data-cf` | L13320 | F |
| Component click / Enter / Space → add; drag → drop at position | L13426, L13520 | F |
| Favourite star `data-cfav` | L14258 | F |
| Block rows (`blk:` ids) add | via `feNewField` L13692 | F |
| "Manage blocks" link → library view | `data-go="library"` | F |
| Generate-with-AI textarea + button (Ctrl/⌘+Enter) | L13321, L13522 | F (local heuristics) / N (LLM path depends on `window.claude`) |
| Outline: page / section / field click navigate | L14254–14256 | F |

### 4d. AI bar

| Control | Handler | Class |
|---|---|---|
| Ask toggle + submit | `feToggleAsk` L13132, submit L13498 → `feAiRun` (v2 L14113) → preview → Apply | F (local rule parser `feAiLocal` L13070/L14106) / N (fallback `aiGetSample()` → `window.claude.use("sample")` L10845) |
| Chip "Add section" | `feAddSection` | F |
| Chip "Required" | `feAiReq` L13103 | F (picks selected or first optional field) |
| Chip "Translate to EN/FR" + language menu | `feTranslate` L13096 | **P** — only switches content language `d.lang`; `fe_*` keys translate, custom labels are not translated (toast reports count) |
| Chip "Logic" | `feAiLogic` L13105 | F (adds `show if first select = option 1`) |
| AI preview: per-op checkboxes, Cancel, Apply | L14250–14251, `feAiApplyStaged` L14128 | F |
| Escape closes ask | L13523, L13550 | F |

### 4e. Properties panel

| Control | Handler | Class |
|---|---|---|
| Tabs Field/Section/Form `data-pt` | L13345 | F |
| Text inputs `data-p` (label, key, desc, ph, min, max, regex, step, unit, rows, period, left/right, norm, method, expr, dec, dv, rmax, rlabel) | L13452–13457 | F (key sanitised on input, de-duplicated on blur L13445; regex validity shown) |
| Change type menu | L13346, L13061 | F (9 basic types only) |
| Copy key | L13347 | F |
| Toggles req/ro/hid/col/maybe/addRows/cvals/repeat | L13348–13350 | F (repeat: props not re-rendered — §13) |
| Options editor add/remove/edit (opts, rows, cols) | L13357–13358, L13462 | F |
| Stars 3/5/7/10, chart type, tone, display radio/list, group cols, semantic points, currency symbol, vitals set, score method, bands add/remove/edit, score items + weights, formula reference chips | L13310–13312, L13354, L13337, L14266–14272, L14269, L14307–14308, L14318–14319 | F |
| Table column editor (label, type, options, remove, add — max 6 here vs 8 elsewhere) | L13313–13314, L13460–13461, L13480 | F (limit inconsistency §13) |
| Total row none/sum/avg; clear default data | L13382–13383 | F |
| Width per device (auto + 7 spans) | L13315 | F |
| Data source select (manual/patient record/directory) | `data-p="src"` | **D** (stored, never used) |
| Logic v2: add rule, action (show/require), ALL/ANY, add/remove condition, src/op/val per condition (9 ops), remove rule | L13359, L14278–14280, L14313–14314, L13360 | F |
| Default value (`dv`) | L13924, applied L13989 | F |
| Cross-field validation (`xv`) | L13926, L14317, validated L14001 | F |
| Privacy class std/personal/health | L14273 | P — badges + highlight in review only; no access control |
| Translations per language (`data-ptr`) | L14304 | F |
| Block box: save/publish block, update to latest, ignore, unlink | L14274–14277 | F |
| Section props: title, desc, cols, collapsed, duplicate, delete | L13463, L13355, L13351, L13356 | F |
| Form props: title, desc, category, content language, confirmation message | L13464–13465, L13481 | F |
| Form toggles login / accept / notif | L13352 | **D** |
| Form settings: domain, anonymity, randomise, limit, start, end, hidden-value policy, retention, AI policy | L14323, L13352 | domain D, anonymity P (notice only), randomise F, limit/start/end **D**, hidden policy F, retention **D**, AI policy P (`off` blocks AI; `on` ≡ `suggest`) |
| Section/Form property `data-pw` handler | L13353 | **B** (no element renders `data-pw` in this app) |
| v1 logic selects `data-lg` handlers | L13466, L13482 | **B/dead** (v1 UI replaced by v2 L13934) |

### 4f. Preview / respondent simulation

| Control | Handler | Class |
|---|---|---|
| Device rail | L13363 | F |
| Test mode on/off (Escape exits) | L13364, L13550 | F |
| All live inputs (text, select, radio, checkbox, date, range, file name only, sub-fields) — mirrored between desktop & phone frames | `fePvSet` L13178, input L13472, change L13485–13492 | F (file input stores only the file name — **P**) |
| Pick buttons (scales, stars, faces, NPS, mood), rank up/down, chips, body-map regions (click/Enter/Space), strength | L13370–13371, L14260–14262, L14334 | F |
| Signature canvas draw / clear | `fePvSign` L13533, L13387 | F |
| Meds / measure "add row" | L13386 | F |
| Live table: add row, remove row, row menu, chips/stars cells, TSV paste, Enter adds row | L13384–13385, L13372, L13502, L13517 | F |
| Repeatable group add / remove instance (values shifted) | L14263–14264 | F |
| Next (validate page), Previous, Edit from summary, Submit, Restart | `fePvNext` L13229, L13366–13369 | F (submit stores a **test** submission locally) |
| "Save and continue later" | L13368 | S (toast only) |
| Preview options: theme, colour (picker/hex/presets), logo/header (3 presets each + upload ≤1.5 MB), show org, language, all-languages menu, behaviour toggles ×5, prefill, show logic, practitioner view, dark | L13388–13391, L13468–13469, L13484, `feAssetMenu` L13239 | F |
| Copy link / copy embed | L13392–13393 | S (fake domain `forms.remotion.health`) |
| Autofill: open, switch source, document upload, row toggles, Apply (with provenance badges) | L14290–14292, L14329–14330 | F on sample profile/org (S data); F on previous submission; F on uploaded PDF/DOCX ("Label: value" lines) |
| Accessibility check | L14293 | P (heuristic; two checks hard-coded `ok:true`, L14196) |

### 4g. Rules / Versions / Share / Automations tabs

| Control | Handler | Class |
|---|---|---|
| New rule builder (src, op [3 ops], val, action, target) / Add / Cancel | L13395–13396, L13483, L13499 | F |
| Rule Edit → jumps to field logic; Rule delete (+undo) | L13398, L13397 | F |
| Dependency issues "Edit" | `data-redit` | F |
| Page rules: add, mode, conditions add/edit/remove | L14282–14285, L14315–14316 | F (removal only for pages 1–8, §13) |
| Version Restore (+undo) | L13400 | F |
| Share access radio | L13402 | D |
| Invite e-mail (validated) / remove | L13500, L13403 | S (no e-mail sent) |
| Expiry toggle + date | L13404, L13470 | D |
| Generate tokens (1–200) / copy token URLs | L14295–14296 | S (Math.random, never consumed) |
| Automation toggles / add automation | L13406–13407 | S (no execution) |

### 4h. App views

| Control | Handler | Class |
|---|---|---|
| Row open (click/Enter), row menu (open, dup, archive/unarchive, delete, restore, delete forever) | L13410, L13409, L13158, L13521 | F |
| List search | L13450 | F (re-renders whole view per keystroke) |
| New form → create modal | L13412 | F |
| Template "Use" | L13413 | F |
| Library "+" add component / block insert / block delete (+undo) / rename (dbl-click) / scope priv/org | L13414, L14298–14300, L14302 | F (scope D – no sharing effect) |
| Submissions filter chips / row → review drawer / CSV export | L13415–13417 | F / F / **P** (copied to clipboard) |
| Review: tabs, note, reject (requires note), request correction (requires note), approve | L14287–14288, `feSubAct` L14145 | F (local status + audit log) |
| Empty trash | L13418 | F (no confirmation, no undo) |
| Settings toggles autosave / AI / encryption / e-mail | L13419 | F / F / **D** / **D** |
| Reset sample data (+undo) | L13420 | F |

### 4i. Dialog flows

| Control | Class |
|---|---|
| Create modal 7 modes (L14018) | F |
| AI generate (suggest chips, Ctrl+Enter, Generate) L14233–14234 | F/N (as AI bar) |
| Compose from blocks L14235 | F |
| Duplicate pick L14236 | F |
| Wizard: domain, audience, goal, language, sections, 4 options, Back, Next, Generate L14238–14244, build L14036 | F (audience stored, never used → D) |
| Import tabs, file pick, Analyse, row on/off, retype, Create L14246–14248, L14324–14328 | F (JSON/CSV), F (PDF via pdf.js / DOCX via mammoth CDN), OCR tab **S** ("unavailable" panel) |
| Modal close: ✕, backdrop click, Escape L14230–14231, L13549, L14333 | F |

### 4j. Keyboard shortcuts (document-level capture listener L13544, only when focus is inside `.fe`)

| Keys | Effect | Class |
|---|---|---|
| Esc | close modal → close drawers → exit test mode → close AI ask | F |
| Ctrl/⌘+S (also in fields) | save now | F |
| Ctrl/⌘+Z / Ctrl+Y, Ctrl+Shift+Z | undo / redo (editor view, not in fields) | F |
| Ctrl/⌘+C / X / V | copy / cut / paste field (editor tab) | F |
| Ctrl/⌘+D | duplicate field | F |
| Delete / Backspace | delete selected field (no confirm, undo toast) | F |
| ↑/↓ on focused field | select previous/next | F |
| Enter on field | open properties | F |
| Enter/Space on component | add | F |
| Enter on list/submission row | open | F |
| Enter/↓ in table header input; Enter/Shift+Enter/↑/↓ in cells | navigate / add row | F |
| Ctrl/⌘+Enter in AI textareas | generate | F |
| Enter/Esc in inline edits | commit / cancel | F |
| `own()` stops propagation of Delete/Backspace/F2/Enter/Ctrl+A,C,V,X(,Z,Y,D) so OS desktop shortcuts never fire underneath | | F |

### 4k. Counts (interaction rows above, grouped controls counted once)

| Class | Count |
|---|---|
| Functional (F) | 142 |
| Partial (P) | 10 |
| Simulated (S) | 14 |
| Decorative (D) | 11 |
| Broken / dead (B) | 3 (`data-pw`, v1 `data-lg` input/change paths, `fePageMenu` override no-op) |
| Present-not-verified (N) | 2 (LLM fallback paths needing `window.claude`) |
| **Total** | **182** |

---

## 5. User journeys

1. **Open app** — Desktop icon / dock / launcher → `feOpen` L13576: `feLoad` (localStorage or seed), registers install, dock button, opens window sized `min(1640, innerWidth-16)` × (dock top − 76) (L13582), renders editor of `feS.cur` (initially seed form f1 "patient intake", 3 pages). Re-open when already open → restore + focus. Close → commit pending autosave, remove dock button (L13583).
2. **Create a form**
   - Views → "New" → create modal → *Blank* (`feNewForm("blank")` L12985) → editor with one section + "Untitled question".
   - *Template* → templates view → "Use" → `feNewForm(kind,name)`.
   - *Wizard* → 4 steps → `feWizardBuild` L14036 → pages built (new page every 2 sections), consent/signature/score/logic options → editor. Cancel at step 1; Back on later steps.
   - *AI* → prompt → blank form created, `FE.aiCreate=true`, `feAiRun` → domain detection (`feDomOf` L14105) → staged ops preview → user ticks/unticks → Apply (blank placeholder section removed first). If nothing recognised and no `window.claude` → toast `fe_aiNone` and an empty blank form remains (**RISK**: orphan untitled draft).
   - *Import* → JSON/CSV paste or file → Analyse → preview with warnings → Create; PDF/DOCX → CDN libs loaded → heuristic question extraction → preview → Create. Failure: invalid JSON warning, no pages, empty, unknown type → `info` warning field, load error.
   - *Compose* → pick blocks → one section per block (group linked to block version).
   - *Duplicate* → pick form → copy "Copy of …" draft.
3. **Build/edit** — add components (click, drag, keyboard, context "add inside", AI); select → properties; resize width per device; reorder by drag; sections/pages via menus; undo/redo (80 steps, reset when switching form); autosave 900 ms after each mutation (if enabled) with "saved" timestamp; Ctrl+S manual.
4. **Logic & rules** — field logic (show/require when ALL/ANY of 9 operators), page display rules (sources restricted to earlier pages), Rules tab shows dependency analysis: missing sources, forward refs, page self-refs, formula parse errors/missing refs, score without items, cycles (DFS L13957).
5. **Preview & test** — Preview tab; fill desktop or phone (mirrored), test mode; Next validates current page (required, email, min/max length, regex, number range, table required columns, URL, date range, cross-field) with shake + scroll to first error + toast count; page skip rules applied; summary page with "edit" jumps; Submit → test submission saved locally (`st:"test"`, answers copied incl. signature data URL) and response counter incremented; Restart.
6. **Publish & share** — Publish → status `pub`, version snapshot `pub:true`, pill animation, toast "v n published"; Unpublish via More. Share tab: copy fake link/embed, invites list, tokens, expiry (none of which have a backend).
7. **Review submissions** — Submissions view → filter chips → open drawer (first open marks `review`, logs `opened`) → Answers (sample answers synthesised for seeded rows) / Audit log → Approve / Request correction (note required) / Reject (note required) / add note → toast, status tag updates, list re-rendered. Test submissions show no decision buttons.
8. **Autofill in preview** — Preview options → Autofill → source tabs → review rows (conflicts off by default, missing required listed) → Apply → values + provenance badges (`fe-b prov t-<status>`) on labels.
9. **Lifecycle** — Archive (More, row menu) with undo; Delete → trash with undo; Trash → restore / delete forever / empty trash (irreversible, no confirm); Settings → Reset sample data (undo available in toast).
10. **Reusable blocks** — Group → "Save as reusable block" (or section menu) → block v1 (private) → appears in library/blocks chip → insert anywhere; editing a linked group and "Publish block" bumps version; other instances show "outdated" dot → Update / Ignore / Unlink.

---

## 6. State & persistence

### In-memory
- `FE` (L12411): `view, tab, dev, zoom, sel, selSec, ptab, page, undo[], redo[], comp, q, lq, lp, sf, pv{dev,step,vals,err,test,done,seed,rep,prov,keepHidden}, drag, ask, clip, dto{}, rb, modal, wz, imp, af, aiOps, aiCreate, subOpen, subTab, editingTitle, snapOn, mem` + timers `st` (autosave), `pvT` (preview re-render debounce 0/500 ms), `colT` (colour 120 ms), `tcoT` (400 ms), `tick` (30 s interval).
- `feS` (L12475): persisted store (below). `feSeq` id counter seeded from `Date.now()%1e7` (ids `x…` base-36).
- Undo snapshots are full-document JSON strings (`{d,page,sel}`), capped at 80 (L12916); cleared on form switch (L12982) and reset.

### localStorage keys

| Key | Read/Write | Shape |
|---|---|---|
| `remotion-forms` | L12478 / L12486 | `{v:1, cur, docs:{[id]:Doc}, forms:[Entry], subs:[Sub], ver:{[id]:[{n,at,by,pub?,snap:string}]}, pv:{theme,color,logo,hdr,org,lang,prog,nums,later,reqm,ro,fill,logic,prac?,dark?,logoData?,hdrData?,cv?}, set:{autosave,ai,enc,mail}, saved, g1, g2, blocks:[Block], favs:[type], recent:[type]}` |
| `remotion-dk-v3` | L13593/L13596 | flag "1": one-time install + desktop-1 shortcut seeding |
| (indirect) `remotion-apps` via `alSave()` | L13579, L13594 | installed/recent apps (other area) |
| (indirect) `remotion-desks` via `saveDesks()` | L13595 | desktop items (other area) |

Schemas:
- **Entry** `{id, name?, cat:"patients"|"surveys"|"clinical", kind, status:"draft"|"pub", resp, upd, owner:"me"|"lau"|"ben", arch?, del?}`
- **Doc** `{title, sub, status, everPub, cat, lang:null|"fr"|"en"|"de"|"ar", pages:[{id,title,skip?:{mode,conds[]},sections:[{id,title,desc?,cols,col?,fields:[Field]}]}], set:{msg,login,accept,notif,dom?,anon?,rand?,limit?,start?,end?,hidePol?,ret?,aiPol?}, share:{access,invites[],expire,until,tokens?[{c,used}]}, auto:{a1..a7:boolean}}`
- **Field** `{id,type,label:string|{fr,en,de,ar},key,req,ro,hid,w,sp?{d,t,m},desc?,ph?,opts?,disp?,def?,min?,max?,regex?,step?,unit?,logic?{act,mode,conds[{src,op,val}]}|v1{src,op,val,act},src?,fields?,cols?,col?,tcols?,rows?,addRows?,tsum?,tdef?,ctype?,csrc?,cx?,cy?,cvals?,tone?,stars?,maybe?,pre?,blk?{id,ver},repeat?,rmax?,rlabel?,priv?,dv?,xv?{op,ref},expr?,dec?,items?,meth?,bands?,vset?,joint?,move?,norm?,kind?,dob?,cur?,pts?,left?,right?,period?,method?}`. Labels may be i18n keys (`"fe_…"`) resolved at render (`fv` L12408).
- **Sub** `{id, who, form, at, st:"new"|"done"|"review"|"approved"|"correction"|"rejected"|"test", ans?, sample?, seen?, corr?, log:[{at,by,act,msg}]}`
- **Block** `{id, name, desc, scope:"priv"|"org", ver, upd, cols, fields}`

Versioning / migrations (FACT): only `v===1` accepted (else reseed, L12478); in-place migrations flagged by `g1` (emergency-contact group L12482), `g2` (pain table + yes/no L12481), `pv.cv` (colour change L12483); `pv` merged with defaults (L12480); `feBlocksEnsure` adds blocks/favs/recent (L13872, via `feLoad` wrapper L14340). Quota failure: retry without uploaded logo/header images, then restore them in memory only (L12486–12488).

Seed data (L12458–12474, L13867): 8 forms (one full intake doc, others generated lazily by `feDoc()` on first open), 8 submissions with patient names (Camille Martin, Lucas Bernard, Inès Haddad…), 2 versions, 4 blocks, sample practitioner/org/location lists `FE_SAMPLE` L13687, appointment slots generated from today (L13688), demo profile `FE_PROFILE` L14170.

Cross-app: no event bus / `storage` listener in this area (FACT: none registered). Other apps read `feS` directly: Billing `biFormList` (L23652, earlier stub L22801 referencing non-existent `feSt`), Patients `paForms` L24753 and `paOpenForm` L25250 (calls `OS_OPEN.forms()` then `feOpenForm(id)` after 250 ms), AI connector registry entry "forms" L23781.

---

## 7. Integrations & external dependencies

| Integration | Where | Notes |
|---|---|---|
| `window.claude.use("sample")` via `aiGetSample()` (L10845) | `feAiRun` L13120 (v1), L14117 (v2) | Prompt contains current page section/field labels and types plus user request (no answer values). Response parsed as JSON array of ops. Guarded by `feS.set.ai` and form `aiPol!=="off"`. |
| pdf.js 3.11.174 (cdnjs) + worker | `feDocText` L14084 | Loaded on demand by `feLoadScript` L14082 (script tag, no SRI). Max 30 pages. |
| mammoth 1.6.0 (cdnjs) | L14085 | DOCX raw text. |
| Clipboard API + `execCommand("copy")` fallback | `feCopy` L13147–13148, `feCopyField` L13863 | export JSON/CSV, link, embed, key, token URLs, field JSON `{remotionField}` |
| FileReader | logo/header upload (≤1.5 MB, data URL) L13241; import text file L14326 | |
| Canvas 2D | signature L13533, data URL `toDataURL()` | |
| `ResizeObserver` | L13585 (tab ink) | |
| Web Animations API (`el.animate`) | ~60 call sites | gated by `feRM()` |
| `Intl.NumberFormat`, `toLocaleString` | `fePct` L12714, dates | via global `loc()` |
| `contentEditable="plaintext-only"` | `feInlineEdit` L13055 | fallback `true` |
| `document.elementFromPoint`, pointer events, `setPointerCapture` | DnD/resize/signature | |
| `Math.random` | tokens L14295, randomisation seed L13990 | |
| OS globals used | `t, lang, LANGS, I18N, nf, loc, fmtD, fmtT, toast, DKE, osMenu, osMenus, osMenuCloseAll, osWinOpen, osRestore, osFocus, osRunMark, OSW, OS_DOCK, OS_OPEN, DK_APPS (forms glyph L11741), dkGlyph, dkOpenX, dkPop, renderDock, osRelabel, desks, dkId, saveDesks, alStore, alSave, alTouch, dkSuppress, lkRM, ACCOUNTS, aiGetSample` and i18n keys `fmClose, fmOpen, fmDel` | |
| Overrides of OS functions | `dkOpenX` L13589, `renderDock` L13590, `osRelabel` L13591 (re-renders app + dock label on language change) | |
| Network | none besides the 2 CDN scripts and optional `window.claude` | fake public URL `https://forms.remotion.health/p/<slug>-<ID>` L12811 |

Not used: fetch/XHR, IndexedDB, notifications, fullscreen, print, crypto, window.open, AudioContext.

---

## 8. i18n / RTL

- Strings: `I18N[lang]` merged from the L12310 dictionary; UI uses global `t(k,vars)`; content uses `feTx(k,L,vars)` (L12406, fallback chain L → en → fr → key) so UI language, **form content language** (`doc.lang`, default = UI) and **preview language** (`feS.pv.lang`) are independent.
- Field/section/page labels are either i18n keys (`"fe_fNom"`) → translated automatically in all 4 languages, or plain strings, or per-language objects `{fr,en,de,ar}` edited in the Translations section (L13928, L14304); `fv()` resolves with fallback fr → en → first non-empty.
- Coverage (FACT): 1,145 literal `fe_*` keys referenced, all present; 15 dynamic families (`fe_dt_*`, `fe_p_*`, `fe_ct_*`, `fe_dm_*`, `fe_j_*`, `fe_mv_*`, `fe_bm_*`, `fe_selK_*`, `fe_selPh_*`, `fe_au_*`, `fe_afSrc_*`, `fe_subDone_*`, `fe_tone_*`, `fe_t_*`, `fe_L*`) present for all values produced in code. 4 languages × 1,290 keys, none empty.
- Hard-coded French/other strings outside i18n (FACT): sample names and lists (`FE_SAMPLE`, `FE_PROFILE`, seed submissions), `fePvPrefill` values (L12838, e.g. "Paracétamol", "1 g × 3/j"), CSV sample header in import (L14063), owner names "Dr Laurent/Dr Benali", wizard/AI keyword regexes (fr/en/de/ar), seed option "Français/English/Deutsch/العربية", unit placeholders.
- RTL: canvas paper and preview forms set `dir="rtl"` when content/preview language is `ar` (L12608, L12802); inputs use `dir="auto"`; CSS uses logical properties (`inset-inline-*`, `margin-inline-*`) plus `[dir="rtl"]` overrides for drawers/arrows; JS mirrors slide animations and resize math using `document.documentElement.dir` / computed `direction` (L13043, L13246, L13269, L13171). Keys/regex/link inputs forced `dir="ltr"`. Arabic numerals handled by global `nf()`.

---

## 9. Design tokens & motion

| Token | Value (light / dark) | Line |
|---|---|---|
| `--fe-bg` | #f5f7f6 / #1f2428 | L2605/L2606 |
| `--fe-acc` (accent) | #5a64e0 (both) | L2605 |
| `--fe-acc2` | #4450cf / #a9b2ff | |
| `--fe-soft` | rgba(90,100,224,.1) / rgba(124,140,255,.16) | |
| `--fe-inl` (input line) | rgba(20,40,30,.16) / rgba(255,255,255,.14) | |
| `--fe-track` | #d3d9d6 / #4a5258 | |
| `--fe-sh` | 0 1px 2px … / none | |
| Brand glyph gradient | linear-gradient(#7c8cff,#4b5bdc) | L2616, `DK_APPS.forms` L11741 |
| Respondent form `--pc` | user colour (default #5A64E0), 12 presets `FE_COLS` L12410 | `.fe-pf` "always light" L2979; `.fe-pf.dk` dark preview L3623 |
| Preview themes | `th-clinic` (default), `th-min` (no header) L3041, `th-hi` (high contrast) L3046 | |
| Dark mode | `:root.dark .fe-win` (26 `:root.dark` rules in range) | OS-level class |

Usage counts: `--fe-acc` 117, `--fe-soft` 43, `--fe-inl` 32, `--fe-acc2` 27. Global tokens consumed: `--surface, --fg, --muted, --line, --hover, --chip, --spring`.

Keyframes (9): `feGrow` L2862, `feIn` L2863, `feSpin` L2877, `feBar` L3160, `feW` L3208, `feDraw` L3412, `feFade` L3414, `fePop` L3416, `fePulse` L3531. CSS easing mostly `var(--spring)` (71 uses). JS WAAPI easings: `cubic-bezier(.2,1,.3,1)`, `(.2,1.1,.3,1)`, `(.2,1.4,.3,1)`, `(.3,1,.4,1)`, `(.3,1.2,.4,1)`, `(.4,0,.2,1)`; durations 160–700 ms; FLIP reordering in `feFlip` L12926. Reduced motion: every JS animation gated by `feRM()` → global `lkRM()` (user setting or `prefers-reduced-motion`, L8897); **no `prefers-reduced-motion` media query in this CSS range** (CSS keyframes/transitions not disabled here — UNKNOWN whether a global rule elsewhere does).

Responsive (container queries, no `@media`): container `fe` on `.os-wb` — `max-width:1280px` (icon-only nav 64 px; editor 236/1fr/288) L3210, `1080px` (properties & preview options become slide-over drawers; phone mock hidden unless mobile) L3224, `820px` (nav becomes drawer) L3238, `600px` (header/tabs wrap, AI chips scroll) L3272/L3300/L3301, `min-width:1100px` L3098; container `fepf` (preview frame) 640/460 px L3299–3300; `fepvs` 780 px L3309. JS breakpoints: `R.offsetWidth<1040` opens props drawer on select (L12999, L13341), `<760` closes comps drawer after add (L13426). Field grid uses 60-unit spans with CSS vars `--sd/--st/--sm` per device (L12499).

---

## 10. Accessibility observations

Positive (FACT):
- Tabs use `role=tablist/tab` + `aria-selected` (editor tabs, page tabs, properties tabs, chips, import tabs, submission tabs); radio groups use `role=radiogroup/radio` + `aria-checked` (devices, widths, colours, access, privacy); switches are `button role=switch aria-checked` (`feTg` L12623).
- Toast is `role=status aria-live=polite` (L12949); preview errors `role=alert` (L12792); progress bar `role=progressbar` with values (L12806); modals `role=dialog aria-modal=true aria-label` (L14006).
- Canvas fields are focusable (`tabindex=0`, `aria-pressed` for selection, `aria-label`), keyboard select/move selection, Enter for props, Delete; components keyboard-activatable; body-map regions `role=checkbox` with Enter/Space (L13716, L14334); matrix radios have composed `aria-label`; icon buttons have `aria-label`/`title` (103 `aria-label`s).
- Live preview labels are `<label for>` bound to inputs (`P.uid-f.id`), sections are `<fieldset><legend>`.
- Focus ring `:focus-visible` 2 px accent (L2611).

Gaps (FACT unless marked):
- **No focus trap** in modals/drawers and no focus restore on close (`feModal` L14004–L14010; only initial focus).
- Drag-and-drop reordering of fields/sections has **no keyboard equivalent for fields** (sections have Move up/down in menu; fields do not).
- Rating/scale/NPS/sat/mood/strength buttons inside `role=radiogroup` are plain buttons without `role=radio`/`aria-checked` (L12554–12562, L13740, L13744) — selection conveyed by class only.
- Group items for checkboxes in `.fe-checks` lack a group label linkage; composite controls (patient, vitals, address, daterange) labels are per-subfield `<label><span>`, OK, but outer `<label for>` points to a non-existent id for composite types (INFERENCE: `for="pvX-fid"` where no element has that id).
- Signature canvas has `aria-label` but no keyboard alternative.
- Inline editing via `contentEditable` on headings, no role/label announced.
- Editor mock controls (`tabindex=-1` buttons) are fine; chart SVG `role=img` without `<title>`/label.
- The built-in a11y checker reports keyboard and motion support as always OK (hard-coded, L14196).
- Status pill colours / tags rely on colour + text (OK).

---

## 11. Migration notes (Next.js App Router, TypeScript, React)

**Rendering patterns to replace (FACT):** everything is HTML-string templates assigned via `innerHTML`/`outerHTML`/`insertAdjacentHTML`, partial repaint helpers (`feRefresh(what)`, `feRenderProps`, `feRepaintField`, `fePvRender`, `feSyncHead`) and **event delegation** on the app root (click/pointerdown/dblclick/contextmenu(capture)/focusout/focusin/input/change/submit/paste/keydown registered twice by base + wrapper `feWire`) plus **two document-level listeners** (keydown capture L13544, click for section-menu entry L14339). Behaviour is layered via 29 monkey-patches — the effective implementation of e.g. `feCtl`, `feNewField`, `feAiRun`, `feViewHTML` is the *last* wrapper. Migration must flatten these into single implementations.

**Client-only:** whole editor (pointer DnD, canvas signature, clipboard, FileReader, contentEditable, WAAPI, ResizeObserver, localStorage, CDN libs, `window.claude`). Server components can host the list views, templates and read-only submission views once data moves server-side.

**Suggested decomposition**
- `app/(os)/forms/layout.tsx` (nav), routes: `overview`, `forms/[filter]`, `templates`, `library`, `submissions` (+ `@modal` intercepting route for review drawer), `analytics`, `automations`, `settings`, `forms/[id]/(editor|preview|rules|versions|share|automations)`.
- Editor: `<FormEditor>` with context/store (Zustand or `useReducer` + immer) holding `doc`, `selection`, `history` (patch-based undo instead of full JSON snapshots), `<ComponentLibrary>`/`<Outline>`, `<PageTabs>`, `<Canvas>` → `<SectionView>` → `<FieldView>` (registry-driven), `<PropertiesPanel>` (Field/Section/Form + per-type property components), `<AiBar>` + `<AiProposal>`.
- Field registry: one module per type `{type, icon, defaults(), Editor mock, Live control, PropsPanel, toText(), toNumber(), validate()}` replacing the `switch` in `feCtl`/`feValStr`/`feTypeProps`/`feNumOf`; presets as `{base, make}`.
- DnD: dnd-kit (pointer + keyboard sensors) to gain keyboard reorder; width resize as a separate handle component.
- Preview: `<RespondentForm doc values onChange mode="desktop|mobile">` rendered once per frame from shared state (no DOM mirroring); signature with a canvas component; tables as a controlled grid component.
- Dialogs: Radix/shadcn `Dialog`/`Sheet`/`DropdownMenu`/`ContextMenu`/`Tabs`/`Switch`/`RadioGroup` → fixes focus trap and roles.

**Pure TS modules extractable nearly unchanged (FACT: no DOM access):** formula tokenizer/parser/evaluator (`feTok`, `feParse`, `feRefs`, `feFormulaEval` — needs `byKey`/values injected instead of `feEach`/`FE.pv.vals`), scoring/bands, logic v2 (`feLogicNorm`, `feCondOne`, `feCond`, `fePageOn`, `feNextStep`), dependency analysis + cycle detection `feDeps`, validation rules (`fePvValidate` minus DOM), CSV parser, `feGuessType`, `feDocToRows`, table paste normaliser/remap/aggregates, `feAgeOf`, `feValStr`, slug/unique key, tree walkers, seeded shuffle, contrast luminance, ROM/body-map data, AI local intent parser `feAiLocal` (needs i18n injection). Most read globals (`feDoc()`, `FE.pv.vals`, `t`) and must be parameterised.

**Data model / backend:** define Zod schemas for Doc/Field/Entry/Sub/Block (shapes in §6), migrate legacy v1 logic `{src,op,val,act}` → v2 `{act,mode,conds}`, i18n label union `string | Record<Lang,string>` and `fe_*` key references. Server actions for CRUD, publish (immutable published versions), submissions (append-only), review workflow with audit log, share tokens (crypto-random, single-use, server-validated), automations (real job runner), retention policy enforcement, file upload storage (currently file name only), import parsing (pdf.js/mammoth can stay client-side or move to a route handler).

**Globals shared with other areas (must become APIs/contracts):** consumed: OS window manager & dock (`osWinOpen`, `OSW`, `OS_OPEN`, `OS_DOCK`, `renderDock`, `dkOpenX`, `osRelabel`, `desks`, `alStore`…), menus (`osMenu`, `osMenus`), i18n (`t`, `I18N`, `LANGS`, `lang`, `nf`, `loc`, `fmtD`, `fmtT`), `toast`, `DKE`, `lkRM`, `dkSuppress`, `ACCOUNTS`, `aiGetSample`. Exposed (read by Billing/Patients): `feLoad`, `feS`, `feName`, `feOpenForm`, `OS_OPEN.forms` → define a `forms` service (list forms, list fields/keys, open form) instead of global reads.

**Security / privacy (RISK):**
- Health data (test submissions incl. signature images, allergies, vitals; demo patient profile) persisted **unencrypted in localStorage** while Settings shows an "encryption" toggle that does nothing (L12905) and retention/anonymity settings are not enforced → misleading compliance UI.
- Simulated permissions: share access level, login requirement, token access, practitioner-only notes (`privnote` hidden only by a preview toggle, still stored with answers), privacy classes — none enforced.
- AI prompt sends form structure to `window.claude`; policy `aiPol` only checked in v2 path.
- CDN scripts loaded without SRI (L14082).
- `DKE` escapes `& < > "` but not `'` (OK because attributes are double-quoted; keep React's escaping on migration). Uploaded images stored as data URLs in the same store (quota issues).
- Share tokens use `Math.random` (L14295).

**Complexity estimate:** **XL** (≈2,000 dense JS lines, 80 component types, 6 tabs, 15 views, 9 dialogs, 16 menus, formula engine, logic engine, DnD, import, AI, review workflow). Uncertainty: medium — logic is self-contained and well-factored into pure helpers, but the monkey-patch layering and string-template rendering mean nearly all UI code is rewritten; backend features currently simulated (publishing, sharing, automations, notifications, tokens, retention) add unknown scope.

---

## 12. Counts summary

| Metric | Count |
|---|---|
| App views (nav entries / distinct renderers) | 15 / 12 (+ editor) |
| Editor tabs | 6 |
| Editor panels/overlays (library comps, outline, canvas, page tabs, AI bar, AI ask, AI preview, props field/section/form, preview options, drawers, toast) | 13 |
| Modals/drawers | 9 (create, AI generate, compose, duplicate, wizard[4 steps], import[4 tabs], submission review[2 tabs], autofill, a11y) |
| Context/dropdown menus | 16 |
| Component types in registry | 80 (30 base v1 + 20 base v2 + 30 presets) in 9 library groups |
| Templates | 12 |
| Seed forms / submissions / blocks | 8 / 8 / 4 |
| Builder/render components | ~60 |
| Pure-logic functions | ~25 |
| Interactions (F/P/S/D/B/N) | 182 (142 / 10 / 14 / 11 / 3 / 2) |
| Keyboard shortcuts | 16 groups |
| localStorage keys owned / touched | 2 owned (`remotion-forms`, `remotion-dk-v3`) / 2 indirect (`remotion-apps`, `remotion-desks`) |
| External integrations | 3 (window.claude sampling, pdf.js CDN, mammoth CDN) + browser APIs (clipboard, FileReader, canvas, ResizeObserver, WAAPI) |
| Apps reading this app's data | 2 (Billing, Patients) + AI connector registry |
| i18n | 4 languages × 1,290 `fe_` keys (dictionary line also carries 1,839 `dc_` keys) |
| JS LOC | 2,030 lines (L12311–L14340) + 1 dictionary line (542 k chars) |
| CSS LOC | 1,171 lines (L2604–L3774), 9 keyframes, 8 container queries |
| Function overrides (monkey-patches) | 29 |

---

## 13. Defects / inconsistencies (current vs expected)

| # | Evidence | Current behaviour | Expected | Label |
|---|---|---|---|---|
| 1 | `feImportCreate` L14096 calls `feReId` (L12505) on every imported field | All field ids change, but `logic.conds[].src`, page `skip` conditions, chart `csrc:"tbl:<id>"`, score `items[].ref`, `xv.ref`, `age.dob` still point to old ids → imported rules silently stop working (`feCondOne` returns true for missing source L13833) | Remap references with an old→new id map | FACT |
| 2 | `feSubSample` L14135 / `feSubAnswersHTML` L14136 set `feS.cur=s.form` then call `feDoc()` (L12491) | If the submission's form was "deleted forever"/trash-emptied, `feDoc()` fabricates a new blank doc under that id in `feS.docs` (persisted on next save) | Guard on missing entry | FACT (code path) / RISK |
| 3 | Domain `feMakeDoc` wrapper L14211–14220 uses `feNewField` → `feUniqKey` → `feEach` → `feDoc()` | If `feDoc()` ever lazily builds a doc for an entry whose kind is psy/physio/rehab/csat/checklist/event (doc missing), `feDoc→feMakeDoc→feNewField→feDoc` recurses without bound (doc not yet assigned) | Not reachable with current seed (such entries always get docs eagerly) | RISK (latent) |
| 4 | `feTabsHTML` L12716 | On the Editor tab only Editor/Preview/Rules/Versions tabs are shown; Share and Automations appear only when another tab is active (or via More menu) | Stable tab set | FACT (UX inconsistency) |
| 5 | `feDownload` L13146 used by "Export JSON" L13151 and "Export CSV" L13417 | Copies text to clipboard (toast says copied); MIME arg ignored; no file download | Download file (Blob) | FACT — Partial |
| 6 | Properties toggle `repeat` via generic `data-ptg` (L13348–13350) | Field repainted but properties panel not re-rendered → "max instances"/"add label" inputs (L13922) do not appear until re-selection | Re-render props | FACT |
| 7 | Table columns: props editor disables add at ≥6 (L12660) while canvas/menu allow 8 (L12589, L13197) | Inconsistent limit | Single limit | FACT |
| 8 | Page-rule condition removal L14285 only matches `data-pgc1rm…data-pgc8rm` | Conditions on pages index ≥9 cannot be removed | Generic attribute parse (as the change handler L14315 does) | FACT |
| 9 | Rules-tab builder L12849 offers 3 operators and single condition, field logic v2 offers 9 operators with AND/OR (L13831) | Inconsistent capabilities between two rule editors | Same builder | FACT |
| 10 | `fePageMenu` override L14207 | No-op (comment promises "display condition" entry) | Add menu item or remove | FACT — dead |
| 11 | `data-pw` handler L13353 and v1 `data-lg` input/change handlers L13466/L13482 | Never triggered (no elements render these attributes after overrides) | Remove | FACT — dead code |
| 12 | Settings `enc`, `mail` (L12905); form `login/accept/notif` (L12692); `limit/start/end/ret` (L13970–13971); share `access/expire/until`; field `src`; wizard `aud`; block `scope` | Stored, never read | Enforce or remove | FACT — Decorative |
| 13 | Overview/Analytics numbers L12884, L12882, L12900; analytics per-question data from `feSubSample` (identical prefill for every seeded submission) | Fake statistics presented as real | Compute from submissions | FACT — Simulated |
| 14 | `fePvNext` L13234 | Test submissions (with full answers incl. signature data URL) are saved to localStorage and counted in `resp` | Test data separated / not counted | FACT |
| 15 | `file` control L13491 | Stores only the file name; no file content | Upload | FACT — Partial |
| 16 | `feTranslate` L13096 | "Translate" only switches content language; user-typed labels remain untranslated (toast mentions count) | Real translation or clearer label | FACT |
| 17 | Empty trash L13418, Delete forever L13159 | Irreversible with no confirmation and no undo (other destructive actions have undo) | Confirm dialog | FACT |
| 18 | v2 `feAiRun` L14113 | `src` param ignored → "Generate" textarea not cleared after success (v1 cleared it, L13130); AI-create flow leaves an empty "Untitled" form if nothing is understood | Clear input; discard empty draft | FACT |
| 19 | `fePvNext` L13233 | `feEach.length&&(...)` tests function arity (always 1) — harmless but meaningless | — | FACT (code smell) |
| 20 | `feNumOf` L13805 | Nested formula/score evaluation always reads `FE.pv.vals`, ignoring the `vals` passed to `feFormulaEval` (affects analytics/sub contexts that swap vals) | Thread `vals` | FACT |
| 21 | `calc` type L12560 | Computes BMI from the *first* vitals-like object found in all values, regardless of configuration | Bind to a source field | FACT |
| 22 | Global document keydown capture L13544 | Escape while an `o-*` drawer is open is consumed even if the user is cancelling an inline edit (edit commits on blur instead of cancelling) | Let inline edit handle Esc first | INFERENCE |
| 23 | `feModal` L14004 | No focus trap, focus not restored to opener | Trap + restore | FACT |
| 24 | Billing stub `biFormList` L22801 (outside area) references undefined `feSt` and wrong `feEach` signature; overridden later at L23652 | Dead first implementation | — | FACT (adjacent) |
| 25 | `feS.set.autosave===false` L12918 | Mutations still call `feSave()` directly in many places (publish, archive, blocks, favourites, preview options, submissions), so "autosave off" only affects the debounced commit | Consistent save policy | FACT |
| 26 | A11y checker L14196 | "Keyboard" and "Reduced motion" checks hard-coded as passing | Real checks | FACT |
