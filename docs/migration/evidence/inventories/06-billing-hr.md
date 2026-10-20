# 06 · Facturation & Revenus (Billing, v61) and RH & Paie (HR & Payroll, v62–v63)

Source: `source/Remotion_Desktop.html`. All `Lnnnnn` references are FILE line numbers. This audit was read-only. Each claim is labelled FACT, INFERENCE, RISK or UNKNOWN where the distinction matters.

---

## 1. Scope and line ranges

### 1.1 JavaScript

| Block | Lines | Size | Content |
|---|---|---|---|
| Billing: domain core | L22599–L22835 | | Integer money, dates, tax, lines/totals, balances, numbering, roles, audit, pricing, invoice lifecycle, payments, quotes, recurring, appt→draft, parties, forms adapter, reporting, legal versions, store |
| Billing: synthetic seed | L22836–L22915 | | `biRng` (mulberry32-style PRNG, seed 20261012), service seed, `biSeed()` |
| Billing: shell | L22916–L23147 | | Strings `BIW` (L22917), errors `BI_ERR` (L22934), icons `BII` (L22956), page registry and nav, router, building blocks, dialogs, data table, filters, drawer, global search, event delegation |
| Billing: documents | L23148–L23297 | | A4 renderer, receipt, print, invoice list, row menu, invoice drawer, audit action names, issue/credit/correct dialogs, 7-step split editor |
| Billing: invoicing pages | L23298–L23411 | | invoices, editor, drafts, tobill, quotes, credits, recurring |
| Billing: analytics | L23411–L23546 | | SVG line chart, bars, dashboard, activity, reports, revenue-by-dimension pages, allocation, aging |
| Billing: payments | L23547–L23650 | | Payment form, transactions, record, partial, refunds, methods, reconciliation |
| Billing: catalogue/config/OS | L23651–L23823 | | Forms adapter v2, services, pricing, packages, discounts, taxes, payers/tariffs, templates, settings, numbering, legal, terms, integrations, audit, OS integration, `BI_DOC_CSS` (L23807–L23822) |
| HR: model/IO | L23824–L23971 | | Store, references, roles, derived states, validation, mutations, seed, CSV, XLSX read/write |
| HR: shell + Employees | L23972–L24113 | | Strings, icons, nav/router, shared pieces, query, KPIs, Employees page |
| HR: Employees interactions | L24114–L24203 | | Page defs, quick drawer, full profile, dialogs, row menu, bulk, print report |
| HR: wizard/import/export/events | L24204–L24344 | | 8-step add wizard, import, export, event delegation |
| HR: other pages + OS | L24345–L24442 | | Dashboard, directory, contracts, org chart, documents, leave, requests, salaries, placeholders, settings, OS integration, nav order |
| HR v63: display options | L24443–L24462 | | Column chooser, density, grouping |

LOC: billing 1,225 lines (349,037 chars); HR 639 lines (215,391 chars). No line in either range is longer than 2,248 chars.

### 1.2 CSS

| Block | Lines | Notes |
|---|---|---|
| Billing app CSS (`.bi-*`, `.bi-win`) | L5586–L5848 (44,490 chars) | Sections: nav L5603, header L5622, buttons/inputs L5640, cards/states L5672, filters/tables L5689, dashboard L5713, reports L5743, drawer L5752, dialogs/toast L5770, editor L5782, pages L5811, template designer L5821, A4 doc L5826, responsive L5829–L5848 |
| Billing A4 document CSS (`.bi-doc .d-*`) | JS string `BI_DOC_CSS` L23807–L23822, injected as `<style id="bi-doc-css">` (L23823) | Shared by the in-app preview and the print iframe |
| HR app CSS (`.hr-*`, `.hr-win`) | L5849–L6057 (47,780 chars) | Sections: nav L5862, bar L5875, buttons/inputs L5882, states L5898, page head/KPIs L5915, list/tools/filters L5923, table L5936, cards L5953, pager/bulk L5958, drawer L5963, profile L5979, dashboard L5989, directory L5995, org chart L5998, gantt L6002, requests L6007, dialogs/wizard/import L6013, responsive L6034–L6057 |
| Consumers of the hr-* set | v64 Patients L6058+, v65 Calendrier L6216+, v66 Cabinet L6343+ (plus Planning, `pl-win`) | They add their own prefixes on top of `.hr` (see §3.3) |

### 1.3 Markup

FACT: neither app has static markup. Each window body is created by `biBody()` (L22989, `div.bi`) and `hrBody()` (L24004, `div.hr`) and filled with `innerHTML`. The window classes are `bi-win` (L23797) and `hr-win` (L24431). The OS window ids are `OSW.billing` and `OSW.hrPeople`.

---

## 2. Screens, views and sub-pages

### 2.1 Billing router and page ids

- FACT: pages are registered with `biDef(id, group, {n, ic, perm, page, mount, click, input, change, key, badge, title, hidden})` (L22984) into `BI_P`.
- FACT: the nav groups are `BI_G` (L22985): `ov` Overview, `bill` Invoicing, `pay` Payments, `rev` Revenue, `cat` Catalogue, `cfg` Configuration.
- FACT: a page is visible when `biPageOk` passes (L22986). `perm` is either a string or an array where any one permission is enough.
- FACT: the state lives in `BI.ui = {view:"dash", arg, stack, navOpen, q, open, tables, drawer, dir, dash:{per:"month",ref,flt}}` (L22988).
- FACT: the router is `biGo(view, arg, {noStack})` (L23014). It keeps a back stack capped at 30 entries, and it slides content direction-aware using the order from `BI_ORDER()`. `biBack()` is at L23018.
- FACT: `biGo` is later wrapped (L23296) so that leaving `editor` calls `biEdLeave()`, which discards a fresh empty draft.
- FACT: on render, an unknown or forbidden view falls back to `dash`, or to `invoices` when the role lacks `dash` (L22991).
- FACT: `arg` is either an id string or a filter object that pages merge into their filter (e.g. L23206, L23575).

Page ids in nav order (insertion order within a group):

| Group | id | Line | perm | Purpose | States |
|---|---|---|---|---|---|
| ov | `dash` | L23481 | dash | KPI dashboard (8 KPIs), evolution chart, breakdown, outstanding mini-table, recent activity | empty per card (`biEmpty`), denied page |
| ov | `activity` | L23489 | dash | Activity feed derived from documents; type chips; "show more" in steps of 60 | empty |
| ov | `reports` | L23499 | rep.all \| rep.own | Comparison table (this month, previous month, same month last year, YTD, last YTD), 12-month chart and table, formulas, CSV | — |
| bill | `invoices` | L23298 | inv.view | Invoice list: filters, saved views, sum row, selectable table, bulk CSV and bulk issue; badge = overdue count | empty with CTA |
| bill | `editor` | L23299 | inv.draft | Split-screen 7-step invoice editor with live A4 preview | locked if issued; denied |
| bill | `drafts` | L23359 | inv.view | Drafts awaiting validation, with source and blocking-check count; badge | empty |
| bill | `tobill` | L23366 | inv.draft | Appointments from the last 30 days to bill, 5-step flow banner, "prepare all"; badge | — |
| bill | `quotes` | L23378 | qt.edit | Quote list, filters, new quote | — |
| bill | `credits` | L23396 | inv.view | Credit-note list | — |
| bill | `recurring` | L23403 | inv.draft | Recurring schedules; prepare due drafts; pause/resume; badge | — |
| bill | `templates` | L23731 | inv.view | Template designer: list, blocks, accent, font, labels, live preview | read-only without tpl.edit |
| pay | `transactions` | L23575 | pay.view | Payment ledger, method chips, saved views | — |
| pay | `record` | L23598 | pay.record | Full-page payment entry with a rules aside | inline error |
| pay | `partial` | L23606 | pay.view | Partially paid invoices; badge | — |
| pay | `refunds` | L23616 | pay.view | Refund list, mark completed or failed; badge = pending | — |
| pay | `methods` | L23623 | pay.view | Method cards with a 12-month count and amount; enable/disable toggles | — |
| pay | `recon` | L23631 | pay.recon | Reconciliation: suggestions, bank lines, unmatched payments, manual match, discrepancies, duplicates, failed, pending refunds, CSV import; badge | per-block empty |
| rev | `rev_prac` | L23518 | rep.all | Revenue by practitioner | — |
| rev | `rev_svc` | L23519 | rep.all \| rep.own | Revenue by service (line level) | — |
| rev | `rev_est` | L23520 | rep.all | By establishment | — |
| rev | `rev_payer` | L23521 | rep.all | By payer | — |
| rev | `rev_period` | L23522 | rep.all \| rep.own | Month, quarter or year buckets with chart and table | — |
| rev | `alloc` | L23526 | alloc.view | Fee-sharing (rétrocession) computation; cash/invoiced basis; rules CRUD when price.edit | — |
| rev | `outstanding` | L23538 | inv.view | Aging buckets (not due, 1–30, 31–60, 61–90, >90), by invoice or by patient | — |
| cat | `services` | L23662 | cat.view | Billable services catalogue | — |
| cat | `pricing` | L23689 | cat.view | Pricing rules | — |
| cat | `packages` | L23702 | cat.view | Packages and bundles | — |
| cat | `discounts` | L23707 | cat.view | Preset discounts | — |
| cat | `taxes` | L23714 | cat.view | Tax categories (editable with cfg.edit), "verified" checkbox | — |
| cat | `payers` | L23720 | cat.view | Payers (verify toggle) and sourced official tariffs (CCAM/NGAP…) | — |
| cfg | `settings` | L23754 | cat.view | Currency, jurisdiction, default terms, template, no-show policy, JSON export, sales journal CSV, reseed | — |
| cfg | `numbering` | L23765 | cat.view | Sequences: prefix, padding, reset | — |
| cfg | `legal` | L23769 | cat.view | Legal entity fields (versioned), establishments, practitioners (RPPS prompt) | — |
| cfg | `terms` | L23774 | cat.view | Payment terms list, add and delete | — |
| cfg | `integrations` | L23776 | cat.view | Seven static integration cards | Decorative |
| cfg | `audit` | L23785 | audit.view | Audit table with filters | — |

There are 36 pages in total (ov 3, bill 8, pay 6, rev 7, cat 6, cfg 6). FACT: when `page()` throws, the error card is rendered (`biPageHTML` L23006). A denied page shows a lock empty state (`deniedPage`).

### 2.2 Billing drawers, dialogs, menus and editor steps

Drawers (`BI_DRAWERS`, `.bi-drw`):

| Drawer | Line | Content |
|---|---|---|
| `inv` | L23220 | Header with state badge, 3 count-up figures (total/paid/balance), progress bar (paid and credited), "corrects" note, actions, tabs `doc` / `pay` (payments and credits) / `log` (audit history) |
| `cn` | L23400 | Credit note: link to invoice, print, refund (if party credit > 0), A4 preview |
| `pay` | L23591 | Payment: figures, reconciliation state, receipt print, menu, allocations list, receipt preview, log |

Dialogs (`biDialog` L23040 is a modal `<form role=dialog aria-modal>`):

- issue invoice (checklist and next number) L23240
- credit note (full or partial, reason required) L23246
- correct invoice (reason) L23250
- new/edit party L23334
- quote view (wide, read-only A4) or edit (line builder) L23380
- record payment (wide) L23347
- duplicate-payment confirm (inside the payment flows)
- payment status change L23585
- apply customer credit L23586
- refund L23587
- manual reconciliation match (in the recon click handler)
- "confirm exact matches" (recon)
- allocation rule (alloc page)
- service (2 tabs: General / Billing form) L23664
- pricing rule (with delete footer) L23690
- package L23703
- discount L23708
- new payer and sourced tariff (payers page)
- payment term (terms page)
- template delete confirm
- reseed confirm
- delete draft confirm
- bulk issue confirm
- exceptional discount confirm
- `biPrompt`, used for the saved-view name and the RPPS id

Native `confirm()` is used once, for loading the TN tax set (L23761).

Menus (`osMenu`, the shared OS context menu):

- invoice row menu L23211
- quote row menu (quotes click handler)
- payment menu L23584
- role switcher with a simulated-practitioner submenu (L23122)
- column chooser L23069
- saved views with a per-view delete submenu (L23128)
- "add service / package / preset discount" pickers in the editor

Editor steps (`BI_STEPS` L23254):

| Step | Key | Content |
|---|---|---|
| A | party | Party, payer, linked appointment |
| B | prac | Establishment, practitioner, legal summary |
| C | lines | Line editor |
| D | sum | Totals by rate |
| E | terms | Dates, terms, accepted methods, instructions |
| F | notes | Patient note, internal note, attachments, billing form |
| G | issue | Checklist |

On narrow widths (`sz=s`) the editor becomes a one-step-at-a-time stepper with prev/next (`.bi-edmob`). The preview only shows on step G (CSS L5843–L5845).

Global search (L23097–L23107): searches invoices, parties, payments and credit notes (minimum 2 characters, up to 12 results). It is a listbox with arrow, Enter and Escape keys.

### 2.3 HR router and page ids

- FACT: `hrDef(id, g, o)` (L24000) writes into `HR_P`.
- FACT: groups are `HR_G` (L24001): `top` (no header, rendered as `.hr-nsolo`), `staff`, `rec`, `time`, `pay`, `dev`, and `cfg` (no header).
- FACT: the default view is `employees` (L23826). Forbidden views fall back to `employees` (L24006).
- FACT: `hrGo` (L24021) refuses forbidden pages with a toast and keeps a 30-entry stack. There is a breadcrumb (`hrCrumb` L24015).
- FACT: the nav order is forced by L24442 to: dash, directory, employees, contracts, orgchart, hrdocs, profile, jobs, candidates, process, planning, leaves, requests, attendance, availability, replacements, salaries, expenses, payruns, payslips, declarations, reviews, training, skills, settings.

| id | g | Line | perm | Purpose |
|---|---|---|---|---|
| `dash` | top | L24349 | — | KPIs (5) and a "demo" chip, headcount by department (bars, clickable), contract mix stacked bar, upcoming contract ends, probations, absences in the next 7 days, pending-requests button, recent movements |
| `directory` | staff | L24365 | — | Card grid of contacts (no personal data), search and department filter, mailto/tel |
| `employees` | staff | L24115 | — | Main list (§2.4) |
| `contracts` | staff | L24371 | — | Contract table with situation segments and counts |
| `orgchart` | staff | L24377 | — | Recursive tree from `mgr`; expand/collapse per node and all |
| `hrdocs` | staff | L24382 | — | All documents with a type filter; upload with an "attach to employee" dialog |
| `profile` | staff (hidden) | L24116 | — | Full profile with 7 tabs (pay and personal are permission-gated) |
| `leaves` | time | L24388 | — | 28-day gantt (approved and pending hatched); ±7 days and "today" navigation |
| `requests` | time | L24394 | — | Pending requests with department-overlap warning; approve, or refuse with a reason; recent decisions; badge |
| `salaries` | pay | L24402 | pay.view | Base salaries and an indicative ×12; confidential banner |
| `jobs`, `candidates`, `process` | rec | L24407–L24408 | — | Placeholder: "Module in preparation", no actions |
| `planning`, `attendance`, `availability`, `replacements` | time | same | — | Placeholder |
| `expenses`, `payruns`, `payslips`, `declarations` | pay | same | `["pay.view","view.all"]` | Placeholder |
| `reviews`, `training`, `skills` | dev | same | — | Placeholder |
| `settings` | cfg | L24410 | — (edits need `settings`) | Departments and establishments (rename, add), contract-end alert days, permission matrix, audit (last 60), reseed |

There are 25 HR page ids: 11 real, of which 1 is hidden (`profile`), and 14 placeholders. Every page has a try/catch error state (`hrErrorState` L24017).

### 2.4 Employees screen (L24063–L24113)

- Header actions: Import, Export, More menu, Add.
- Banners: load error (`HR.loadErr`, the store was unreadable and was reseeded) and the manager-view notice.
- KPI buttons (`data-hrkpi`): total, active, trial, ending, leave, left. Each one applies a filter.
- Tools: search (shortcut `/`), filter panel toggle (count badge), reset, sort select plus direction, saved searches menu, display menu (columns, density, grouping; v63), list/cards segmented toggle.
- Filter panel: status chips, contract type chips, contract-situation chips, and selects for department, establishment, job, manager, working time, today's availability. There is also an entry-date range.
- Active filters appear as removable chips. A results counter has an "include/hide employees who left" link.
- Views:
  - Table (`hrTableHTML` L24096): sortable headers via `data-hrcol`, group rows (v63), per-row actions (view, edit, contract, documents, menu).
  - Cards (`hrCardsHTML` L24104).
  - Loading skeleton (`hrSkeleton` L24108). It is shown for about 380 ms on open, `HR.ui.loading` L24431–L24432.
  - Empty state (with or without filters).
- Pager: page size 10/25/50/100, numbered pages with ellipses.
- A bulk toolbar (`.hr-bulk`, `role=toolbar`) slides in when rows are selected.

### 2.5 HR drawer, profile tabs, dialogs and wizards

- Quick drawer (`hrDrawer` L24118, `hrDrawerPaint` L24119). It shows:
  - hero, 3 status pills (employee status, contract situation, today's availability)
  - actions: full profile, edit, contract, mailto
  - sections: role and organisation, contract, work contact, working time ring, upcoming approved leave, recent documents
  - a privacy note
- Profile tabs `HR_TABS` (L24134): `over`, `contract`, `time` (leave list and "enter a leave request" button), `docs`, `pay` (needs pay.view), `personal` (needs personal.view; reveal-on-click is logged as `emp.reveal`), `hist` (record history plus audit). Tabs support arrow keys with RTL awareness (L24341).
- Dialogs:

| Dialog | Line | Notes |
|---|---|---|
| Edit | L24160 | Per-field lock depends on `hrEditable`; reason field |
| Contract amendment | L24172 | |
| Contract view | L24176 | xl, read-only |
| Documents | L24177 | Upload and delete |
| Leave request | L24179 | |
| Record departure | L24188 | Single or bulk; date and reason |
| Archive confirm | L24191 | |
| Bulk department / manager / edit | L24192 | |
| Saved search name | L24304 | |
| Refuse leave | requests page | |
| Rename / add department or establishment | settings page | |
| Attach document | hrdocs page | |
| Delete document confirm | L24327 | |
| Reseed confirm | settings page | |
| Export | L24278 | Scope, format, columns, progress bar |

- Add wizard (`hrAddWizard` L24221), 8 steps (`HR_STEPS` L24205):
  1. `id` identity and contact
  2. `pro` job and arrival status (trial/active)
  3. `org` department, establishment, team, manager
  4. `ct` contract type, entry date, end, trial end, collective agreement
  5. `time` range slider, hours, schedule
  6. `pay` (locked state without pay.edit)
  7. `docs` (drop zone, 400 KB limit, per-file type)
  8. `rev` review: all errors in a banner, summary, privacy note

  Each step is validated by `hrWizStepErr` (L24207). Done steps can be revisited. Fields with errors get `.bad` and focus.
- Import wizard (`hrImportWizard` L24252), 5 stages:
  1. File: CSV/XLSX drop zone, CSV and XLSX template download
  2. Mapping: auto-map by synonyms; required fields are flagged
  3. Validation: ready, duplicate and error counts; per-row errors; "skip duplicates" option
  4. Preview: per-row result
  5. Report: progress bar while running, then created/skipped/failed and a downloadable CSV report
- Export dialog (L24278): scope (displayed results or selection), format (xlsx/csv), column checkboxes (sensitive ones are unchecked and padlocked), chunked progress, auto-close.
- More menu (L24328): XLSX import template, print the filtered list, show/hide employees who left.
- Row menu (L24184): quick view, profile, edit, contract, documents, mailto, copy ID, record departure, archive.
- Print report (`hrReport` L24196): an iframe with summary counts and a table; it is logged as `export`.

---

## 3. Components (builders that return HTML strings or manipulate the DOM)

### 3.1 Billing

| Function | Line | Responsibility / variants |
|---|---|---|
| `biI`/`bii` + `BII` | L22955–L22983 | Lucide-style inline SVG icon set (~75 keys); unknown keys fall back to `file` |
| `biNavHTML` | L22995 | Collapsible groups, badges (`biBadgeCount`), animated "ink" indicator (`biInk` L23008), synthetic-data chip |
| `biHeadHTML` | L23000 | Menu/back buttons, group eyebrow and title, global search, role button, "New invoice" |
| `biEmpty` | L23024 | Icon, message, optional action |
| `biSt8` + `BI_STATES` | L23025–L23031 | Status pill for 30+ states with tone classes ok/info/warn/bad/mut |
| `biToast` | L23033 | `role=status`; optional Undo (5 s), otherwise 2.4 s |
| `biAct` | L23035 | try → save → toast; catches `BiErr` |
| `biCountUp` | L23037 | `data-bicu` count-up animation (700 ms, cubic ease-out); kinds m/n/p |
| `biDialog` / `biConfirm` / `biPrompt` | L23040–L23045 | Modal form, Escape closes, submit runs `onOk` (a thrown error becomes an inline shaking message), variants `wide`, `danger`, `foot`, `ok:false` |
| `biDownload` | L23046 | BOM + Blob; uses OS `dcSaveFile` if present, otherwise an anchor download |
| `biCsv` | L23047 | `;`-separated CSV with quoting |
| `biOpts` + option helpers | L23050–L23052 | `<option>` builder |
| `biTable` | L23057 | Generic table: sortable `aria-sort` headers, pagination, column visibility (persisted in `set.cols`), row selection with page select-all, bulk bar slot, tools slot, CSV export, footer, row click and keyboard open, `--i` stagger |
| `biTblCsv`, `biTblCols` | L23068–L23069 | CSV of visible columns; column menu |
| `biFltHTML` | L23075 | Shared filter bar: search, period (`BI_PERS` L23073 incl. custom range), status, practitioner (hidden for prac role), establishment, payer, min/max amount, reset, saved views |
| `biDrawer` / `biDrawerPaint` | L23090–L23093 | Side drawer; scrim only below the `l` size; highlights the source row; repaint wrapper fits docs (L23356) |
| `biDocHTML` | L23161 | A4 document for inv/cn/qt. Template blocks: logo, legal, meta, party, lines, totals, pay, notes, custom (form fields), footer. Labels are localized per template `lang`, with custom label overrides. Watermark DRAFT; stamps PAID or CANCELLED; RTL for ar; uses the frozen snapshot once issued |
| `biReceiptHTML` | L23180 | Payment receipt with allocations, unallocated amount and status stamp |
| `biPrint` | L23186 | Hidden iframe + `document.write` + `print()` |
| `biFitDocs` | L23189 | Scales 794 px A4 previews to the container (`--k`) |
| `biInvRows`/`biInvCols`/`biInvListHTML` | L23192–L23210 | Invoice list model and columns |
| `biEdHTML`/`biEdSec`/`biEdBar`/`biEdPaint` | L23256–L23294 | Editor shell, per-section HTML, sticky totals bar (animated total), debounced (110 ms) partial repaint of preview/sum/issue/step-OK |
| `biEdFormHTML` | L23286 | Billing-form fields block |
| `biPartyDlg` | L23334 | Party create/edit |
| `biLineChart` | L23415 | Responsive SVG line/area chart: nice axis (`biAxisNice` L23412), short money labels, draw-on animation (pathLength), crosshair, tooltip on pointermove |
| `biBarsHTML`, `biLegend` | L23426–L23428 | Horizontal dual bars with drill-down `data-bigo` |
| `biBrkHTML`, `biOutMini`, `biFeed`/`biFeedHTML` | L23462–L23477 | Dashboard breakdown, outstanding mini table, activity feed |
| `biPayFormHTML`, `biPaySumHTML`, `biAutoAlloc`, `biPayBind`, `biPaySubmit` | L23551–L23567 | Payment entry shared by the dialog and the `record` page; oldest-due-first auto-allocation until the user touches an allocation |
| `biSvcDlg`, `biRuleDlg`, `biPkgDlg`, `biDiscDlg` | L23664–L23708 | Catalogue editors |
| `biCfgField` | L23753 | Settings field |
| `biDockBtn`, `biOpen` | L23791–L23798 | Dock button and window open |

### 3.2 HR

| Function | Line | Responsibility |
|---|---|---|
| `hrI`/`hri` + `HRI` | L23978–L23990, `HRI.cols` added L24444 | Icon set |
| `hrNavHTML`, `hrBarHTML`, `hrCrumb` | L24009–L24015 | Nav with solo groups and "soon" tags, bar with breadcrumb and role button |
| `hrEmpty`, `hrStBadge`, `hrCsBadge`, `hrAvailLine`, `hrAvatar` | L24030–L24035 | State pieces; avatar colour hashed from the matricule; leave dot |
| `hrToast`, `hrAct`, `hrCount` | L24036–L24038 | Same pattern as billing |
| `hrDialog`, `hrConfirm` | L24039–L24043 | Modal with variants `wide`, `xl`, `icon`, `cancel:false`, `cancelLabel`, `m._close` |
| `hrDownload`, `hrOpts`, option helpers | L24044–L24047 | |
| `hrFiltersHTML`, `hrChipsHTML`, `hrTh`, `hrTableHTML`, `hrCardsHTML`, `hrSkeleton`, `hrBulkHTML` | L24078–L24110 | Employees list pieces |
| `hrListPaint` | L24112 | In-place repaint that keeps focus and caret |
| `hrDrawerPaint`, `hrProfileHTML`, `hrContractHTML`, `hrDocsHTML` | L24119–L24158 | |
| `hrWizBody` | L24208 | Wizard step renderer |
| `hrKp`, `hrPageHead` | L24346–L24347 | Shared KPI button and page head for secondary pages |
| `hrGroupRow`, `hrColCls`, `hrColsMenu` | L24448–L24460 | v63 display options |
| `hrCsv`, `hrParseCsv`, `hrReadXlsx`, `hrXlsx`, `hrZip`, `hrCrc` | L23946–L23971 | File IO. `hrReadXlsx` uses the OS `unzip` (L15689) and DOMParser, and resolves sheet1 through workbook rels. `hrXlsx` writes a stored (uncompressed) zip with inline strings, a bold header style and a frozen first row |

### 3.3 Shared hr-* component set (reused by Patients v64, Calendrier v65, Cabinet v66, Planning)

FACT: later apps open windows with `cls:"hr-win pa-win" | "hr-win cl-win" | "hr-win cb-win" | "hr-win pl-win"` and roots `className="hr pa" | "hr clapp" | "hr cbapp" | "hr plapp"`. This means they inherit all `--hr-*` tokens and every `.hr .hr-*` rule.

Class usage counts in JS after L24462 (the most used):

| Class | Uses |
|---|---|
| `hr-in` | 325 |
| `hr-btn` | 130 |
| `hr-mut` | 114 |
| `hr-card` | 77 |
| `hr-ib` | 64 |
| `hr-chk` | 51 |
| `hr-flds` | 50 |
| `hr-lnk` | 34 |
| `hr-ph` | 32 |
| `hr-mini` | 29 |
| `hr-mono` | 28 |
| `hr-dlg` | 28 |
| `hr-note` | 23 |
| `hr-scrim` | 19 |
| `hr-fld` | 19 |
| `hr-banner` | 19 |
| `hr-pg` | 18 |
| `hr-nav` | 18 |
| `hr-tb` | 17 |
| `hr-nl` | 15 |
| `hr-dl` | 14 |
| `hr-tbs` | 13 |
| `hr-seg` | 13 |
| `hr-ch` | 13 |
| `hr-dgrid` | 12 |
| `hr-cnt` | 12 |
| `hr-drw` | 10 |
| `hr-cmsg` | 10 |
| `hr-bar` | 10 |

Less used: `hr-menuh`, `hr-kpi(s)`, `hr-toast`, `hr-err`, `hr-chks`, `hr-state`, `hr-search`, `hr-ns/nh/ni/nb/nsolo/ink/navx/navf/brand/syn/menu/main/crumb/role`, `hr-warnt`, `hr-tl`, `hr-racts`, `hr-bars`, `hr-chip`, `hr-wpane`, `hr-wsteps`, `hr-dbody/dh/dacts`, `hr-tools`, `hr-who`, `hr-pl`, `hr-perm`, `hr-fpanel/fgrid/fc`, `hr-st`, `hr-sortsel`, `hr-rc`, `hr-pager`, `hr-list`, `hr-legend`, `hr-drop`, `hr-avt`, `hr-yes`.

The shared set by family, with CSS line ranges:

| Family | Classes | CSS |
|---|---|---|
| Window/root/tokens | `.hr-win` tokens, `.hr` grid root with `data-sz` s/m/l, `.hr .sp`, `.hr .sr`, `.hr-mono`, `.hr-mut` | L5850–L5861 |
| App shell nav | `.hr-nav .hr-brand .hr-nl .hr-ink .hr-ns .hr-nh .hr-nb .hr-ni .hr-nsolo .hr-navx .hr-navf .hr-syn` | L5862–L5874 |
| Bar | `.hr-main .hr-bar .hr-menu .hr-crumb .hr-role .hr-menuh .hr-pg` | L5875–L5881 |
| Controls | `.hr-btn` (pri/ghost/danger/danger-pri/sm/on), `.hr-ib` (sm/bd), `.hr-in` (sm/num), `.hr-lnk`, `.hr-chk(s)`, `.hr-seg`, `.hr-fld(s)`, `.hr-tools` | L5882–L5897 |
| States | `.hr-card .hr-ch .hr-state` (err/soon/sm), `.hr-banner` (err/ok), `.hr-note .hr-err .hr-cmsg .hr-warnt .hr-st .hr-cs .hr-ct .hr-av .hr-yes` | L5898–L5914 |
| Page head / KPI | `.hr-ph .hr-kpis .hr-kpi .hr-demo` | L5915–L5922 |
| List tools / filters | `.hr-search .hr-fpanel .hr-fgrid .hr-chip(s) .hr-achip .hr-fc .hr-rc .hr-legend .hr-rng .hr-sortsel .hr-boxed` | L5923–L5935 |
| Table | `.hr-tbs .hr-tb` (anim/sm/sk/dense/h-*), `.hr-who .hr-avt .hr-pl .hr-mgr .hr-racts .hr-job` | L5936–L5952 |
| Cards / pager / bulk | `.hr-cards .hr-ecard .hr-pager .hr-pn .hr-bulk .hr-sep` | L5953–L5962 |
| Drawer | `.hr-drw .hr-scrim .hr-dh .hr-dstat .hr-dacts .hr-dbody .hr-dl .hr-mini .hr-wt .hr-lt` | L5963–L5978 |
| Profile | `.hr-prof .hr-phead .hr-tabs` (sliding ink via `--i/--n`), `.hr-tabp .hr-pgrid .hr-tl .hr-people .hr-span .hr-cbig .hr-masked` | L5979–L5988 |
| Dashboard | `.hr-dgrid .hr-bars .hr-stack .hr-leg` | L5989–L5994 |
| Directory / org / gantt / requests | `.hr-dir .hr-dcard`, `.hr-otree .hr-onode .hr-oc .hr-otog .hr-org`, `.hr-gantt`, `.hr-reqs .hr-cnt .hr-perm .hr-inline .hr-acts` | L5995–L6012 |
| Dialog / wizard / import / toast | `.hr-dlg .bx` (wide/xl/wiz), `.hr-wsteps .hr-wbody .hr-wpane .hr-drop .hr-range .hr-rev .hr-impk .hr-errl .hr-map .hr-prog .hr-who-list .hr-toast` | L6013–L6033 |
| Responsive | `.hr[data-sz="s"]` (35 rules), `.hr[data-sz="m"]` (2 rules), `.hr-grp` | L6034–L6057 |

FACT: these JS helpers are reused globally by later apps (counts from L24463 onward):

| Helper | Uses |
|---|---|
| `hrE` | 2,386 |
| `hri` | 581 |
| `hrRM` | 70 |
| `hrNf` | 16 |
| `hrCount` | 4 |
| `hrSt` | 3 |

`hrSt` is called by `rmHrEmp` L24510, `rmEsts` L24519 and Calendar `clHrLeaves` L25494, which reads approved HR leaves. RISK: the HR app is a hidden dependency of the healthcare suite. The shared kit must be extracted before HR can be migrated alone.

---

## 4. Interaction inventory

Classification: **F** = Functional (read end-to-end), **S** = Simulated (demo data or fake backend), **P** = Partial, **D** = Decorative, **PV** = Present, not verified in depth.

### 4.1 Billing

| # | Control (attribute / location) | Line | Class |
|---|---|---|---|
| 1 | Nav item `data-bigo` (and every drill-down/KPI `data-bigo`+`data-biarg`) | L23111 | F |
| 2 | Nav group toggle `data-bitog` (animated height) | L23113 | F |
| 3 | Back `data-biback` | L23112 | F |
| 4 | Mobile nav toggle / close `data-binav`, scrim `data-biscrim` | L23114–L23115 | F |
| 5 | "New invoice" `data-binew` | L23116 | F |
| 6 | Role switch menu `data-birole` + simulated practitioner submenu | L23117 | S (client-side roles) |
| 7 | Global search input `data-bigs`, result click `data-bigsk`, ↑/↓/Enter/Esc | L23103, L23132, L23139 | F |
| 8 | Table sort `data-bisort`, pager `data-bipage`, row select `data-bisel`, select-all `data-biselall`, clear `data-biselx` | L23119–L23124 | F |
| 9 | Table CSV `data-bicsv`, columns menu `data-bicols` (persisted) | L23125–L23126 | F |
| 10 | Filter inputs `data-bif` (debounced 180 ms; select/date immediate), reset `data-bifreset` | L23133, L23137 | F |
| 11 | Saved views menu `data-biviews` (apply, delete, save) | L23128 | F |
| 12 | Open drawer `data-bidrw`, close `data-bidrwx`, row click / Enter / Space via `BI_TBL[id].open`, row ↑/↓ focus | L23129–L23131, L23142–L23144 | F |
| 13 | Escape closes drawer → nav (unless a dialog is open) | L23141 | F |
| 14 | Nav ↑/↓ roving focus | L23145 | F |
| 15 | Invoice row menu `data-biinvm`: preview, edit, issue…, delete draft, record payment…, credit note…, correct…, print, duplicate | L23211 | F |
| 16 | Issue `data-biissue` (dialog, then `biCelebrate` stamp animation and redirect) | L23347, L23240–L23245 | F |
| 17 | Record payment `data-bipay` (dialog) | L23348 | F |
| 18 | Credit note `data-bicredit` | L23349 | F |
| 19 | Print `data-biprint` inv/cn/qt/pay (iframe print) | L23351 | F |
| 20 | Drawer tabs `data-bidtab` | L23352 | F |
| 21 | Bulk CSV / bulk issue `data-bibulk` (issues sorted by date; skips failures) | L23353 | F |
| 22 | Editor step tabs `data-bistep`, mobile prev/next `data-bistepd` | L23319–L23320 | F |
| 23 | Editor field inputs `data-ed` (party, payer, appt, est, prac, issue, terms, due, instr, note, inote, tpl) | L23303, L23309 | F |
| 24 | Line inputs `data-el` desc/qty/unit/dp/ref (live parse with inline error), svc/tax/date | L23305–L23316 | F |
| 25 | Line move up / down / duplicate / delete (FLIP animation, Undo toast on delete) `data-elm` | L23322–L23327 | F |
| 26 | Line drag handle (`span.drag`, aria-hidden, no drag&drop code) | L23270 | D |
| 27 | Add line: catalogue service (menu with resolved price), free line, package, preset discount (approval gate) `data-biline` | L23328–L23331 | F |
| 28 | Accepted methods checkboxes `data-edm` | L23312 | F |
| 29 | Attach files `data-bifile` (≤400 KB, data URL), remove `data-bifdel` | L23317, L23332 | F (stored in localStorage) |
| 30 | Attach billing form `data-biform`; form field inputs `data-edf` | L23333, L23306 | F (depends on Forms app) |
| 31 | New/edit party `data-biparty` | L23334 | F |
| 32 | Editor print preview `data-biedprint` | L23335 | F |
| 33 | Drafts table row → editor; Edit button | L23359 | F |
| 34 | To-bill: prepare one `data-biappt`, prepare all `data-biapptall` | L23376–L23377 | F on S data |
| 35 | Quotes: new `data-biqnew`, row menu `data-biqm` (open, finalise+send, accept, refuse, convert, print), quote dialog add/remove line | L23392–L23395, L23380 | F |
| 36 | Credits list row → drawer; invoice link; print | L23396–L23399 | F |
| 37 | Refund from credit-note drawer `data-birefund` | L23595 | F |
| 38 | Recurring: prepare one `data-birc`, prepare all due `data-bircall`, pause/resume `data-birct` | L23410 | F |
| 39 | Dashboard period segment `data-biper`, prev/next/today `data-bipnav`, filters `data-bidf`, breakdown dimension `data-bibrk`, KPI cards (drill), feed items `data-bifeed`, bar labels (drill) | L23481–L23486 | F |
| 40 | Chart hover crosshair/tooltip (pointer only) | L23422–L23424 | F (no keyboard) |
| 41 | Activity type chips `data-bity`, "show more" `data-bimore` | L23497 | F |
| 42 | Reports CSV `data-birepcsv` (both buttons export the 12-month CSV) | L23517 | P (see §13) |
| 43 | Revenue-period granularity `data-birevg` | L23525 | F |
| 44 | Alloc basis `data-bialb`, add rule `data-bialadd`, delete rule `data-bialdel` | L23535–L23537 | F |
| 45 | Outstanding by invoice / patient `data-bioutp` | L23545 | F |
| 46 | Payment form: party, date, amount (auto-alloc), method, ref, status, allocation checkbox/amount `data-pac`/`data-paa`, keep-credit | L23561–L23566 | F |
| 47 | Duplicate-payment confirm, then "record anyway" | L23574, L23604 | F |
| 48 | Transactions method chips `data-bitm` | L23583 | F |
| 49 | Payment menu `data-bipm`: details, print receipt, confirm receipt, mark reversed, mark failed, apply excess, refund credit | L23584 | F (S: no PSP) |
| 50 | Record page: clear `data-bireset`, submit `data-birecok` | L23604 | F |
| 51 | Refund create `data-birefund`, mark done/failed `data-birfst` | L23587, L23622, L23648 | F (S: no bank) |
| 52 | Method enable/disable `data-bimeth` (≥1 must stay) | L23627 | F |
| 53 | Recon: accept suggestion `data-birm`, accept all exact `data-birmall`, radio picks `data-rcb`/`data-rcp`, manual match `data-birman`, import CSV statement `data-biimp` | L23645–L23650 | F on S data |
| 54 | Services: new `data-bisvc`, row → dialog (2 tabs, form mapping) | L23662–L23688 | F |
| 55 | Pricing rule new `data-birule`, row → dialog, delete | L23689–L23701 | F |
| 56 | Package new `data-bipkg`, row dialog | L23702–L23706 | F |
| 57 | Discount new `data-bidisc`, row dialog | L23707–L23713 | F |
| 58 | Tax rate/mention inputs `data-tx` (resets verified), verified toggle `data-txv` | L23719 | F |
| 59 | Payer verify `data-bipyv`, add payer `data-bipy`, add tariff `data-bitf`, tariff verified `data-bitfv` | L23727–L23730 | F |
| 60 | Template: select `data-bitpl`, duplicate `data-bitpladd`, set default `data-bitpldef`, delete `data-bitpldel`, print `data-bitplprint`, block toggle `data-bitb` (mandatory locked), block up/down `data-bitm`, name/accent/font `data-bitv`, labels `data-bitl`, live accent `input` | L23735–L23744 | F |
| 61 | Template block drag handle | L23734 | D |
| 62 | Settings fields `data-bis` (cur, juris + native confirm, terms, tpl, noshow.on/fee), JSON export `data-bijson`, sales journal `data-bisales`, reseed `data-bireseed` | L23761–L23764 | F |
| 63 | Numbering fields `data-biseq` (prefix sanitised, pad, reset) | L23768 | F |
| 64 | Legal fields `data-bilg`, RPPS prompt `data-birpps` | L23772–L23773 | F |
| 65 | Terms add `data-bitra`, delete `data-bitrd` | L23775 | F |
| 66 | Integration cards | L23776–L23784 | D |
| 67 | Audit filters/table/CSV | L23785 | F |
| 68 | Dock button, desktop icon (`dkOpenX` wrap), `OS_OPEN.billing` | L23791–L23801 | F |
| 69 | Cross-tab `storage` event reload | L23805 | F |
| 70 | Window resize → size class, ink, doc fit, editor re-render on size change | L23798 | F |

### 4.2 HR

| # | Control | Line | Class |
|---|---|---|---|
| 1 | Nav `data-hrgo` (also breadcrumb, buttons), group toggle `data-hrtog`, back `data-hrback`, nav open `data-hrnav`, scrim | L24287–L24291 | F |
| 2 | Role switch `data-hrrole` + simulated manager submenu | L24292 | S |
| 3 | KPI buttons `data-hrkpi` (dashboard and employees) | L24293 | F |
| 4 | Filter panel toggle `data-hrfilt`, reset `data-hrfreset`, chip toggles `data-hrfc`, chip remove `data-hrfx`, selects/dates `data-hrf` | L24294–L24297, L24333 | F |
| 5 | Search `data-hrq` (debounce 140 ms), `/` shortcut | L24331, L24338 | F |
| 6 | Sort select `data-hrsort`, direction `data-hrdir`, header sort `data-hrcol` | L24298–L24299, L24334 | F |
| 7 | List/cards `data-hrview` | L24300 | F |
| 8 | Include/hide left `data-hrleft` | L24301 | F |
| 9 | Dismiss load-error banner `data-hrerrx` | L24302 | F |
| 10 | Display menu `data-hrcols` (columns, density, grouping, reset) | L24303, L24452 | F |
| 11 | Saved searches menu `data-hrsaved` (4 presets + user saved, delete, save) | L24304 | F |
| 12 | Row select `data-hrsel` with Shift-range, page select-all `data-hrselall` (indeterminate), clear `data-hrselx` | L24305–L24307 | F |
| 13 | Pager prev/next `data-hrpg`, page number `data-hrpgn`, size `data-hrsize` | L24308–L24309, L24334 | F |
| 14 | Open profile `data-hropen`, edit `data-hredit`, contract `data-hrcontract`, documents `data-hrdocs`, amendment `data-hramend`, row menu `data-hrrm`, person chip → drawer `data-hrmgr`, drawer close `data-hrdx` | L24310–L24317 | F |
| 15 | Row click / Enter → drawer; Space toggles select; ↑/↓ row focus | L24329, L24340 | F |
| 16 | Add wizard `data-hradd` (8 steps, drag&drop files, range slider) | L24318, L24221 | F |
| 17 | Import wizard `data-hrimport` (drag&drop, mapping selects, options, template download, report CSV) | L24319, L24252 | F |
| 18 | Export `data-hrexport` all/sel | L24320, L24278 | F |
| 19 | Bulk `data-hrbulk`: export, department, manager (Undo toast), edit, departure, archive, report | L24192 | F |
| 20 | Profile tabs `data-hrtab` (click and ←/→) | L24323, L24341 | F |
| 21 | Reveal / hide personal data `data-hrreveal`/`data-hrhide` (logged) | L24324–L24325 | F |
| 22 | Leave request `data-hrleave` | L24326 | F (not permission-gated, §13) |
| 23 | Document open `data-hrdocdl` (fetch dataURL → download), delete `data-hrdocdel`, upload `data-hrdocup` (type guessed from filename) | L24327–L24328, L24335 | F (demo docs: metadata only) |
| 24 | More menu `data-hrmore` (XLSX template, print list, show left) | L24328 | F |
| 25 | Copy ID (clipboard), mailto/tel links | L24184, L24125 | F |
| 26 | Dashboard department bars `data-hrdkpi` | L24363 | F |
| 27 | Directory search `data-hrdq` and department `data-hrdd` | L24369 | F |
| 28 | Contracts situation segment `data-hrcf` | L24375 | F |
| 29 | Org chart node toggle `data-hroc`, expand/collapse all `data-hrocall` | L24380 | F |
| 30 | HR docs type segment `data-hrdt`, upload + attach dialog `data-hrdocany` | L24386 | F |
| 31 | Leave gantt navigation `data-hrlo` (−7/today/+7) | L24393 | F |
| 32 | Requests approve `data-hrlok` (row animation), refuse `data-hrlref` (reason required) | L24400–L24401 | F |
| 33 | Settings rename `data-hrren`, add `data-hradd2`, alert days `data-hrend` (7–180), reseed `data-hrreseed` | L24417–L24420 | F |
| 34 | 14 placeholder module pages | L24408 | D (intentionally no actions) |
| 35 | Escape closes drawer → nav; arrow keys in the nav | L24339, L24341 | F |
| 36 | Dock / desktop / OS_OPEN / storage event / resize | L24425–L24440 | F |

### 4.3 Counts (approximate, grouped controls as listed above)

| App | F | S | P | D | Total groups |
|---|---|---|---|---|---|
| Billing | 63 | 3 standalone (role switch, PSP/bank-dependent flows also marked F-on-S) | 1 (report CSV) | 3 (2 drag handles, integration cards) | 70 |
| HR | 34 | 1 (role switch) | 0 (leave button is F but un-gated) | 1 (14 placeholders) | 36 |

Billing has about 150 distinct `data-bi*` hooks and HR about 72 distinct `data-hr*` hooks (from a grep of attribute names).

---

## 5. User journeys

### J1 · Appointment → draft → issue → payment (billing)

1. `tobill` (L23366) → "Prepare draft" calls `biApptDraft` (L22784). It blocks:
   - a second invoice (`bi_eDupAppt` unless the existing one is cancelled)
   - cancelled appointments
   - future appointments
   - a no-show when no policy is enabled
2. The no-show line uses `set.noshow.fee` and tax `n20`. A normal appointment line is priced by `biPrice` (most-specific rule).
3. Navigation goes to `editor` (L23299). The user edits fields and the preview re-renders (110 ms debounce). Each step shows an OK tick.
4. Issue: the dialog (L23240) shows blocking errors (no OK button when any exist), warnings and the peeked next number.
5. `biIssue` (L22732) checks permissions, the lock and `biCheck`, assigns a gap-free number (`biNextNo`), freezes `snap`, and logs. The editor shows a stamp animation, then opens the invoice drawer.
6. Record payment (drawer or row menu) → payment dialog. The amount is prefilled with the balance. `biPay` (L22752) validates allocations (`bi_eOverpay`, `bi_eAllocSum`, `bi_eUnapplied` unless keep-credit is ticked), checks duplicates (confirm to override) and idempotency (`idem`).
7. Failure paths:
   - a permission error becomes a toast
   - a missing address shows an inline checklist item (seeded party #4, L22877)
   - a chronology error appears when the issue date is earlier than the last numbered invoice of that year (`bi_eChrono`)
8. Cancel: closing the dialog. Leaving the editor with an empty fresh draft deletes it (`biEdLeave` L23295).

### J2 · Correction of an issued invoice

Row menu → "Correct…" (L23250). A reason is required. `biCorrect` (L22747) issues a credit note for the remaining amount and duplicates the lines into a new draft (`corrects` = original id, `appt` re-linked). The editor then opens. Any prior payments become party credit, which can be refunded or applied.

### J3 · Quote lifecycle

1. New quote dialog (party, practitioner, validity, lines) → status `draft`.
2. Menu "Finalise and send" → `biQuoteSend` (number and snapshot).
3. Accept or refuse.
4. "Convert to invoice draft" → `biQuoteToInv`, then the editor.
5. Validity expiry is derived (`biQuoteState`): an expired quote cannot be accepted.

### J4 · Reconciliation

1. Import a bank CSV (date; label; amount; header skipped; dd/mm/yyyy accepted; duplicates by date+amount+label skipped).
2. Accept suggestions. They match within ±6 days, with exact amounts or a difference of at most 2.00 (score `diff<=200`).
3. Or pick one bank line and one payment, then "Match selection…" (an optional note goes into a dialog).
4. A different amount marks the payment as `discrepancy`. There is no "unmatch".

### J5 · Refund after credit note on a paid invoice

Credit note → the drawer shows "Refund" when the party credit is greater than 0. `biRefund` limits the amount to the available credit. The refund is created as `pending`; then Refunds/Recon → "Completed" or "Failed".

### J6 · Add employee (HR)

"Add an employee" → 8-step wizard. Each Next validates its step (required fields, email format, contract end for CDD/alt/stage, working time 1–100, hours 1–60, manager loops, duplicates by email or name+birth). The review step re-validates all steps. `hrCreate` assigns `id` and `EMP-####`. The list is reset to sort by entry date descending, and the new row flashes and scrolls into view. Cancel at any step leaves nothing.

### J7 · Import employees (HR)

1. Drop a CSV/XLSX file. Fewer than 2 rows raises an error toast.
2. Mapping: required columns must be mapped, otherwise an inline error is shown.
3. Validation: each row is checked (references to department, establishment and manager, status vocabulary, duplicates also within the file, matricule duplicates).
4. Preview, then Import. Rows are processed in chunks of 3 every 120 ms with a progress bar. Manager temp ids resolve to the new real ids.
5. Report: counts and a downloadable CSV. Rows with errors are never imported.

### J8 · Leave request → approval

1. Profile → Time tab → "Enter a leave request". Overlaps with non-refused requests are rejected. The request is created as `pending`.
2. Requests page (manager or HR) → approve, or refuse with a reason. A manager cannot decide their own request (`hrLeaveDecide` L23912).
3. Approved leave changes today's availability, the gantt, the drawer, and Calendar availability (`clHrLeaves` L25494).

### J9 · Departure and archive

Row menu or bulk → "Record a departure" (date and reason required). The status becomes `left`, `leftOn` is set and the contract end is clipped. An admin can then "Archive" (left only). The record is never deleted.

### J10 · Export

- HR: export dialog → columns (sensitive ones are opt-in) → CSV/XLSX download through `dcSaveFile` or an anchor. The export is logged.
- Billing: the table CSV, the JSON full dump, or the sales journal.

---

## 6. State and persistence

### 6.1 Storage keys (exact)

| Key | Const | Line | Content |
|---|---|---|---|
| `remotion-billing` | `BI_KEY` | L22601 | Whole billing store, JSON, `v:1` |
| `remotion-hr` | `HR_KEY` | L23825 | Whole HR store, JSON, `v:1` |
| `remotion-dk-bill1` | — | L23804 | One-time flag: desktop-1 shortcut installed |
| `remotion-dk-hr1` | — | L24439 | Same for HR |

OS-managed stores are also touched: `alStore.inst.billing` / `alStore.inst.hrPeople` via `alSave()`, and `desks` via `saveDesks()`. Their keys are defined outside this area (UNKNOWN here).

Versioning and migrations:

- FACT: there is no migration. `biSt()` (L22834) reseeds when the store is missing or `v!==1`.
- FACT: `hrSt()` (L23941) reseeds when the store is missing, `v!==1` or `emps` is not an array. It sets `HR.loadErr`, which shows a banner. A JSON parse error is swallowed silently in billing and flagged in HR.
- Saves are debounced 200 ms (`biSave` L22833, `hrSave` L23942). Save errors only go to `console.warn` (RISK: quota exceeded = silent data loss).

### 6.2 Billing store schema (`biSeed` L22856)

```
{v:1, seeded, synthetic, role, mePrac,
 set:{cur, juris, terms, tpl, noshow:{on,fee}, remind:[7,30] (unused), views:[{t,n,f}], cols:{tableId:[hidden]}, methods?:[...]},
 legal:{name,form,addr,siret,vat,phone,email,iban,bic,footer,logo}, legalVers:{lvN:{...}},
 ests[{id,name,addr,finess}], pracs[{id,name,prof,status,rpps,ests[]}],
 parties[{id,first,last,org?,addr,email,phone,payer,synthetic}],
 payers[{id,name,kind,ref,verified}],
 services[{id,n(4-lang),cat,profs[],dur,price,tax,unit,qty,on,from,to,ests[],form,formMap{},req[],official{code}|null,note}],
 rules[{id,svc,est?,prac?,payer?,kind:"pct"|"fixed",val,from?,to?,on,n}],
 pkgs[{id,n,svc,count,price,on}|{…,items:[[svc,n]]}], discounts[{id,n,kind,val,approve,on}],
 taxes[{id,n,bp,mention,verified,verifiedBy?}], tariffs[{sys,code,label,amount,ver,src,verified}],
 terms[{days,n}], seqs{inv|cn|qt|pay|rf:{p,pad,reset,c{year:n},last{year:date}}},
 templates[{id,name,accent,font,blocks[],labels{},lang}],
 alloc[{id,prac,svc?,model,val,on,basis,n}],
 invoices[{id,kind:"inv",status,no,party,prac,est,payer,appt,issue,due,terms,lines[],note,inote,tpl,cur,files[{n,s,t,d(dataURL)}],form,formData,created,upd,issuedAt,snap,methods,instr,disc,recur,quote,corrects,_fresh,_lock}],
 credits[{id,kind:"cn",status:"issued",inv,party,prac,est,payer,issue,lines,reason,cur,tpl,no,snap}],
 payments[{id,no,party,date,amount,method,ref,status,alloc[{inv,amt}],note,idem,recon,cur,at,bank?}],
 refunds[{id,no,party,amount,method,date,status,cn,reason,ref,cur,doneAt?}],
 quotes[{id,kind:"qt",status,no,party,prac,est,payer,issue,valid,lines,note,cur,tpl,snap?,inv?}],
 recurring[{id,name,party,prac,est,payer,lines,every,next,end,on,count,note,last?}],
 appts[{id,date,party,prac,est,svc,payer,status,inv,ref?,src?,synthetic}],
 bank[{id,date,amount,label,match,imported?}], audit[{id,ts,role,user,act,ent,ref,detail}] (cap 3000),
 formsLocal[], integ{pay,einv,pdf,refdata} (unused)}
```

- Line shape: `{id, svc, desc, qty (thousandths), unit (minor units), dp (discount bp) | da (discount minor), tax, date, ref, code, rule, pkg?}` (L22649).
- Snapshot (`biSnap` L22736): `{at, tot:{gross,disc,net,tax,total,rates[{tax,bp,base,amt,mention}]}, lines[+c], party, prac, est, legal:"lvN", payer, terms, form, cur}`.

### 6.3 HR store schema (`hrSeed` L23915)

```
{v:1, seeded, synthetic, role:"hr"|"manager"|"payroll"|"admin", meMgr,
 set:{endAlert:60, cards:false (unused), saved:[{n,f}], hide:[cols], dense, group},
 org, ests[{id,n}], depts[{id,n(4-lang)}],
 emps[{id:"eN", mat:"EMP-####", first,last,title,job,dept,est,team,mgr,email,phone,entry,
   contract:{type,start,end,trialEnd,cc,hist[{d,t}]}, status, wt(%), hours, schedule(4-lang),
   pay:{gross(minor),period,cur,note?}, birth, addr, emergency, leaves[{id,type,from,to,st,days,by?,at?,why?}],
   docs[{id,type,d,name,size,file(dataURL|null),mime?}], hist[{d,t}], suspension?, leftOn?, archived?, created?, synthetic}],
 audit[{id,ts,role,user,act,ref,detail}] (cap 2000)}
```

### 6.4 In-memory UI state (not persisted)

- Billing `BI.ui` (L22988): view, arg, stack, open groups, tables `{sort,dir,page,size,hidden}`, sel, flt per page, drawer, dtab, step, raw (unparsed line inputs), payst (record page draft), rcsel, revg, albasis, outByP, actN, tpl, dash.
- `BI.today` and `HR.today` exist as test hooks to override the date (L22626, L23830).
- HR `HR.ui` (L23826): view, arg, stack, flt, sort, dir, page, size, sel, anchor, cards, open, drawer, loading, quiet, flash, fopen, ptab, reveal, group, dq, dd, cf, oc, dt, lofs, rows, ndir.

### 6.5 Timers and events

| Timer | Delay | Line |
|---|---|---|
| Billing filter input debounce | 180 ms | L23133 |
| Editor repaint | 110 ms | L23291 |
| Toasts | 2.4 s, 5 s with Undo | L23033 |
| Celebrate redirect | 900 ms | L23244 |
| Saves (both apps) | 200 ms | L22833, L23942 |
| HR search debounce | 140 ms | L24331 |
| HR directory search | 140 ms | L24369 |
| HR loading skeleton | 380 ms | L24432 |
| Import tick | 120 ms per 3 rows | L24272 |
| Export step | 60 ms per 4 rows | L24283 |

- Cross-tab sync: `storage` listeners reload a store and refresh when the window is open (L23805, L24440).
- Cross-app bus: none. Integration goes through direct global function calls (§7).

---

## 7. Integrations and external dependencies

| Kind | Detail | Line |
|---|---|---|
| Network | None. `fetch()` is only used on a `data:` URL to rebuild a Blob (L24327) | — |
| CDN libraries | None | — |
| `window.claude` | Not used | — |
| Browser APIs | localStorage; Blob/`URL.createObjectURL`; hidden-iframe `print()` (L23186, L24196); FileReader (`readAsDataURL`, `readAsText`) (L23317, L23649, L24178, L24227); DOMParser for XLSX (L23951); TextEncoder (L23961); `navigator.clipboard.writeText` (L24184); `location.href="mailto:"`; `mailto:`/`tel:` links; Web Animations API (`el.animate`) everywhere; ResizeObserver (L23299, L23478, L23798, L24433); `matchMedia('(prefers-reduced-motion)')` (L22952, L23974); Intl.NumberFormat/DateTimeFormat; BigInt (overflow-safe multiply, L22609); native `confirm()` (L23761); drag&drop DataTransfer (HR wizard and import) | — |
| OS globals used | `L4`, `lang`, `OSW`, `osWinOpen`, `osMenu` (L11699), `osRestore`, `osFocus`, `osRelabel`, `osRunMark`, `alStore`/`alSave`/`alTouch`, `DK_APPS` (L11241), `dkGlyph`, `dkOpenX`, `dkPop`, `dkId`, `renderDock`, `desks`, `saveDesks`, `OS_DOCK`, `OS_OPEN`, `OS_USER`, `toast`, `lkRM`, `dcSaveFile` (L16983), `unzip` (L15689) | — |
| Forms app (read only) | First adapter `feSt`/`feEach` (L22801), overridden by `feLoad`/`feS`/`feWalk`/`t` (L23652). Lists forms and their input fields for the service form mapping | — |
| Calendar app → Billing (write) | `clBillingIntake` (L26072–L26074) pushes `{id:"cal-…", src:"calendar", …}` into `biSt().appts` and saves | — |
| Patients app → Billing (read/navigate) | `paBilling` (L24752), `paOpenBilling` (L25408) open billing and call `biGo("invoices",{q})` | — |
| Cabinet / shared services → Billing (read) | `biSt().pracs` / `biSt().services` (L26436–L26468) | — |
| HR → Patients/Calendar (read) | `hrSt()` for practitioner employee, establishments and approved leave (L24510, L24519, L25494) | — |
| Billing → HR | None (the allocation page only mentions it). The integrations card says "not connected" (L23783) | — |

---

## 8. i18n and RTL

- FACT: every string is a pipe-separated 4-language literal `"fr|en|de|ar"`, resolved by the global `L4` (L21374). That resolver indexes by `lang` and falls back to en, then fr.
  - Dictionaries: billing `BIW` (L22917), `BI_ERR` (L22934), `BI_STATES` (L23025), `BI_ACTS` (L23233), `BI_DL` (L23149); HR `HRW` (L23991), `HR_ERR` (L23995), `HR_ACTS` (L24149).
  - Errors use typed codes (`BiErr`/`HrErr` with a `{x}` placeholder), mapped by `biErr` (L22948) and `hrErr` (L23997).
- FACT: user-entered catalogue names are stored as 4-language strings. `biSetL4` (L23658) writes only the current language slot; a new entry fills all 4 slots. HR departments are renamed the same way (L24416).
- FACT: number and date locales are `fr-FR`/`en-GB`/`de-DE`/`ar-TN`, with Latin digits forced for Arabic (`-u-nu-latn`, L22619, L23834). Money is formatted by `biM` (L22621) through `formatToParts` with string fraction digits, so no float is ever used.
- FACT: the invoice document language is per template (`lang:"auto"` = UI language). `dir="rtl"` is applied for ar (L23178), with RTL CSS for stamps and legal block (L23821).
- FACT: the app roots take `dir` from `document.documentElement.dir` (L22990, L24006). Slide animations multiply by an `rtl` sign (L23010, L23017, L23338, L24020). The nav ink has an RTL inset shadow (L5612). The mobile nav slides from the opposite side (L5833). HR tab arrows flip in RTL (L24341).
- FACT: `osRelabel` is wrapped to re-render on a language change (L23802, L24437).
- RISK: CSV and export headers are partly French-only, e.g. the reports CSV header L23517, the sales journal, and the import report columns `["Ligne","Employé",…]` L24264.
- RISK: the seed data (reasons, notes, legal footer) is French-only.

---

## 9. Design tokens and motion

### 9.1 Billing (`.bi-win`, L5587–L5589)

- Accent orange: `--bi-a:#d9480f`, `--bi-a2:#b93c0b`, `--bi-at:#c2410c`, `--bi-as` (11% tint).
- Surfaces and tones: `--bi-bg:#f6f7f6`, `--bi-in`, `--bi-sh`, `--bi-ok/oks`, `--bi-info/infos`, `--bi-warn/warns`, `--bi-bad/bads`.
- Chart series: `--bi-s0:#2f6bf0` (invoiced = blue) and `--bi-s1:#d0600b` (collected = orange); the comment at L23411 says these colours were validated.
- `--bi-mono`.
- The group eyebrow uses the green brand `#16954c` (dark `#5fd88c`).
- The A4 doc has its own `--acc` (template accent, default `#e8590c`).

### 9.2 HR (`.hr-win`, L5850–L5852)

- Green brand `--hr-g:#15803d` with `--hr-g2`/`--hr-gs`.
- Blue interaction `--hr-b:#2563eb` with `--hr-b2`/`--hr-bs`.
- Surfaces: `--hr-bg:#f4f6f9`, `--hr-sf2`, `--hr-in`, `--hr-sh`.
- Tones: ok/info/warn/bad (+ "s" tint variants), `--hr-mono`.
- Avatar palette `HR_AV` (10 colours, L23877).

### 9.3 Shared and dark mode

- Both apps depend on OS tokens: `--fg`, `--muted`, `--line`, `--surface`, `--chip`, `--hover`, `--shadow`, `--glass-strong`, `--spring: cubic-bezier(.2,1.25,.35,1)` (L21), `--ease: cubic-bezier(.22,.8,.24,1)` (L22).
- Dark mode selectors are `:root.dark .X-win, :root[data-theme="dark"]:not(.light) .X-win` (L5588, L5851). They override every app token. Only `.bi-tt small` has a separate dark override.

### 9.4 Keyframes

- Billing: `biFloat` L5684, `biGrow` L5688, `biRow` L5707, `biUp` L5751, `biGrowX` L5763, `biPop`/`biFade` L5781.
- HR: `hrFloat` L5909, `hrRow`/`hrFlash` L5942–L5943, `hrShim` (skeleton shimmer) L5952, `hrFlash2` L5955, `hrSpin` L5977, `hrGrow` L5988, `hrGrowX` L6006, `hrPop`/`hrFade`/`hrIn` L6033, `hrUp` L6041, `hrGrpIn` L6054.

### 9.5 JS motion

All JS motion uses WAAPI and checks `biRM()`/`hrRM()` first, which combines OS `lkRM()` with the `prefers-reduced-motion` media query:

- page enter: 300–320 ms, `cubic-bezier(.2,.9,.3,1)`, staggered cards at 35 ms
- page exit: 120–130 ms
- nav ink glide: CSS transition `.42s var(--spring)`
- count-ups: 600–700 ms
- chart line draw: 900 ms
- FLIP reorder: 280–300 ms
- issue stamp: 520 ms spring
- dialog fade: 140 ms
- error shake: 240 ms

CSS `@media (prefers-reduced-motion:reduce)` blocks kill animations inside `.bi` and `.hr` (L5848 and in HR responsive).

### 9.6 Responsive

- Size classes are computed in JS from root width: `s` below 760 px, `m` below 1180 px, `l` otherwise (`biSize` L22994, `hrSize` L24005). They are written to `data-sz`.
- Billing nav width: 248 px (l) / 218 px (m). HR: 244 px / 214 px.
- At `s`, the nav becomes an off-canvas drawer, the editor becomes a stepper, KPIs go to 2 columns and drawers go full width (L5829–L5847, L6034–L6057).
- Container queries: `container: bi/inline-size` and `container: hr/inline-size` on `.os-wb`. The only `@container bi (max-width:1180px)` rule hides a mini-table column (L5847). `cqi` units are used by the search width (L5631).
- The window opens at `min(1640, innerWidth-16)` wide; min size 340×420 (L23797, L24431).

---

## 10. Accessibility

Positive (FACT):

- Nav buttons use `aria-current="page"` and group headers use `aria-expanded`.
- Sortable headers expose `aria-sort` (L23059, L24095).
- Rows are focusable `tabindex=0`; Enter/Space open or select; arrows move between rows (L23142–L23144, L24340).
- Dialogs are `<form role=dialog aria-modal=true aria-label>` with autofocus on the first field and Escape to close (L23040, L24039).
- Toasts use `role=status aria-live=polite`.
- Tabs use `role=tablist/tab` with `aria-selected`, and HR tabs support arrow keys.
- The global search results use `role=listbox` with `aria-selected` and keyboard navigation.
- The bulk toolbar has `role=toolbar`. Charts and progress bars have `role=img` + `aria-label`.
- Icon buttons carry `aria-label` (41 occurrences in billing, 31 in HR); SVGs are `aria-hidden`.
- There are `focus-visible` outlines.
- HR: a "Skip"-like `/` search shortcut, an `.sr` utility, and labelled checkboxes per row.

Gaps (RISK/FACT):

- Dialogs have no focus trap. Tab can leave the modal, and focus is not restored to the opener on close (L23040–L23043, L24039–L24042).
- The drawers (`.bi-drw`, `.hr-drw`) are not dialogs (no role, no trap), although the scrim makes them modal-like on small sizes.
- Chart tooltips are pointer-only (L23422). The data is available as tables on reports pages but not on the dashboard.
- The `osMenu` menus come from the OS (accessibility out of scope here).
- Colour-only status distinctions are mitigated by text pills. The leave gantt bars rely on colour plus a `title` attribute.
- `aria-disabled` is set on the editor "Issue" button but clicking still opens the dialog, which then explains the errors (intended).
- The editor "steps" tablist has no `tabpanel` association.

---

## 11. Migration notes (Next.js App Router, TypeScript, React)

### 11.1 DOM patterns to replace

- All rendering is template-string `innerHTML`, with full-page repaints (`biRefresh` L23020 / `hrRefresh` L24026) and hand-rolled partial repaints that preserve focus (`biEdPaint`, `hrListPaint`, filter refocus).
- Events go through capture-phase document-level delegation:
  - billing L23108, L23132, L23136, L23139, L23345, L23595
  - HR L24286, L24331, L24332, L24337
  - per-page handlers in `BI_P[view].click/input/change/key`
- Monkey-patching (rewritten function bindings):
  - `biGo` (L23296), `biDrawerPaint` (L23356), `biFormList` (L23652), `hrRender` (L24462)
  - the OS functions `dkOpenX`, `renderDock`, `osRelabel` (L23800–L23802, L24435–L24437)
- An IIFE mutates `desks` at load (L23803, L24438).

### 11.2 Client-only

Everything touching localStorage, FileReader, print iframes, ResizeObserver, WAAPI, clipboard and drag&drop must be client-only. The pure domain modules can run on the server.

### 11.3 Pure TS modules to extract (logic is reusable almost unchanged)

- `billing/money.ts`: `biDivRound`, `biMulRound` (BigInt fallback), `biParseMoney`, `biParseQty`, `biM`, `BI_CUR`. Integer minor units, quantities in thousandths, rates in basis points, half-away-from-zero rounding.
- `billing/totals.ts`: `biLine`, `biTotals` (VAT is rounded once per rate).
- `billing/lifecycle.ts`: `biNewInv`, `biCheck`, `biIssue`, `biSnap`, `biCreditNote`, `biCorrect`, `biDelDraft`, `biDupInv`. Inject the store and clock instead of `BI.st` and `biToday()`.
- `billing/numbering.ts`: `biNextNo`/`biPeekNo`/`biFmtNo`. On a server this must be transactional (DB sequence + lock); the `_lock` flag is per-tab only.
- `billing/payments.ts` (`biPay`, `biApply`, `biPayStatus`, `biRefund`, `biDupPay`, `biPartyCredit`), `pricing.ts` (`biPrice`), `quotes.ts`, `recurring.ts`, `reporting.ts` (`biFacts`, `biReceivable`, `biPeriod`, `biAllocate`, `biBuckets`), `recon.ts` (`biReconSuggest`).
- `billing/permissions.ts`: `BI_ROLES`/`BI_PERMS` move to server-side authorisation.
- `hr/validation.ts` (`hrValidate`, `hrDupOf`, `hrEmailOk`, `hrValidDate`), `hr/derived.ts` (`hrCSit`, `hrAvail`, `hrTeam`, `hrVisible`), `hr/mutations.ts` (`hrCreate`, `hrUpdate` with the `HR_FIELDS` field-level permission map, `hrDeactivate`, `hrArchive`, `hrLeaveDecide`), `hr/io.ts` (CSV parse/write, XLSX read/write, import row mapper `hrImpRow`, `HR_IMPF` synonyms).

### 11.4 Suggested React decomposition

- Shared shell: `<AppShell nav groups badges ink>`, `<TopBar>`, `<DataTable>` (sort, paginate, columns, selection, CSV; one component for both `biTable` and the HR table), `<FilterBar>`, `<SavedViews>`, `<Drawer>`, `<Dialog>` (with focus trap), `<Toast>`, `<StatusPill>`, `<KpiCard>`, `<CountUp>`, `<EmptyState>`.
- Billing: `<InvoiceEditor>` (7 step sections + `<DocumentPreview>`), `<A4Document template blocks>` (server-renderable, plus a print route or PDF), `<PaymentForm>`, `<LineChart>`, `<AgingBuckets>`, `<ReconBoard>`, `<TemplateDesigner>`.
- HR: `<EmployeesList>` (table/cards, grouping, density), `<EmployeeDrawer>`, `<EmployeeProfile tabs>`, `<AddEmployeeWizard>`, `<ImportWizard>`, `<ExportDialog>`, `<OrgChart>`, `<LeaveGantt>`, `<LeaveRequests>`.
- Routes: `/billing/[page]` and `/hr/[page]`, with `?arg=` or search params for filters (today `arg` is an id or a filter object), plus `/billing/invoices/[id]` and `/hr/employees/[id]`.

### 11.5 Globals shared with other areas

- Consumed: `L4`, `lang`, `OSW`, `osWinOpen`, `osMenu`, `osRestore`, `osFocus`, `osRelabel`, `osRunMark`, `alStore`, `alSave`, `alTouch`, `DK_APPS`, `dkGlyph`, `dkOpenX`, `dkPop`, `dkId`, `renderDock`, `desks`, `saveDesks`, `OS_DOCK`, `OS_OPEN`, `OS_USER`, `toast`, `lkRM`, `dcSaveFile`, `unzip`, `feSt`, `feEach`, `feLoad`, `feS`, `feWalk`, `t`.
- Exposed and used elsewhere: `biSt`, `biSave`, `BI_KEY`, `biGo`, `OS_OPEN.billing`, `hrSt`, `hrE`, `hri`, `HRI`, `hrRM`, `hrNf`, `hrCount`, and the entire hr-* CSS kit.

### 11.6 Security and privacy (RISK)

- Health-adjacent and HR personal data live unencrypted in localStorage: patients' addresses, invoice lines, dates of birth, home addresses, salaries, and attachments as data URLs of up to 400 KB each. It is readable by any script on the origin.
- Roles are simulated client-side and anyone can switch role from the header (L23117, L24292). The UI labels this honestly as a demo.
- `biNeed`/`hrNeed` are good placement points for server checks.
- The audit trail is local and mutable; this is stated in the UI (L23787).
- `OS_USER?.name || "Nassim"` is the actor, and `verifiedBy:"Nassim · date"` is hard-coded (L22699, L23717, L23728).
- Escaping is consistent (`biE`/`hrE` on every interpolation). The JSON passed through `data-biarg` is escaped with `biE` (L23426, L23459).
- `document.write` is used into same-origin print iframes with escaped content.

### 11.7 Complexity

- Billing: XL (about 350 KB of dense code, a domain engine plus 36 pages, editor, charts and recon). Uncertainty ±25%.
- HR: L (about 215 KB, 11 real pages, 2 wizards, XLSX IO). Uncertainty ±20%. Add M for extracting the shared hr-* kit that four other apps depend on.

---

## 12. State machines (precise)

### 12.1 Invoice (`inv.status`, L22712–L22747)

| From | Event | To | Guard / effect |
|---|---|---|---|
| — | `biNewInv` / `biApptDraft` / `biDupInv` / `biQuoteToInv` / `biRecurGen` / `biCorrect` | `draft` | `inv.draft`; editor-fresh drafts carry `_fresh` |
| `draft` | `biIssue` | `issued` | `inv.issue`; no error-level `biCheck` failures; `_lock`; number via `biNextNo` (chronology); snapshot; `issuedAt`; appointment `inv` link. Idempotent if already issued |
| `draft` | `biDelDraft` | (removed) | `inv.draft`; unlinks the appointment |
| `issued` | — | — | Terminal: never edited or deleted. Corrections only via credit notes (`biCreditNote`) or `biCorrect` (credit note + new draft) |

Derived payment state `biPayState` (L22665), for issued invoices: `cancelled` if credited ≥ total and total > 0 and paid = 0; else `paid` if balance ≤ 0; else `partial` if paid > 0; else `unpaid`. `draft` for drafts.

Display state `biInvState` (L23032): `draft` | `cancelled` | `overdue` (issued, balance > 0, `due < today`; this overrides unpaid/partial) | `paid` | `partial` | `unpaid`.

### 12.2 Other billing machines

- **Credit note**: created directly as `issued` with its own number (`cn` series). It cannot exceed the creditable remainder (`bi_eCreditMax`). Nothing can be credited once fully credited (`bi_eNothing`).
- **Quote** (L22772–L22776):

| From | To | Trigger |
|---|---|---|
| `draft` | `sent` | `biQuoteSend` (party and lines required; number and snapshot) |
| `sent` | `accepted`, `refused`, `expired` | `biQuoteSet` (UI only offers accepted/refused) |
| `accepted` | `converted` | `biQuoteToInv` (creates a draft invoice, stores `q.inv`) |

  Derived: `sent` with `valid < today` is shown as `expired`, and the menu then offers no accept/refuse.
- **Payment** `status ∈ {ok, pending, failed, reversed}` (L22764):
  - Created as `ok` or `pending`.
  - `biPayStatus` (needs `pay.recon`) allows any target in the set. Moving to `ok` re-checks that allocations still fit the balances.
  - UI: pending→ok, pending→failed, ok→reversed.
  - Only `ok` counts toward paid, cash and party credit.
- **Reconciliation** `recon ∈ {unmatched, matched, discrepancy, na}`: `na` is the default for cash; otherwise `unmatched`. `biReconMatch` moves to `matched` (same amount) or `discrepancy`. There is no reverse transition.
- **Refund** `status ∈ {pending, done, failed}`: created `pending`. `biRefundStatus` sets any status without validation; the UI only acts on pending. `done` sets `doneAt`. Every non-failed refund reduces party credit.
- **Recurring**: `on`/`off` toggle. When `on && next ≤ today && (no end || next ≤ end)` the schedule is due. Generating a draft sets `last=next`, `next += every months` (day clamped) and `count++`.
- **Appointment** (billing view):
  - `status ∈ {planned, done, noshow, cancelled}` plus an `inv` link.
  - Row state: `tobill` (done, no invoice), `draft`, `billed`, `noshow`, `planned`, `cancelled`.
  - Draft creation is blocked for cancelled appointments, future planned ones, a no-show without a policy, and an already-invoiced appointment unless that invoice is cancelled.
- **Numbering** (`seqs[kind]`): kinds `inv`/`cn`/`qt`/`pay`/`rf`, prefixes F/AV/D/P/R, pad 5, `reset ∈ {year, never}`. Counters `c[year|all]` only increase. Chronology (`date ≥ last[year]`) is enforced for inv and cn only.

### 12.3 HR machines

**Employee status** (`HR_STATUS` L23839): `active | trial | suspended | left`, plus the `archived` flag.

| From | To | Trigger / guard |
|---|---|---|
| (none) | `trial` or `active` | Wizard or import (import can also create `suspended` or `left`) |
| `active`/`trial`/`suspended` | `active`/`trial`/`suspended` | Edit dialog, needs `edit.contract` (L24168) |
| `trial` | `active` | Amendment with a past trial-end date (L24174) |
| any non-left | `left` | `hrDeactivate`, needs `deactivate`; sets `leftOn` and clips the contract end |
| `left` | `left` + `archived` | `hrArchive`, needs `archive` (admin only). There is no un-archive and no rehire path |

- **Contract situation** (derived, `hrCSit` L23863): `suspended` (status) → `ended` (end < today) → `ending` (end within `set.endAlert` days, default 60) → `running`.
- **Availability** (derived, `hrAvail` L23865): `off` (left) | `absent` (suspended) | `leave` (an approved leave covers today) | `present`.
- **Leave** (L23912, L24179): created `pending` (overlap with non-refused requests is rejected) → `approved` or `refused` (refusal needs a reason). Deciding needs `leave.approve`, the employee must be visible, and a manager cannot decide their own request. There is no cancel or edit.
- **Import wizard**: stage 0 → 1 (file loaded) → 2 (mapping valid) → 3 → 4 (running → done). Back is allowed from 1–3.
- **Add wizard**: steps 0–7, forward only after the step validates; any done step can be revisited.

### 12.4 Roles and permissions matrix

Billing `BI_PERMS` (L22686, 20 permissions):

| Role | Permissions |
|---|---|
| `orgadmin` | all |
| `manager` | all except `cfg.edit` |
| `finance` | dash, rep.all, inv.view, inv.draft, inv.issue, inv.credit, qt.edit, pay.view, pay.record, pay.refund, pay.recon, cat.view, audit.view, alloc.view |
| `prac` | dash, rep.own, inv.view, inv.draft, qt.edit, pay.view, cat.view (data scoped to `mePrac` via `biScope` L22808) |
| `reception` | inv.view, inv.draft, qt.edit, pay.view, pay.record, cat.view |

HR `HR_PERMS` (L23846, 18 permissions):

| Role | Permissions |
|---|---|
| `hr` | view.all, add, edit.pro, edit.org, edit.contract, edit.time, personal.view, import, export, bulk, deactivate, docs.add, leave.approve |
| `manager` | view.team, export, leave.approve (visibility = recursive reports of `meMgr`) |
| `payroll` | view.all, edit.time, pay.view, pay.edit, export |
| `admin` | all |

Field-level edit map `HR_FIELDS` (L23902):

| Permission | Fields |
|---|---|
| `edit.pro` | first, last, email, phone, job, title |
| `edit.org` | dept, est, team, mgr |
| `edit.contract` | contract, entry, status |
| `edit.time` | wt, hours, schedule |
| `pay.edit` | pay |

---

## 13. Counts summary

| Metric | Billing | HR |
|---|---|---|
| JS lines (chars) | L22599–L23823: 1,225 (349 K) | L23824–L24462: 639 (215 K) |
| CSS lines | L5586–L5848: 263 (+ BI_DOC_CSS 16 lines) | L5849–L6057: 209 (shared kit) |
| Pages / views | 36 (6 groups) | 25 (11 real incl. hidden profile, 14 placeholders) |
| Drawers | 3 (inv, cn, pay) | 1 (employee quick panel) |
| Dialogs (distinct) | about 24 + native `confirm` ×1 | about 20 + 2 wizards (8 steps, 5 stages) |
| Editor / wizard steps | 7 | 8 + 5 |
| Profile / drawer tabs | 3 drawer tabs | 7 profile tabs |
| Context menus | 7 | 5 (role, saved, display, row, more) |
| Components / builders (table §3) | about 40 | about 30 (+ shared kit of about 120 classes) |
| Interaction groups | 70 (F 63, S 3, P 1, D 3) | 36 (F 34, S 1, D 1) |
| `data-*` hooks | about 150 | about 72 |
| Storage keys | `remotion-billing`, `remotion-dk-bill1` | `remotion-hr`, `remotion-dk-hr1` |
| Roles / permissions | 5 / 20 | 4 / 18 |
| Integrations (code) | Forms (read), Calendar (writes into it), Patients/Cabinet (read), OS dock/desk/menu/save | Patients/Calendar read `hrSt`; OS unzip/save |
| Network / CDN | 0 / 0 | 0 / 0 |
| Keyframes | 7 | 13 |

---

## 14. Defects and inconsistencies (current vs expected; not fixed)

Billing:

1. **Calendar integration contradicts the UI copy.**
   - Current: `tobill` says the calendar "is not yet a real OS app" (L23372) and Integrations lists "Calendar … notconn" (L23783). Meanwhile v65 `clBillingIntake` writes real appointments into `BI.st.appts` (L26072–L26074).
   - Expected: the copy and the status reflect the live link.
2. **Partial credit notes ignore the original VAT.**
   - Current: the partial and "balance" credit-note lines use `tax:"exo"` (L22742) whatever rates the invoice had.
   - Expected: a pro-rata reversal by rate. RISK for VAT-bearing invoices (e.g. `s3` at 20%).
3. **The no-show line hard-codes tax `n20`** (L22787).
   - Current: after switching to the TN tax set (no `n20`), `biTax` falls back to bp 0 with label `n20`.
   - Expected: a configurable no-show tax category.
4. **Both "Export" buttons on the reports page export the 12-month CSV.**
   - Current: `data-birepcsv="cmp"` is not handled differently (L23517); the comparison table is never exported.
   - Expected: separate exports. Classified P.
5. **Dead code and config.**
   - The first `biFormList` (L22801) is overwritten at L23652.
   - `biCatEdit` (L23659) is never called.
   - The permission `forms.link` is never checked.
   - `set.remind` and `integ` are never read.
6. **Editor drafts are created during render.**
   - `biEdHTML` → `biEdInv` → `biNewInv` (L23255) logs `inv.create` even for fresh drafts that are discarded on leave, which creates audit noise.
   - Render has side effects (also a problem for React strict mode).
7. **ResizeObservers are never disconnected.**
   - Dashboard chart (L23479), editor (L23299) and window (L23798; one per open) create a new observer on each mount. INFERENCE: slow leak.
8. **Numbering reset switching** (L23768).
   - Changing `reset` from year to never sums counters, and switching back restores the year counter. Chronology checks are keyed per mode (`last.all` vs `last[year]`), so they can be bypassed across switches.
   - Expected: a lock after the first issue, or an explicit new series.
9. **The quote "expired" state is derived only.**
   - The stored status stays `sent`. The `expired` transition exists in `biQuoteSet` but has no UI. Reports and filters on `st` use the derived value.
10. **Quote lines are priced without context.**
    - `biLineFromSvc(sv)` in the quote dialog (L23392) passes no practitioner, establishment or payer, so pricing rules (e.g. r2 for p3) are not applied to quotes. INFERENCE.
11. **Native `confirm()` for loading the TN taxes** (L23761) is inconsistent with the custom dialogs and blocks the event loop.
12. **The no-show fee and the record/payment amount parse with the default 2 decimals** in places (L23761 `biParseMoney(x.value)`). The dialogs use `biCurD`. Mixed usage; with TND (3 decimals) a third decimal is rejected in some fields.
13. **Silent save failure.** `biSave` only does `console.warn` when the quota is exceeded. Attachments are stored as data URLs.
14. **A pending refund already reduces party credit** (`status!=="failed"`, L22674). This is intended but is not explained in the UI.
15. **`BI_TBL`/column ids differ from filter keys** in `biRevPage` (CSV via the generic table only). Low impact.
16. **Hard-coded identity.** "Nassim" is the default user and the `verifiedBy` value (L22699, L23717, L23728).

HR:

17. **The leave-request button is not gated.**
    - Current: the guard is a no-op expression, `${hrCan("edit.time")||hrRole()==="manager"?"":""}` (L24140), and `hrLeaveDlg` (L24179) has no `hrNeed`. Any role, including payroll or a manager acting for others, can create requests for any visible employee.
    - Expected: a permission check.
18. **Import manager references are order-dependent.**
    - Current: `hrImpRow` only searches existing employees plus rows already processed (`pool`). A manager who appears later in the file gives "Manager not found" (L24246).
    - Expected: a two-pass resolution.
19. **Import can create employees with status `left`** (`stMap` includes `sorti/left`, L24247). This bypasses `hrDeactivate` (no `leftOn`, no history entry).
20. **Placeholder payroll modules use the wrong permission.**
    - Current: the placeholders (payruns, payslips, declarations, expenses) use `perm:["pay.view","view.all"]` (L24408), so the HR role (view.all) sees them while `salaries` requires `pay.view`.
    - Expected: consistent gating. INFERENCE.
21. **Bulk Undo replaces the entire `emps` array** with a JSON snapshot (L24192). Any concurrent change, such as one from a storage event, is reverted, and the audit keeps the original entries.
22. **The personal-data reveal stays in `HR.ui.reveal`** until navigation. Each reveal is logged, but there is no auto-hide timer. Low.
23. **`set.cards` is unused.** The list/cards choice is not persisted (`HR.ui.cards` resets to `null` at L24434).
24. **Seed dates.** One seed employee has an absolute leaving date `2026-06-30` (L23938) while the others are relative to today. Contracts may show inconsistent states depending on the current date.
25. **Fixed currency.** Money is EUR-only (`hrMoney` L24147), with a float conversion `/100` and `Math.round(Number(raw)*100)` (L24170, L24218, L24234), unlike the integer-safe billing parser.

Both apps:

26. **Dialogs and drawers have no focus trap or focus return** (see §10).
27. **Cross-tab `storage` reload drops in-memory UI work.** `BI.st=null` / `HR.st=null` followed by a refresh during an open editor or wizard can lose that state. An open dialog keeps references to the old store objects.
