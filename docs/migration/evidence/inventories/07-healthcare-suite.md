# 07 — Healthcare suite (v64 shared foundation, v64 Patients & Dossiers médicaux, v65 Gestion Calendrier, v66 Gestion Cabinet, v67 Calendar & Planning)

Source: `source/Remotion_Desktop.html` (read-only). All `Lnnnnn` references are FILE line numbers.
Method: every line of JS L24463–L27216 was read end to end (no line in this range exceeds ~4.2k chars). CSS L6058–L6671 was inspected through its section comments, tokens, keyframes and media queries.
Labels: **FACT** = verified in code; **INFERENCE** = deduced from code; **RISK** = a security, privacy or data-loss concern; **UNKNOWN** = not determinable from this file.

---

## 1. Scope & line ranges

| Block | JS lines | Notes |
|---|---|---|
| v64 shared foundation (`RM`, bus, shared referentials, notification kinds) | L24463–L24529 | `RM_BUS_KEY="remotion-bus"`, `RM_SH_KEY="remotion-shared"` (L24468) |
| v64 Patients — domain (no UI) | L24530–L24835 | `PA_KEY="remotion-patients"` (L24534) |
| v64 Patients — shell, shared UI, directory, preview drawer, export | L24836–L24966 | |
| v64 Patients — registration wizard, record frame, Fiche patient sections | L24967–L25112 | |
| v64 Patients — Dossier médical sections, therapy, timeline, clinical dialogs | L25113–L25250 | |
| v64 Patients — dashboard, archives, data quality, docs register, forms, settings, audit, events, OS | L25251–L25426 | |
| v65 Gestion Calendrier — domain (tz maths, availability, booking, recurrence, lifecycle, ICS, notifications, links, seed) | L25427–L25674 | `CL_KEY="remotion-calendar"` (L25429), `CL_ORG_TZ="Europe/Paris"` (L25432) |
| v65 Calendrier — shell + agenda (day/workweek/week/month/agenda, by practitioner/room) | L25675–L25786 | |
| v65 Calendrier — 9-step wizard, drawer, lifecycle, drag-and-drop | L25787–L25902 | |
| v65 Calendrier — requests, planning, series, availability, resources, notifications, sync, online booking, settings, audit | L25903–L25999 | |
| v65 Calendrier — events, keyboard, integrations, OS | L26000–L26098 | |
| v66 Gestion Cabinet — domain (visits, readiness, issues, tasks, reports, seed) | L26099–L26229 | `CB_KEY="remotion-cabinet"` (L26102) |
| v66 Cabinet — shell, dashboard, reception, check-in, visit drawer | L26230–L26385 | |
| v66 Cabinet — waiting room, public display, ops timeline, practitioners | L26386–L26451 | |
| v66 Cabinet — services, rooms/issues, admin follow-up, tasks | L26452–L26541 | |
| v66 Cabinet — reports, config, audit, interactions, live updates, integrations, OS | L26542–L26685 | |
| v67 Calendar & Planning — domain (prefs, waiting list, smart slots, internal events, cabinet bridge) | L26686–L26777 | `PL_KEY="remotion-planning"` (L26689) |
| v67 Planning — shell, calendar workspace, right panel | L26778–L26876 | |
| v67 Planning — dialogs, drawer, smart booking, quick create, events, drag & drop | L26877–L26980 | |
| v67 Planning — secondary views | L26981–L27079 | |
| v67 Planning — interactions, keyboard, live updates, OS | L27080–L27210 | L27212–L27216 is the global bootstrap (`applyLang`, `drawWall`), outside this area |

**Size (FACT).** JS is 2,754 lines and ~896 KB, with 707 top-level declarations. CSS is 614 lines (L6058–L6671) and ~131 KB.

**CSS ranges (FACT, from css_outline).**
- **Patients:** L6058–L6215 (`.pa-*`, `.pa-win`). Sub-sections: global search L6077, drawer L6088, record L6099, documents L6124, clinical L6133, registration L6181, dashboard/quality L6186, responsive L6198.
- **Calendrier:** L6216–L6342 (`.cl-*`, `.clapp`, `.cl-win`). Sub-sections: mini month L6230, time grid L6237, month L6266, agenda list L6273, status chips L6279, drawer L6283, wizard L6289, pages L6305, responsive L6321.
- **Cabinet:** L6343–L6501 (`.cb-*`, `.cbapp`, `.cb-win`). Sub-sections: stages L6352, dashboard L6358, visit rows L6372, check-in L6388, drawer L6397, waiting room L6403, public display L6413, ops timeline L6426, tables L6444, practitioners L6449, services L6452, rooms L6455, admin L6467, tasks L6471, reports L6483, config L6489.
- **Planning:** L6502–L6671 (`.pl-*`, `.plapp`, `.pl-win`). Sub-sections: sidebar L6515, main L6530, grid L6542, month/agenda L6576, upcoming L6589, right panel L6596, drawer/booking L6608, pages L6633.
- **Shared `hr-*` component classes:** defined in the RH & Paie CSS block starting at L5849 (v62), owned by another area. All four apps reuse them: `hr-nav`, `hr-bar`, `hr-pg`, `hr-card`, `hr-kpi`, `hr-tb`, `hr-dlg`, `hr-drw`, `hr-toast`, `hr-btn`, `hr-fld`, `hr-banner`, `hr-wsteps`, and others.

**Markup.** There are no static markup ids. Each app builds its own window body at runtime: `paBody()` L24870 → `.hr.pa`, `clBody()` L25700 → `.hr.clapp`, `cbBody()` L26258 → `.hr.cbapp`, `plBody()` L26796 → `.hr.plapp`. Each body goes into an OS window opened with `osWinOpen("patients"|"calendar"|"cabinet"|"planning")` (L25417, L26090, L26677, L27204).

**Window keys referenced outside this area (FACT).** The OS routes the keys `patients`, `calendar`, `cabinet` and `planning` from outside this area:
- the solo-window router `osSoloKey`/`OS_SOLO` (L20980–L20981);
- the launcher key map (L11857);
- `AL_APPS` (L11746), which already lists `calendar` and `patients`.

`cabinet` and `planning` are pushed into `AL_APPS` at runtime (L26669, L27196).

---

## 2. Screens / views / sub-pages

### 2.1 Patients & Dossiers médicaux (window `patients`, `paOpen` L25414)

**Shell (L24872).** The shell has a nav sidebar with groups top/pat/dq/res/cfg (`PA_G` L24867), a "recently viewed" list (max 4, L24877) and a synthetic-data badge. The top bar holds the breadcrumb, a back button (30-deep stack), a global patient search (`data-pagq`) and the role switcher (`data-parole`). Below the bar sit a `.hr-pg` page, the drawer, the scrim and a toast (`role=status aria-live=polite`).

**Page states (FACT).**
- **Permission-denied:** `paPageOk` returns `paEmpty("lock",denied)` (L24885).
- **Render error:** a `hr-state err` block with a "Back to directory" button (L24885).
- **Loading:** a skeleton is shown for 380 ms on first open (`PA.ui.loading`, `paSkeleton` L24937, L25417–L25418).
- **Empty:** per-page `paEmpty`.

The final nav order is set by an IIFE at L25426.

| View (`PA_P` id) | Line | Perm | Purpose / notable content | States |
|---|---|---|---|---|
| `dash` Dashboard | L25252 | dir.view | KPIs: active records, my patients (clin only), notes to sign, incomplete, potential duplicates, open corrections. "To do" list: unsigned drafts, plans due for review within 7 days, allergy status undocumented, open corrections, pending consents. Also latest 5 records and a completeness histogram. | empty "Nothing pending" |
| `list` Directory | L24918 | dir.view | 5 KPI tiles that apply saved views. Search box (`/` shortcut) over name, MRN, birth date, phone (≥6 digits), e-mail. Filter panel: status, establishment, practitioner, sex, criteria chips. Sort: name, MRN, birth, activity, completeness. Saved views menu, pager (10/25/50/100), export, new patient. The table shows avatar, duplicate tag, completeness bar, status, activity, preview and open buttons. Banner text: "Clinical data never shown in list". | skeleton, empty (with reset / new) |
| `record` Patient record (hidden in nav) | L25042 | dir.view | Archived banner with Restore. Emergency-access banner with End access. Persistent header: avatar, MRN, birth/age, sex, status, lead practitioner, establishment, allergy line or "clinical hidden", completeness ring, Edit, hook actions ("Book appointment" from Calendar), more menu. Vertical tablist of 24 sections in 2 groups. | locked section state (`paLockedHTML` L25056), section error |
| `archives` Archived & merged | L25265 | dir.view | Archived list with Restore; merged list → surviving record | empty |
| `dups` Potential duplicates | L25270 | dq.view | Pair cards with score /100 and reasons; buttons "Different people" and "Compare…"; merge history | empty |
| `corr` Correction requests | L25287 | dq.view | Pending and processed tables; Apply/Reject (corr.decide) | empty |
| `complete` Completeness | L25292 | dq.view | Missing-by-criterion bars; table of records to complete | all complete |
| `documents` Document register | L25296 | dir.view | Cross-patient register (search, category), with a hidden-count note for clinical documents | empty |
| `forms` Clinical forms | L25301 | dir.view | Specialty → form mapping (`settings` perm to edit); list of Forms & Surveys forms | empty |
| `settings` Settings | L25305 | settings or audit.view | Active specialties, retention per category (free text), permission matrix (read-only), demo reset | read-only without `settings` |
| `audit` Audit log | L25311 | audit.view | Filter by text/action, CSV export, emergency-access rows highlighted | — |

**Record sections (`PA_SEC`, tablist L25044, keyboard Up/Down/Home/End L25404).**

*Group "Fiche patient":*
- `over` L25062 — overview cards (completeness, contact, consents, care team, hook cards from Calendar and Cabinet, billing, clinical summary, recent clinical activity)
- `identity` L25076 — includes the identifiers table and status actions
- `contact` L25079
- `family` L25080 — relationships table with end action
- `admin` L25083
- `team` L25085 — care team with lead star and remove
- `prefs` L25088
- `consent` L25089 — 7 consent types plus notices
- `docs` L25093
- `services` L25101 — connected services: Billing, Forms, Organisation (n/a), Identity platform (n/a), plus the Calendar hook card
- `activity` L25108 — record history and per-record audit

*Group "Dossier médical" (`clin:true`, locked unless `paClinOk`):*
- `hist` L25123
- `allergies` L25124 — NKA assertion buttons
- `problems` L25127
- `meds` L25128
- `enc` L25130 — encounter cards with draft/signed/amended, Write/Sign/Addendum
- `obs` L25136 — SVG line charts per measure (`paObsChart` L25141)
- `labs` L25149
- `imaging` L25151
- `assess` L25152
- `plans` L25154
- `therapy` L25155 — episodes with initial assessment, goals and status select, outcome measures with charts and inline point form, progress notes, discharge
- `cdocs` L25162
- `timeline` L25163 — filter chips per kind, text, date range, show-errors; grouped by month

**Dialogs and overlays.** All use the `paDialog` generic modal L24900, which has a focus trap, Esc, an error line with a shake animation, and restores focus.
- Registration wizard, 8 steps (`PA_RSTEPS` L24968): id, contact, family, admin, intake, consent, docs, review (L24970).
- Export CSV (L24962).
- Clinical entry add/edit for 11 kinds (`PA_FORMS` L25170, `paClinDlg` L25184).
- Change history (L25189).
- Entry action menu (L25190): edit, change status submenu, history, mark entered-in-error.
- Therapy actions: initial, goal, measure, note, close (L25196).
- Edit identity/contact/admin/prefs (L25204).
- Related person (L25215), consent (L25221), add to team (L25223), correction request (L25225), emergency access (L25226).
- Document preview (image / text / PDF iframe) (L25227); document menu (metadata, new version, derivative, archive) (L25231); classify upload (L25236).
- Record more-menu (L25238): correction, print admin, print clinical, compare, archive.
- Compare/merge (L25276), pick record to compare (L25286), link form (L25249), saved view name (L25339), addendum (L25353).
- Generic confirm with reason (`paConfirm` L24905).
- Preview drawer (`paDrawer` L24946 / L24947). Clinical summary appears only if `paClinOk`; otherwise a lock message.
- Global search dropdown (`paGlobalSearch` L25319).
- Role menu (L25318) with a simulated-practitioner submenu.
- Print via hidden iframe (`paPrint` L25244).

### 2.2 Gestion Calendrier (window `calendar`, `clOpen` L26087)

The shell (L25702) has nav groups top/rdv/org/com/cfg (L25697), a brand showing the org time zone, and a "New appointment" button in the bar plus the role switcher. Error and denied states use the same pattern as Patients (L25710). Nav order is set at L26098.

| View | Line | Perm | Content |
|---|---|---|---|
| `agenda` | L25739 | cal.view | Toolbar: today/prev/next, label, date input, conflict counter button, mode segment (Day / Work week / Week / Month / List), day-mode columns (time / by practitioner / by room), filters, display-prefs gear. Side: mini month (L25758) and practitioner calendar checkboxes plus shared team chips (L25761). Views: time grid `clGridHTML` L25768 (lanes, availability shading for a single practitioner, now line); columns `clColsHTML` L25778; month `clMonthHTML` L25783; 14-day list `clListHTML` L25785. Time-zone notice when display tz ≠ org tz. Empty: "No appointment… + New". |
| `requests` | L25919 | cal.view | Requested / pending / draft for 90 days; link external to patient (select); decline; confirm (disabled while a conflict exists) |
| `planning` | L25925 | cal.view | Practitioner day: KPIs, day list mixed with free gaps ≥15 min ("Book"), 7-day load bars, conflicts and confirmations |
| `series` | L25935 | cal.view | Each recurring series with an occurrence chip strip (excluded / modified / conflict) |
| `avail` | L25940 | avail.all or avail.own | Weekly ranges editor per weekday (time, time, establishment) with add/remove; daily limit; exceptions list (add/delete); HR leave (read-only) |
| `resources` | L25950 | cal.view | Room/equipment cards: readiness badge from Cabinet hook, today's bookings, unavailability list; add/edit/declare unavailability (res.manage) |
| `notifs` | L25959 | notif.view | Outbox KPIs as filters, "Process queue now", "simulate provider failure" toggle (policy), table with Retry |
| `sync` | L25965 | export or sync.manage | Google / M365 / iCloud "Not connected" cards; .ics export form (busy / service / full with confirm); .ics import (file); sync runs; imported events (delete) |
| `booking` | L25974 | policy or cal.view | Booking links (active / expired / revoked) with masked fake URL `https://reservation.exemple.invalid/b/<8 chars>…`; open public preview; revoke; create |
| `settings` | L25990 | cal.view | Display prefs (tz from 7 zones, day start/end, zoom, show cancelled); booking rules (policy); permission matrix; demo reset |
| `audit` | L25996 | audit.view | Audit table (250), last 10 calendar bus events, bus failures |

**Dialogs and overlays** (generic `clDialog` L25720, which also renders alternative-slot chips on conflict errors):
- 9-step booking wizard (`CL_WSTEPS` L25788, `clWizard` L25789). Steps: who, svc, pr, loc, slot, rec, notif, check, save, plus a done state.
- Appointment drawer (L25864/L25865), cancel (L25880), edit notes/instructions (L25882), reschedule with a slot picker (L25883).
- Series cancel scope, or series edit scope with time/duration/room (L25888).
- Exception (L25946), impacted appointments notice (L25948), resource (L25956), resource unavailability (L25957), new booking link (L25978).
- Public booking page preview (L25980): service, practitioner, 5-day slots, name/e-mail/phone, honeypot, consent.
- Drag-move failure dialog with alternatives (L25901).
- Role menu (L26007), display prefs menu (L26018).

### 2.3 Gestion Cabinet (window `cabinet`, `cbOpen` L26674)

The shell (L26260) has nav groups top/flow/res/fu/cfg (L26255). The bar holds a "live" sync indicator (up to date / data to refresh), an establishment selector, a "Walk-in" button and the role switcher. The first permitted page is chosen by `cbFirst` (L26262). Nav order is set at L26685; that IIFE drops pages missing from the list.

| View | Line | Perm | Content |
|---|---|---|---|
| `dash` | L26308 | dash.view | 7 KPIs; patient flow bar (expected → waiting → in consult → done); operational alerts (late patients, long waits ≥20 min, booked room not ready, practitioner late, blocking issues); next arrivals; team status; internal announcements |
| `reception` | L26324 | checkin | Search, practitioner filter, tabs (To check in / Waiting / In consultation / Completed / Cancelled-no-show / All) with counts, visit rows with stage actions; Walk-in; Book (opens Calendar wizard) |
| `waiting` | L26390 | visit.status | 3 columns (arrived / waiting / called) of wait cards with live minutes; "My patients / All" (practitioner); public screen button; privacy note |
| `ops` | L26419 | dash.view | Horizontal 07:00–20:00 timeline by practitioner or by room (work windows, blocks, visit blocks with start-delay badge, now line); date navigation (read-only on past days); summary table |
| `pracs` | L26431 | dash.view | Practitioner cards (operational status, current, next, waiting, delay, day progress; change status menu; calendar link); shared practitioner registry table and editor (prac.manage) |
| `services` | L26463 | dash.view | Services catalogue table (durations, buffers, room types, practitioners, channels, billing reference status); edit (svc.manage) |
| `rooms` | L26487 | dash.view | Room cards (now state, readiness segment ready / cleaning / prep / out, current/next booking, maintenance, issues); issues list with take charge / resolve |
| `admin` | L26511 | patient.admin | Patients expected in 3 days with administrative gaps; create task; appointments without patient record ("Link in calendar") |
| `tasks` | L26519 | task.manage | Kanban todo / doing / done with drag & drop; search, team, overdue filter |
| `reports` | L26550 | report.view | 7/30/90-day KPIs (attendance, average wait, no-shows, room utilisation, tasks); wait histogram, start delay per practitioner, room utilisation, arrivals per hour, activity per practitioner, metric definitions; CSV export |
| `config` | L26576 | config | Reception thresholds and walk-in toggle; public display mode (initials / ticket / none) with room and practitioner toggles; opening hours per establishment; announcements; integrations status; bus failures with retry; demo reset |
| `audit` | L26587 | audit.view | Tabs for audit log (filter) and integration events (idempotency key, consumers that processed) |

**Dialogs and overlays** (`cbDialog` L26282; it re-reads both stores before `onOk`):
- Check-in (L26334): identity checkbox required, admin gaps, optional follow-up task, room, reception note, notify practitioner.
- Walk-in (L26350): patient search, service, practitioner with live status, establishment.
- Cancel (L26364), start-consultation confirm when the room is not ready (L26367).
- Visit drawer (L26372/L26373): stage, actions, rooms, times, reception note, admin follow-up, links, visit timeline.
- Public waiting-room display (`cbDisplay` L26405): an in-window `role=dialog` overlay, fullscreen-capable, repainted every 5 s.
- Practitioner editor (L26446), service editor (L26468), issue report (L26499; it previews impacted bookings).
- Task editor (L26527), task detail (L26534; checklist, comments, history, status buttons), announcement (L26575).
- No-show confirm (L26595), practitioner status menu (L26613), role menu (L26602).

### 2.4 Calendar & Planning (window `planning`, `plOpen` L27201)

The shell (L26804) has a left sidebar with 13 nav items (`PL_NAV` L26793), "My calendars" visibility list (me / practitioner / room / team) with colour menus and add-calendar, a FAB for a new appointment, and the synthetic badge. A mobile `<select>` nav (`data-plmnav`) replaces it on small sizes. The right panel shows only on `cal`/`sched` and can be toggled.

| View | Line | Content |
|---|---|---|
| `cal` | L26831 | Top bar: today, prev/next, range label, mode segment with animated pill (Day / Week / Work Week / Month / Agenda), New, kebab. Filter bar: search with dropdown, practitioner, location, type, status, display options. Grid `plGridHTML` L26836: all-day lane (leave, closures, maintenance), event lanes, block items, practitioner columns in day mode, compact or hidden weekends, now line. Month L26856, agenda L26858, "Upcoming this week" strip L26861. |
| `sched` | L26988 | "My Schedule": KPIs (today, booked hours vs availability, next free slot, waiting for you), 7-day list including blocks |
| `list` | L26995 | Appointments table; ranges today / week / next 30 / past 30 / to confirm; CSV (no patient names) |
| `pats` | L27001 | Patient cards for anyone with an appointment within ±90 days (next, last, usual practitioner, upcoming / no-shows, waiting badge) |
| `pracs` | L27009 | Weekly load per practitioner (%, booked/available hours, day bars, next free slot) |
| `rooms` | L27017 | Weekly occupancy heat table (Mon–Sat) plus readiness from Cabinet |
| `wait` | L27024 | Waiting list: filters (active / booked / removed / all), offered-slot banner with Book / Declined, "Find slots" (4 suggestions), Remove; add dialog |
| `rec` | L27036 | Series cards (weekday dots, next, remaining, end, exceptions) → manage in Calendrier |
| `avail` | L27042 | 7-day × practitioner availability bars (07–20) plus upcoming exceptions; block time |
| `types` | L27048 | Event types (from the Cabinet catalogue) with a planner-owned colour palette and preview |
| `integ` | L27053 | Integration cards (Calendar, Cabinet, Patients, Billing, HR, notification centre, .ics export, Google/Outlook "Not connected") |
| `notifs` | L27065 | Waiting-list offers plus the Calendar outbox table (notif.view) |
| `reports` | L27071 | Week / month / 30 days: appointments, fill rate, no-show %, cancellations, average booking lead time; by type; busiest-hours heat map |

**Panels and dialogs** (`plDialog` L26878):
- Appointment drawer (L26887/L26895); event context menu (L26905); cancel (L26914); smart reschedule with ranked slots (L26917).
- Smart booking panel in a wide drawer, 5 steps (`plNewPanel` L26924, `plPanelPaint` L26931). Modes are "Suggestions" and "Exact time".
- Quick-create popover on an empty slot (L26952).
- Internal event dialog for meeting or block (L26957); block detail/delete (L26963); waiting-list add (L27031).
- Kebab menu (L27084): colour by, weekends, density, visible hours, side panel, internal event, waiting list, .ics export, open Calendrier, **role and simulated practitioner switchers**.
- Calendar menus (L27101, L27103), search dropdown (L27099).
- Right panel (L26870): mini month, today list, Cabinet tasks with quick add and checkbox-to-complete.

---

## 3. Components (builders, mostly HTML-string functions)

| Component | Line | Responsibility / variants |
|---|---|---|
| `rmBusSt/rmBusSave/rmEmit/rmOn/rmDispatch/rmCatchUp/rmStale` | L24472–L24483 | Persisted integration event log (see §6.3) |
| `rmShSt/rmShSeed/rmSvcSeed/rmShSave` | L24487–L24508 | Shared practitioner registry and service catalogue |
| `rmPracName/rmPracJob/rmPracEmployment/rmHrEmp/rmEsts/rmEstName/rmSpecName` | L24509–L24520 | Live reads of HR & Paie (names, job, leave status, establishments) |
| `rmNotify` + `NC_KIND.rmPat/rmCal/rmCab` | L24522–L24527 | OS notification-centre adapter |
| `rmSafeName` | L24529 | Privacy-safe "First L." label |
| `paDialog`, `clDialog`, `cbDialog`, `plDialog` | L24900, L25720, L26282, L26878 | Four near-identical modal builders (focus trap, Esc, error area, shake) |
| `paConfirm`, `clConfirm`, `cbConfirm` | L24905, L25725, L26287 | Confirm dialogs; Patients' version adds a required reason textarea |
| `paToast/clToast/cbToast/plToast` | L24897, L25718, L26279, L26814 | Toast with optional Undo (5–7 s) |
| `paAct/clAct/cbAct/plAct` | L24899, L25719, L26281, L26815 | Run a domain mutation → save → refresh → toast; errors become toasts |
| `paFld/clFld/cbFld/plFld`, `paOpts/clOpts/cbOpts/plOpts` | L24907, L25690, L26242, L26883; L24859 … | Form field and `<option>` builders |
| `paEmpty/clEmpty/cbEmpty/plEmpty` | L24862, L25691, L26243, L26789 | Empty state |
| Nav builders `paNavHTML/clNavHTML/cbNavHTML/plSideHTML` + ink indicator `*Ink` | L24875, L25704, L26263, L26799 | Grouped collapsible nav with animated "ink" bar |
| Page transition `*Enter`, `*Go`, `*Refresh`, `*Swap` | various | Fade/slide, stagger cards, preserve scroll |
| `paAvatar`, `paVerifBadge`, `paStBadge`, `paStChip`, `paProv` (provenance line), `paEM` (entry menu button) | L24855–L25118 | Patients atoms |
| `paEntryTable` | L25120 | Generic clinical entries table with provenance and actions; empty text stresses "absence ≠ none" |
| `paObsChart` | L25141 | Inline SVG line chart (BP = 2 series) with `<title>` tooltips, `role=img` |
| `paDocsHTML` | L25094 | Originals with nested derivatives, tags, actions |
| `paAllergyLine` | L24956 | Three-state allergy banner (active list / NKA attested / undocumented) |
| `paBillingHTML` | L25072 | Live billing balance card |
| `paCard`, `paDL` | L25057–L25058 | Card and definition list |
| `PA_HOOKS {headActions, services, over, encAppt}` | L25055 | Extension points filled by Calendar (L26060–L26065) and Cabinet (L26661) |
| `clEvHTML`, `clLanes`, `clDayShade`, `clGridHTML`, `clColsHTML`, `clMonthHTML`, `clListHTML`, `clMiniMonth`, `clCalList`, `clFilterHTML` | L25758–L25786 | Agenda renderers |
| `clAltsHTML` | L25726 | Alternative-slot chips |
| `CL_HOOKS {drawerLinks, readiness}` | L25876 | Filled by Cabinet (L26657–L26658) |
| `cbRowHTML`, `cbActions`, `cbWaitCard`, `cbTaskCard`, `cbStBadge`, `cbPublicLabel` | L26291–L26526 | Cabinet atoms |
| `plEvHTML`, `plBlkHTML`, `plLayout`, `plGridHTML`, `plMonthHTML`, `plAgendaHTML`, `plRowHTML`, `plUpcomingHTML`, `plMiniHTML`, `plRightHTML`, `plChip`, `plHead`, `plFilterBar`, `plTopCal` | L26738–L26982 | Planning atoms |

Shared icon set: `HRI` (defined L23977) is extended by `Object.assign(HRI,…)` at L24837, L25676, L26231 and L26779.

---

## 4. Interaction inventory

Every action is wired through **document-level delegated listeners**, each guarded by `R.contains(e.target)`:
- **Patients:** click L25323, input L25382, change L25389, submit L25397, keydown (capture) L25398.
- **Calendrier:** click L26001, change L26039, submit L26049, keydown L26052; plus pointer drag L25894–L25902.
- **Cabinet:** click L26597, change L26631, input L26641, keydown L26642; drag & drop L26644–L26647.
- **Planning:** click L27107, change L27159, input L27168, submit L27171, pointer L27175–L27179, keydown L27180.

**Distinct `data-*` hooks (FACT, unique attribute names):** Patients 87, Calendrier 68, Cabinet 60, Planning 67 (282 total). Some are not actions (for example `data-plcol`, `data-cbsince`, `data-plv`).

### 4.1 Patients (key controls)

| Control | Handler | Class |
|---|---|---|
| Nav, back, group toggle, mobile nav/scrim | L25325–L25328 | Functional |
| Role switcher + simulated practitioner | L25318 | **Simulated** (client-side roles; switching clears emergency access) |
| Global search (debounced 140 ms), Enter/ArrowDown navigation | L25384, L25400–L25401 | Functional |
| Directory: search (160 ms), filters, chips, sort column/dir, pager, size, saved views (built-in + user, delete), reset | L25335–L25341, L25339 | Functional |
| Row click / Enter → preview drawer; Up/Down between rows | L25333, L25403 | Functional |
| New patient wizard: step navigation, live duplicate panel on input, relationships add/remove/scope chips, file drop / picker (FileReader, 600 KB limit), consent capture | L24970–L25037 | Functional |
| Export CSV (optional contact columns, audited) | L24962 | Functional |
| Edit identity (reason required), contact, admin, prefs (version check) | L25204 | Functional |
| Relationship add/edit/end; consent record; privacy notice; care-team add / end / set lead | L25357–L25363 | Functional |
| Clinical add/edit (with reason), status change, entered-in-error, history | L25184–L25195 | Functional |
| Encounter write / sign (confirm) / addendum | L25351–L25353 | Functional |
| NKA attest / back to unknown | L25355–L25356 | Functional |
| Therapy: initial / goal / goal status select / measure / point form / note / close | L25354, L25394, L25397 | Functional |
| Documents: upload + classify, preview (image/text/PDF via blob URL), download (audited), metadata, new version, derivative, archive | L25227–L25237 | Functional (seed docs have metadata only → "Métadonnées seules") |
| Emergency access open / end | L25226, L25370 | **Simulated** permission (self-service, session-only) |
| Correction request / apply / reject | L25364–L25366 | Functional |
| Not-duplicate dismissal (reason), compare & merge (type MRN to confirm) | L25375–L25376, L25276 | Functional |
| Archive / restore / active toggle | L25242, L25367–L25368 | Functional |
| Print admin / clinical summary (hidden iframe `print()`) | L25244 | Functional (UNKNOWN popup-blocker behaviour) |
| Link form, open form in Forms & Surveys, open billing | L25249–L25250, L25408 | Functional (depends on other apps' globals) |
| Timeline chips / text / date filters, show-errors toggle | L25346, L25387, L25392 | Functional |
| Settings: specialties, retention inputs (500 ms debounce), specialty → form | L25388, L25395–L25396 | Functional |
| Audit filter / CSV export | L25386, L25391, L25378 | Functional |
| Demo reset | L25377 | Functional |
| "Book appointment", "Appointment" links in record (Calendar hook) | L26061–L26069 | Functional |
| Keyboard `/` focuses search; Esc closes dialog / search / drawer / nav | L25399, L25402 | Functional |

### 4.2 Calendrier

| Control | Line | Class |
|---|---|---|
| Mode segment, prev/next/today, date input, mini month, day header → day, month "+n", team chip, calendar hide checkbox, filters | L26011–L26016, L26040–L26042 | Functional |
| Keyboard: d/w/m/a/s modes, t today, n new, ←/→ (RTL-aware) | L26054–L26055 | Functional |
| Conflict counter → impacted dialog | L26017 | Functional |
| Display prefs menu (show cancelled, zoom, display tz) | L26018 | Functional |
| 9-step wizard: patient search (150 ms), external participant, service, practitioner / team / first-available, place / room / equipment, live slot grid (7 days, prev/next), manual forced slot (appt.force, reason), duration & weekly recurrence preview with per-occurrence exclude, notifications / status, checks, confirm (idempotent `idem`), stale/conflict → back to slot with alternatives | L25789–L25861 | Functional |
| Drawer: status transition buttons, reschedule, edit, duplicate (wizard at step 5), cancel, series edit/cancel, patient / record / billing / Cabinet links | L26019–L26024, L26659 | Functional |
| Drag-and-drop reschedule (pointer, 15-min snap, cross-column practitioner change in "by practitioner" view, conflict dialog with alternatives, undo toast) | L25893–L25902 | Functional (pointer only) |
| Requests: link to patient, confirm, decline | L26024, L26044 | Functional |
| Planning page: practitioner/date select, "Book" in gap, week bars | L26025, L26043 | Functional |
| Availability editor: add/remove range, save (submit) → impacted list; exception add/delete | L26026–L26028, L26050 | Functional |
| Resources: new/edit, declare/remove unavailability | L26029–L26030 | Functional |
| Notifications: filter KPIs, process queue, retry, simulate failure | L26031, L26047 | **Simulated** (no provider; `n.sim=true`) |
| .ics export (busy/service/full + confirm), import file, delete imported event | L26051, L26048, L26032 | Functional |
| Google/M365/iCloud cards | L25968 | Decorative (explicitly "Not connected") |
| Booking links create/revoke; public page preview with booking | L26033–L26034, L25980 | **Simulated** (preview inside staff window; fake URL) |
| Policy fields, prefs fields | L26045–L26046 | Functional |
| Demo reset, role switcher | L26035, L26007 | Functional / **Simulated** |

### 4.3 Cabinet

| Control | Line | Class |
|---|---|---|
| Establishment selector, role menu, nav | L26632, L26602, L26598–L26601 | Functional / **Simulated** roles |
| Check in (dialog), stage steps (waiting / called / back / done / no-show with grace), start (room-readiness confirm), cancel; "called" has an undo toast | L26604–L26606, L26594–L26596 | Functional (drives Calendar statuses) |
| Walk-in (books in Calendar starting in the next 5 min, then checks in) | L26350–L26361 | Functional |
| Reception tabs / search (220 ms) / practitioner filter | L26611, L26641, L26632 | Functional |
| Waiting room mine/all; public display open / fullscreen / close (5 s polling) | L26611, L26405–L26416 | Functional |
| Ops timeline date nav / by | L26612, L26633 | Functional |
| Practitioner status menu (incl. auto); registry edit | L26613, L26615 | Functional |
| Services edit | L26615 | Functional |
| Room readiness segment ("out" → issue dialog), issue report / take charge / resolve, issues filter | L26616–L26618 | Functional |
| Admin follow-up filter, create task | L26619–L26620 | Functional |
| Tasks: new/edit/detail, checklist check, comments, status buttons, kanban drag & drop (keyboard alternative = dialog buttons) | L26621–L26624, L26637, L26644–L26647 | Functional |
| Reports range / practitioner / CSV | L26627, L26632 | Functional |
| Config: policy, display mode/toggles, hours, announcements add/delete, bus retry, demo reset | L26625–L26630, L26638–L26640 | Functional |
| SMS / e-mail / kiosk, multi-workstation sync cards | L26577 | Decorative (honest "Not connected" / "Partial") |
| Drawer room select, reception note (on change) | L26634–L26635 | Functional |

### 4.4 Planning

| Control | Line | Class |
|---|---|---|
| Nav (13), mobile select, mode segment (pill), prev/next/today, mini month, day click, keyboard d/w/x/m/a, t, n, /, ←/→ | L27110–L27114, L27160, L27184–L27185 | Functional |
| Calendar visibility checkboxes, colour, show-only/all, remove, add practitioner/room calendar | L27162, L27101–L27105, L27125 | Functional |
| Search with dropdown jump; filters | L27169, L27161 | Functional |
| Kebab: colour-by, weekends, density, hours, side panel, internal event, waiting list, ics, open Calendrier, role & practitioner switchers | L27084–L27095 | Functional / **Simulated** roles |
| Event click → drawer; context menu; drawer actions (confirm, check-in via Cabinet, start/complete, reschedule, cancel, no-show, duplicate, "wants earlier", patient / Calendrier / Cabinet links) | L27115–L27136 | Functional |
| Drag move & resize (live conflict feedback, autoscroll, Esc cancel, undo) | L26968–L26980, L27175–L27178 | Functional (pointer only) |
| Click empty slot → quick create (new / block / meeting) | L27176–L27179, L26952 | Functional |
| Smart booking panel (search 160 ms, recent patients, service, practitioner, time of day, from, smart vs exact, look further +14 d, waiting list, full wizard, book with undo) | L27139–L27144, L27165–L27172 | Functional (undo = cancellation; see §13) |
| Waiting list: add, find slots, book suggestion/offer, declined, remove, filters | L27149–L27151 | Functional |
| Event type colours | L27152 | Functional |
| CSV, .ics, process queue | L27146, L27153 | Functional / **Simulated** queue |
| Right-panel task quick add and complete (via `plAsCb`) | L27157, L27164, L27173 | Functional |
| Google/Outlook card | L27062 | Decorative |

### 4.5 Counts by class

Estimate: per user-facing action, deduplicated. Treat these as ±10%.

| Class | Patients | Calendrier | Cabinet | Planning | Total |
|---|---|---|---|---|---|
| Functional (read end-to-end) | ~78 | ~60 | ~52 | ~58 | ~248 |
| Simulated (fake backend / demo-only permission) | 3 (role switch, simulated practitioner, emergency access) | 5 (role switch, outbox delivery, simulate failure, public booking preview, links) | 2 (role switch, simulated practitioner) | 3 (role switch, simulated practitioner, process queue) | 13 |
| Partial | 2 (form "todo" never completable — `paFormDone` L24835 unused; retention free-text only) | 2 (`weekends` pref dead L25732; establishment lists capped to 2 via `rmEsts().slice(0,2)` L25753, L25940, L25946, L25956) | 1 (billing-skip flags never displayed) | 1 (booking "undo" cancels) | 6 |
| Decorative / informational | 0 | 3 (external accounts) | 2 (integration cards) | 1 (Google/Outlook) | 6 |
| Broken | 0 found | 0 found | 0 found | 0 found | 0 |

Timers:
- Calendrier: 30 s (outbox delivery + now line) L26091.
- Cabinet: 15 s (wait counters + stale refresh) L26678; public display repaints every 5 s (L26412).
- Planning: 30 s (now line + stale refresh) L27205.
- Patients: none.

---

## 5. User journeys

**J1 — Register a patient (Patients).**
1. Open Patients, then New patient. Requires `pat.create`: reception, medlead or admin. The default role `clin` has no "New" button.
2. Step 1 Identity: a live duplicate panel appears from `paDupCands` (score ≥60, identity evidence required, L24602–L24615).
3. Contact → family (scope chips) → admin (establishment, lead, billing party) → intake. Intake is enabled only if `clin.edit` (medlead); otherwise a "reserved to care team" banner shows.
4. Consents → docs (drop files ≤600 KB, form to fill) → review.
5. Create: `paCreate` L24625 assigns `PAT-000NNN`. It emits `patient.registered`, adds documents, saves immediately, shows a toast, sends an OS notification, then opens the record.

Failure paths: per-step validation errors (shake). Potential duplicate → "I checked" checkbox required, or open the existing record from the panel link. File too big → toast. Cancel → dialog closes and nothing is saved.

**J2 — Clinician documents a session.**
1. Record → Encounters → New encounter (draft, optional linked appointment via `PA_HOOKS.encAppt`).
2. Write the note (`paEncDraft`, no audit), then Sign with confirm (`paEncSign`, requires note text and `clin.sign`; emits `clinical.noteSigned`).
3. Later, add an addendum with a reason.

Failure paths: not in the care team → locked panel → "Emergency access…" with a reason of ≥8 chars, logged (L24576). An empty note gives `pa_eEmptyNote`. Editing a signed note gives `pa_eSigned`.

**J3 — Merge duplicates.**
1. Data quality → Duplicates → Compare.
2. Pick the surviving record and per-field values; justification ≥8 chars; type the MRN of the gone record.
3. `paMerge` L24723 copies identifiers (`local-merged`), clinical entries (`mergedFrom`), docs, relations, consents (history), team and notices. It re-points other patients' relations and open corrections, stores a full JSON snapshot of both records, marks the gone record `merged`, and emits `patient.merged`.

Cancel/alternative: "Different people" with a reason → `notDup` list.

**J4 — Book an appointment (Calendrier wizard).**
1. Patient search → service → practitioner/team/any → place/room/equipment.
2. Slot from `clSlots` (L25540: windows minus blocks, conflicts, notice/window rules).
3. Duration/recurrence (preview with per-occurrence conflicts), notifications/status, checks, confirm.
4. `clBook` L25548 re-reads the store (`clReload`), checks `idem`, re-runs `clCheck`, then commits. It emits `appointment.booked` (+ `confirmed`) and queues notifications.

Failure paths: the slot was taken meanwhile → `cl_eStale` / `cl_eConflict` → back to the slot step with alternatives. A series conflict without "auto exclude" → error. Policy forbids external participant → `cl_eExtPolicy`.

**J5 — Day-of-visit flow (Cabinet).**
1. Reception → Check in. The identity checkbox is mandatory. Admin gaps can produce a task.
2. `cbCheckIn` L26156: expected → arrived (ticket A-NNN, late minutes) → waiting. Calendar status becomes `checkedin` via `cbAsCal`. The practitioner is notified ("Patient arrived").
3. Waiting room → Call → Start (warns if room not ready; Calendar status `inprogress`) → Complete (Calendar `completed` → bus → billing intake L26071–L26074).

Failure paths:
- No-show before the grace period: `cb_eNoShowEarly`.
- A practitioner acting on another practitioner's patient: `cb_eNotYours`.
- Stale appointment version: `cb_eStale`, and the screen refreshes.
- A walk-in conflict shows alternatives in the dialog error.

**J6 — Room goes out of service.** Rooms → readiness "Out" → issue dialog (preview of impacted bookings).
- `cbIssue` emits `resource.unavailable`.
- The Calendar consumer adds a maintenance block (L26076).
- A "Reschedule bookings" task with a checklist per appointment is created.
- Resolve → `resource.available` → the block is removed and readiness becomes "cleaning".

Bookings are never moved automatically.

**J7 — Cancellation frees a slot for the waiting list (Planning).**
1. Cancel in Planning or Calendrier → `appointment.cancelled`.
2. The `planning` consumer `plOnFreed` L26759 picks the best matching waiting entry (priority, creation date), re-checks conflicts and marks it `offered`, with an OS notification.
3. In Waiting list, choose "Book this slot" (`plWaitBook` → `clBook`) or "Declined" (back to waiting).

**J8 — Public online booking (preview).**
1. Online booking → open the public page from a link.
2. Choose service and practitioner, pick a slot (public rules: min notice / window block), fill name and contact, check consent.
3. Send → `clPublicBook` L25633 (honeypot, 3 requests per contact per hour in memory, link scope) → appointment `requested` → staff confirm in Requests.

**J9 — External calendar.** Sync → import .ics (UID-idempotent; cancelled or transparent events remove/skip) → imported events become "ext" blocks (warning severity in conflicts). Export .ics is busy-only by default; "full" requires a confirm.

**J10 — Smart booking (Planning).** New → pick a recent patient → type → suggestions ranked by `plSuggest` L26743 (lead time, usual practitioner +28, time-of-day ±, gap-filling +14, patient's site +8) → Book → toast with undo.

---

## 6. State & persistence

### 6.1 localStorage keys (exact)

| Key | Owner | Line | Shape (top level) | Versioning |
|---|---|---|---|---|
| `remotion-bus` | shared | L24468 | `{v:1, seq, ev:[{id,key,type,seq,ts,src,ref,ver,p}], done:{consumer:[keys]}, fail:[{consumer,key,type,ts,n,msg}]}`. Trimmed to 400 ev, 600 done/consumer, 100 fail (L24473). | `v!==1` → reset |
| `remotion-shared` | shared | L24468 | `{v:1, synthetic, pracs:[{id,hr?,name?,job?,spec,kind,active,color,bill}], services:[{id,n(4-lang pipe),spec,dur,minDur,maxDur,buf:[b,a],rooms,pracs,billSvc,active,public,tele,equip,prep,instr,intake}], estBill:{s1:"e1",s2:"e2"}}` | `v!==1` → seed; lazy field migrations for `services`, `estBill`, `p.bill` (L24487) |
| `remotion-patients` | Patients | L24534 | `{v:1, synthetic, seeded, role, me, seq, pats:[…], audit:[], corr:[], merges:[{…,snap:{keep,gone}}], notDup:["a|b"], set:{retention, specs, specForms, display, views}, org}` | `v!==1` or no `pats` → seed |
| `remotion-calendar` | Calendrier (also Planning, Cabinet) | L25429 | `{v:1, synthetic, tenant:"t1", role, me, rev, seeded, appts, series, avail, exc, res, ext, syncRuns, outbox, links, audit, pol:{minNotice,window,cancelNotice,allowExt,step,simFail}, prefs:{tz,dayStart,dayEnd,weekends,mode,by,zoom,hidden,showCancelled}, billSkips?}` | `v!==1` → seed; `rev` incremented on each save |
| `remotion-cabinet` | Cabinet | L26102 | `{v:1, synthetic, tenant, role, me, rev, visits:{apptId:{appt,stage,events,room,notes,alerts,arrivedAt,waitingAt,calledAt,startedAt,doneAt,ticket,late,idOk,walkin}}, prSt, ready, issues, tasks, ann, audit, sent, hours:{s1,s2}, pol:{lateMins,walkin,noShowGrace}, display:{mode,showPr,showRoom}, tick}` | `v!==1` → seed |
| `remotion-planning` | Planning | L26689 | `{v:1, synthetic, rev, prefs:{mode,colorBy,weekend,hourH,dayStart,dayEnd}, colors:{svc:hex}, cals:[{id,kind,ref?,on,color}], wait:[{id,pid,svc,pr,from,to,tod,prio,note,status,created,by,offer,hist,appt?}], audit}` | `v!==1` → seed; no reset UI |
| `remotion-dk-pa1`, `remotion-dk-cb1`, `remotion-dk-pl1` | OS install flags | L25424, L26684, L27210 | `"1"`. One-time placement of the desktop icon. Calendrier has none, because `calendar` is already a built-in app (L11746). | — |
| `BI_KEY` (Billing store, other area) | written here | L26074 | Calendar pushes into `biSt().appts` and saves (`biSave` or raw setItem) | — |

**Patient record shape (`paCreate` L24627, `paSeed` L24763).**
- Identity: `id`, `mrn`, `ids:[{sys,v,since,mergedAt?}]`, `status` (active|inactive|archived|merged), `prevStatus`, `archived{at,by,reason}`, `mergedInto`, `first`, `last`, `birthName`, `birth` (ISO|"unknown"), `sex` (F/M/X/U), `gender`, `lang`.
- Contact: `contact{phone,phone2,email,addr{l1,zip,city,country},pref,noVoicemail}`.
- Admin and preferences: `admin{est,payer,insurer,memberNo,gp,referrer}`, `prefs{lang,interp,access,comm,notes}`.
- Relationships: `rel:[{id,type,ref,name,phone,email,from,to,verif,doc,scope[],emergency,note,by,at,hist}]`.
- Care: `team:[{pr,lead,role,from,to}]`, `consents:[{id,type,state,date,by,scope,doc,expires,recBy,at,note,hist}]`, `notices`.
- Documents: `docs:[{id,cat,title,name,mime,size,file(dataURL|null),d,by,at,conf,status,derivOf,deriv,vers[],src,note,metaHist,archived}]`.
- Forms: `forms:[{id,name,status,at,by}]`.
- Clinical: `clin{hist,allergyState{state,by,at},allergies,problems,meds,enc,obs,labs,imaging,assess,plans,therapy}`. Each entry carries `{id,verif,src,srcDoc,by,byPr,at,amend:[{at,by,reason,prev}],status,…}`.
- Bookkeeping: `hist`, `created`, `upd`, `ver`, `createdBy`.

### 6.2 In-memory state

- **UI state objects:** `PA.ui` (L24535: view, stack, filters, sort, page, bg = emergency access per patient, drawer, timeline filters), `CL.ui` (L25430), `CB.ui` (L26103), `PL.ui` (L26690), `PL.np` (booking panel).
- **Other in-memory state:** `RM.retry` (per-consumer retry counts), `CL_RL` (public booking rate limit; lost on reload, L25632), `clDrag`, `plDrag`, `CB.stale`, `PL.ui.stale`.
- **Debounces:** `paSave` 200 ms (L24582), `clSave(false)` 150 ms (L25483), search timers.
- **Concurrency:**
  - `clReload` (L25485) replaces `CL.st` with the persisted one when `rev ≥` the local one, keeping `role`, `me` and `prefs`.
  - `cbReload` (L26136) and `plReload` (L26701) do the same when the persisted `rev` is greater.
  - Patients uses per-record `ver` (`paCheckVer` L24590) only in the edit dialogs.

### 6.3 Cross-app event bus contract (`remotion-bus`)

**Mechanics (FACT, L24472–L24483):**
- **Emit:** `rmEmit(type,payload,{key,src,ref,ver})`. If an event with the same `key` already exists it returns `null` (idempotent producer). Otherwise it appends `{id,key,type,seq++,ts,src,ref,ver,p}`, saves, and dispatches synchronously.
- **Subscribe:** `rmOn(type,consumer,fn)` registers in memory at script load (every subscriber below is registered whether or not its app is open).
- **Dispatch:** each consumer has a persisted `done[consumer]` list of keys, so an event is processed at most once per consumer. Exceptions are recorded in `fail[]` and retried up to 3 times with backoff of 400 ms × 3^(n-1).
- **Catch-up:** `rmCatchUp()` replays all retained events for unprocessed consumers. It is called when Calendrier, Cabinet or Planning opens (L26088, L26675, L27202) and from Cabinet config "Retry" (L26629).
- **Cross-tab:** a `storage` listener on `remotion-bus` (L24481) reloads the bus and dispatches events with `seq > previous seq`.
- **Stale guard:** `rmStale(applied,ver)` is defined (L24483) but **never called** (FACT, grep).
- **Payload rule (comment L24474):** no clinical content. FACT: payloads below hold ids, kinds and statuses only.

**Producers:**

| Event | Producer (line) | Key pattern | Payload |
|---|---|---|---|
| `patient.registered` | `paCreate` L24629 | `pat-reg-{pid}` | `{pid,mrn}` |
| `patient.updated` | `paUpdate` L24639 | `pat-upd-{pid}-{ver}` | `{pid,section}` |
| `patient.archived` | `paArchive` L24640 | `pat-arch-{pid}-{ver}` | `{pid}` |
| `patient.consent` | `paConsentSet` L24657 | `pat-cons-{pid}-{type}-{ver}` | `{pid,type,state}` |
| `clinical.changed` | `paClinAdd` L24670 | `clin-{entryId}` | `{pid,kind}` |
| `clinical.noteSigned` | `paEncSign` L24683 | `sign-{encId}` | `{pid,enc}` |
| `patient.document` | `paDocAdd` L24699 | `doc-{docId}` | `{pid,doc,cat}` |
| `patient.merged` | `paMerge` L24734 | `merge-{mergeId}` | `{keep,gone}` |
| `appointment.booked/confirmed/cancelled/checkedIn/started/completed/noShow/rescheduled` | `clEmitAppt` L25601 via `clBook` L25557, `clSetStatus` L25575, `clMove` L25582 | `{type}-{apptId}-{ver}-{hist.length}` | `{appt,pr,pid,start,end,svc,room,est,status[,from]}` |
| `appointment.seriesBooked` | `clBookSeries` L25565 | `sr-{sid}` | `{series,pr,pid}` |
| `appointment.seriesCancelled` | `clSeriesEdit` L25590 | `src-{sid}-{ver}` | `{series,from}` |
| `visit.{arrived,waiting,called,inconsult,done,cancelled,noshow}` | `cbStep` L26154 | `visit-{appt}-{stage}-{events.length}` | `{appt,pr,stage}` |
| `resource.unavailable` | `cbIssue` L26182 | `unavail-{issueId}` | `{rid,from,to,start,end,reason}` |
| `resource.available` | `cbResolveIssue` L26186 | `avail-{issueId}` | `{rid,of:busKey}` |
| `task.completed` | `cbTaskStatus` L26193 | `task-done-{id}` | `{task}` |
| `practitioner.updated` | `cbPrSave` L26445 | **none** → random key | `{pr,active}` |
| `service.updated` | `cbSvcSave` L26461 | **none** → random key | `{svc,active}` |

**Consumers:**

| Consumer id | Events | Line | Effect | Idempotency |
|---|---|---|---|---|
| `billing` | appointment.completed, appointment.noShow | L26071–L26074 | Push `{id:"cal-"+appt,…}` into the Billing read model if the service, practitioner and payer billing references exist; else append to `clSt().billSkips` | Skips if the `cal-{appt}` id exists |
| `calendar` | resource.unavailable / resource.available | L26076–L26077 | Add/remove a maintenance block (`src:"cabinet"`, `ref=ev.key`) | Checks `m.ref===ev.key` |
| `os-notify` | appointment.cancelled, appointment.rescheduled | L26079–L26080 | OS notification if the Calendrier/Cabinet window is open | done-list only |
| `cabinet` | appointment.cancelled / noShow / completed / rescheduled | L26663–L26665 | Advance the visit stage only forward (`CB_RANK`), never backwards; high-priority alert if a waiting patient's appointment moved | rank check |
| `planning` | appointment.cancelled | L26764 | Waiting-list auto offer (`plOnFreed`) | status check (`waiting` only) |
| `planning-ui` | appointment.booked / rescheduled / cancelled / statusChanged / completed / noShow, visit.waiting / inconsult / done, task.completed | L27190 | Refresh Planning if open | n/a. `appointment.statusChanged` is **never emitted** (FACT, grep). |

**Unconsumed events (FACT):** `patient.*`, `clinical.*`, `appointment.booked`, `confirmed`, `checkedIn`, `started`, `seriesBooked`, `seriesCancelled`, `practitioner.updated`, `service.updated`, and `visit.*` except as Planning refresh triggers. They are audit/integration signals only.

**Other storage listeners (FACT):**
- Patients: `remotion-patients` (L25425).
- Calendrier: `remotion-calendar` (L26097).
- Cabinet: `remotion-cabinet`, `remotion-calendar`, `remotion-shared` (L26652).
- Planning: `remotion-calendar`, `remotion-planning`, `remotion-cabinet`, `remotion-shared` (L27189).

**RISK (cross-tab double processing, INFERENCE).** `rmEmit` saves the event (with no `done` entries) *before* dispatching locally (L24475). Another tab's storage listener can therefore dispatch the same event to its own consumers before the first tab writes `done`. Both tabs then process it: OS notifications are duplicated, while billing and planning are protected by their own checks. A real broker with per-consumer offsets must replace this.

---

## 7. Integrations & external dependencies

- **Network:** none. `fetch()` is used only on `data:` URLs to make blobs (L25229, L25230). No CDN loads in this area. `window.claude` is not used.
- **Browser APIs:**
  - `localStorage` (keys in §6) and `storage` events
  - `FileReader.readAsDataURL` (L25036, L25232, L25236) and `File.text()` (L26048)
  - `Blob` and `URL.createObjectURL` downloads (`paDownload` L24906 / `clDownload` / `cbDownload`, which prefer `dcSaveFile` from the Documents area when present)
  - hidden iframe `print()` (L25248), `TextDecoder` (L25228)
  - `crypto.getRandomValues` for booking-link tokens (L25628)
  - `Intl.DateTimeFormat` / `formatToParts` for time-zone maths (L25436) and `formatRange` (L26820), `Intl.NumberFormat`
  - `Element.requestFullscreen` / `exitFullscreen` (L26414)
  - `ResizeObserver` (L25419, L26092, L26679, L27205)
  - Web Animations API (`el.animate`) everywhere, gated by `hrRM()`
  - `document.elementsFromPoint` (drag), `CSS.escape`
  - HTML5 drag & drop (Cabinet kanban, Patients file drop), Pointer Events (Calendrier/Planning drag)
- **OS integration:** `osWinOpen`, `osFocus`/`osRestore`, `osMenu` (context menus), `pushNc`/`NC_KIND` (notification centre), `OS_OPEN.patients|calendar|cabinet|planning`. The dock button add/remove animation monkey-patches `renderDock`, `dkOpenX` and `osRelabel` (L25421–L25423, L26094–L26096, L26681–L26683, L27207–L27209). It also uses `alStore`, `alTouch`, `alSave`, `desks`, `saveDesks`, `dkId`, `DK_APPS`, `AL_APPS` and `I18N` (adds `cabinet` and `planning` labels L26670, L27197).
- **Other apps read or written (globals):**
  - RH & Paie `hrSt()`: employees, leaves (approved leave becomes calendar unavailability, L25494), establishments `ests`.
  - Facturation `biSt()`, `biBal`, `biOverdue`, `biSave`, `biGo`, `BI_KEY`: balance card, parties, billing intake, practitioner/service references.
  - Formulaires `feLoad`, `feS`, `feName`, `feOpenForm`: form list, open in editor.
  - Documents `dcSaveFile`.
  - Shared helpers from RH & Paie: `hrE` (escape), `hri`, `HRI`, `hrNf`, `hrRM`, `hrCount`.
  - Global `L4` (L21374), `lang`, `OS_USER`, `toast`.
- **Internal cross-app calls inside the suite:**
  - Calendrier hooks Patients (`PA_HOOKS`, L26060).
  - Cabinet calls Calendrier domain functions under an impersonated role (`cbAsCal` L26130; `cbAsPa` L26131 is defined but unused).
  - Planning calls Cabinet under a mapped role (`plAsCb` L26775).
  - Cabinet hooks Calendrier (`CL_HOOKS` L26657–L26658) and Patients (L26661).
  - Navigation helpers: `paOpenPatient` (L25409), `paOpenBilling` (L25408), `clOpen` + `clGo` + `clDrawer`, `cbOpen` + `cbGo` + `cbDrawer`, `plOpen` + `plGo`, all with ~420 ms delays.

---

## 8. i18n / RTL

- All strings are inline 4-language pipe strings `"fr|en|de|ar"` resolved with `L4` (L21374: index by `lang`, falling back to EN then FR). Per-app word tables are `PAW` L24840, `CLW` L25677, `CBW` L26232 and `PLW` L26780; error tables are `PA_ERR` L24844, `CL_ERR` L25680, `CB_ERR` L26235 and `PL_ERR` L26783.
- **Data values carry translations:** service names are stored as pipe strings in `remotion-shared` (L24490–L24498). The Cabinet editor writes all four (L26454–L26460, `|` replaced by `/`). Seed clinical texts are French only (data).
- **Locale formatting:** `paLoc`/`clLoc` map `ar` to `ar-TN-u-nu-latn` (Latin digits) (L24849, L25536). Dates use `toLocaleDateString` with explicit `timeZone`. The Planning mini month starts on Sunday only for `en` (L26865).
- **RTL:** each app root sets `dir` from `document.documentElement.dir` (L24872, L25702, L26260, L26804). Animations and arrow keys invert in RTL (L24888, L26055, L27185). CSS uses logical properties (`inset-inline-start`, L25766, L26422). The Arabic service-name input is `dir="rtl"` (L26469). The Cabinet ops timeline scroll is RTL-aware (L26419).
- **Re-render on language change:** the patched `osRelabel` re-renders each open app.
- Some literal strings are French only: audit `detail` texts such as "doublon écarté explicitement" (L24628), "forcé : " (L25557), CSV headers (L24965, L25378, L26563), and Cabinet log "note d’accueil" (L26160).

---

## 9. Design tokens & motion

- **Per-app CSS variables:**
  - Patients charts and highlight: `--pa-chart0`, `--pa-chart1`, `--pa-hl`, with dark variants (CSS ~L6060).
  - Cabinet stage colours on `.cbapp`: `--cb-exp/arr/wait/call/cons/done/off` (light/dark).
  - Planning theme on `.plapp`: `--pa/--pa2/--pas` (indigo `#4f5bea`), `--pl-bg/card/line/mut/r/sh`, and overrides `--hr-b/--hr-b2/--hr-bs` (shared accent) (light/dark).
  - Per element: `--c` (practitioner / status colour), `--ec` (event colour), `--pc`, `--p` (percent), `--w`, `--h`, `--u`, `--i` (stagger index).
- **Brand colours (FACT):**
  - Patients dock gradient comes from `DK_APPS.patients` (defined elsewhere).
  - Calendrier notification `#3fd27a → #16a352`.
  - Cabinet `#34c3a0 → #0f8f74` (L26668).
  - Planning `#7c8cff → #4f46e5` (L27195).
  - Practitioner colours are in the seed (L24501–L24508); Planning palette `PL_PAL` (L26694), status colours `PL_STC` (L26696).
- **Dark mode:** selectors `:root.dark …` and `:root[data-theme="dark"]:not(.light) …` (CSS area).
- **Keyframes:**
  - Patients: `paDraw`, `paGrow`, `paHl`, `paPop`, `paShim` (skeleton shimmer).
  - Calendrier: `clIn`, `clRun`.
  - Cabinet: `cbBlink`, `cbGlow`, `cbPulse`, `cbRise`.
  - Planning: `plDrop`, `plFlash`, `plGlow`, `plLive`, `plPop`.
  - Four `@media (prefers-reduced-motion:reduce)` blocks. JS animations check `hrRM()` (reduced-motion media query or the lock-screen setting).
- **JS motion:** easing `cubic-bezier(.2,.9,.3,1)`, 220–420 ms. Stagger delay is `min(i,10..24)×18–35 ms`. Error shake is ±5 px over 240 ms. The dock button uses an overshoot `cubic-bezier(.2,1.3,.3,1)`.
- **Responsive:** the JS sets `data-sz` = `s` (<760 px), `m` (<1180 px, or <1240 px for Planning) or `l` on each root via `ResizeObserver` (L24871, L25701, L26259, L26797). CSS uses `[data-sz="s"]` 99 times and `[data-sz="m"]` 10 times, plus two `@container` queries (max-width 58 px / 84 px, event-size adaptation). Planning switches week → day on small windows at open (L27205). Window sizing: `W=min(1640|1680, innerWidth-16)`, `minW 340`, `minH 420`.

---

## 10. Accessibility observations

Positive (FACT):
- Dialogs use `role=dialog aria-modal=true aria-label`, have a Tab focus trap and Esc, autofocus the first field, and restore focus on close (L24900–L24904 and equivalents).
- Toasts are `role=status aria-live=polite`.
- Range labels are `aria-live` (L25743, L26828); the public display "called" section is `aria-live=polite` (L26408).
- The record section nav is `role=tablist aria-orientation=vertical`, with `role=tab aria-selected` and roving `tabindex`, Up/Down/Home/End navigation (L25044, L25404), and a panel with `role=tabpanel`.
- Nav items use `aria-current="page"`; collapsible groups use `aria-expanded`; segmented controls use `role=group` + `aria-pressed` (41 occurrences).
- Directory table headers have `aria-sort` buttons (L24938). Rows are focusable (`tabindex=0`) and support Enter and Arrow keys (L25403).
- 198 `aria-label` attributes, including on icon buttons with entity names ("Preview Camille Dupont").
- Charts use `role=img` with an `aria-label`, `<title>` per point, and a table equivalent next to them (L25145).
- Allergy banners use `role=note`. The skeleton uses `aria-busy`.
- Every move has a keyboard alternative: the Calendrier/Planning reschedule dialog for drag, Cabinet task dialog status buttons for kanban drag (comment L26643).
- Keyboard shortcuts work in both Calendrier and Planning.

Issues:
- The mini-month grid `role=grid` (L25760) contains plain buttons with no rows or gridcells, so the ARIA pattern is incomplete. The agenda columns use `role=gridcell` with no grid/row parents (L25772).
- Planning events are `div role=button tabindex=0` (L26850). Enter is handled; Space is not (INFERENCE from L27182).
- Drag-to-resize in Planning has no keyboard equivalent other than the reschedule dialog. Duration cannot be changed by keyboard in Planning (INFERENCE).
- Global search results are `role=listbox` / `role=option` but focus moves to buttons, with no `aria-activedescendant` and no `aria-expanded` on the input (L25319–L25320).
- The Cabinet public display traps focus only among its buttons (L26415).
- The quick-create popover is `role=dialog` with no `aria-modal` and no focus trap (L26952).
- Colour coding (event colour by type, status chips) is accompanied by text labels in most places.

---

## 11. Migration notes for Next.js (App Router, TypeScript, React)

### 11.1 DOM patterns to replace
- Every view is an HTML string rebuilt with `innerHTML` on each refresh (54 `innerHTML` uses; `paRefresh` L24896, `clRefresh` L25717, `cbRefresh` L26278, `plRefresh` L26813). Escaping relies on `hrE` (2,386 calls). In React this becomes JSX components; scroll and caret preservation hacks (L25317, L26641, L27169) go away.
- **Global listeners:** about 26 `document`-level delegated listeners (click/change/input/submit/keydown/pointer/drag) and 5 `window` `storage` listeners. All are registered at module load, even when the app is closed (they early-return).
- Modals and drawers are imperatively appended to the app root (`R.appendChild`), and their closures capture wizard state (`w`, `i`, `done`). Map them to React state machines (for example the 8-step patient wizard and the 9-step booking wizard).
- **Monkey-patching OS globals** (`renderDock`, `dkOpenX`, `osRelabel`) has to become an app registry in the shell.
- **Impersonation by mutating another store's `role/me`** (`cbAsCal` L26130, `plAsCb` L26775) must become server-side service authorisation.

### 11.2 Globals shared with other areas
- **Used from other areas:** `hrE`, `hri`, `HRI`, `hrNf`, `hrRM`, `hrCount`, `hrSt`, `L4`, `lang`, `toast`, `osMenu`, `osWinOpen`, `osFocus`, `osRestore`, `osRunMark`, `pushNc`, `NC_KIND`, `OSW`, `OS_OPEN`, `OS_USER`, `DK_APPS`, `AL_APPS`, `alStore`, `alSave`, `alTouch`, `dkGlyph`, `dkOpenX`, `dkPop`, `renderDock`, `osRelabel`, `desks`, `saveDesks`, `dkId`, `I18N`, `biSt`, `biBal`, `biOverdue`, `biSave`, `biGo`, `BI_KEY`, `feLoad`, `feS`, `feName`, `feOpenForm`, `dcSaveFile`.
- **Exposed to the OS:** `OS_OPEN.*`, `paOpenPatient`, `paOpenBilling`, `clOpen`, `cbOpen`, `plOpen`.
- No other area calls into `pa*/cl*/cb*/pl*` except the window-key routers (L11857, L20980).

### 11.3 Client-only concerns
- `Intl` time-zone maths can run on the server.
- DnD, `ResizeObserver`, fullscreen, FileReader, print and blob downloads are client-only.
- Timers (5/15/30 s) become polling or SSE/WebSocket subscriptions.

### 11.4 Suggested module decomposition

| Module | Pure TS (extract unchanged) | React components | Server responsibilities |
|---|---|---|---|
| `shared/healthcare` | spec list; practitioner/service registry types; `rmSafeName` | — | practitioner & service catalogue API; event broker (transactional outbox, per-consumer offsets) |
| `patients` | `paNorm`, `paLev`, `paSim`, `paDupScore`, `paDupCands`, `paDupPairs`, `paValidate`, `paCompleteness`, `paConsent`, `paTimeline`, `paAge`, `PA_*` enums, `paMerge` logic (as a server transaction), clinical entry validators `paClinCheck` | Directory (table, filters, saved views), PreviewDrawer, RegistrationWizard, RecordLayout + 24 section components, ClinicalEntryDialog per kind, ObsChart, TherapyEpisodeCard, DocumentsList/Viewer, MergeCompareDialog, DQ pages, Audit page | MPI/MRN sequence, care-team ABAC, break-glass with expiry and review, immutable audit, document object storage + virus scan + versioning, consent registry, merge/unmerge |
| `calendar` | `clParts`, `clOffset`, `clZ`/`clZms` (DST gap/fold), `clSeriesKeys`/`clSeriesOcc`, `clCheck`, `clSlots`, `clLanes`, ICS escape/parse/export, `CL_TRANS` state machine, `clMask` | AgendaGrid (day/week/workweek), ResourceColumns, MonthView, ListView, MiniMonth, BookingWizard (9 steps), AppointmentDrawer, Availability editor, Resources, Notifications, Sync, BookingLinks, PublicBookingPage (separate public route) | transactional booking with row locking/exclusion constraints, idempotency keys, recurrence storage, notification worker + providers (SMS/e-mail), public booking API with rate limiting/captcha, OAuth calendar sync |
| `cabinet` | `cbStage`, `CB_TRANS`, `cbReport` metric definitions, `cbPublicLabel` | Dashboard, Reception, CheckInDialog, WalkIn, WaitingRoom, PublicDisplay (separate kiosk route), OpsTimeline, Practitioners, Services, Rooms/Issues, AdminFollowUp, Tasks kanban, Reports, Config | visit state store, real-time push to workstations and display, task service |
| `planning` | `plSuggest` (ranking), `plLayout`, `plOnFreed` matching | PlanningShell, CalendarGrid with drag/resize (e.g. dnd-kit), SmartBookingPanel, WaitingList, secondary views | waiting-list service & offer workflow |

### 11.5 Security & privacy (health data)

These are **RISK** items.

1. **Clinical data in plain localStorage.** `remotion-patients` holds identity, contacts, third-party relatives' contacts, encounter notes, allergies, medications, observations, labs, imaging conclusions, therapy notes and **uploaded documents as base64 data URLs** (L24699, L25036). It is unencrypted, shared by every user of the browser profile, and readable by any script on the origin, including the other ~20 apps in this single-file OS.
2. **Permissions are simulated client-side.**
   - Anyone can switch role or "simulated practitioner" from the bar (L25318, L26007, L26602, L27094) and the choice is persisted.
   - Emergency access is self-service: a reason of ≥8 chars, no second approver and no expiry other than window close (L24576, L25417).
   - The in-app text says so (L24563, L25309, L25994).
3. **Audit logs are client-writable and truncated** to 800 entries (L24588, L25486, L26137) or 400 for Planning (L26702). The Planning audit is never displayed.
4. **Exports:** the patient list CSV (optional contacts) and the audit CSV have no CSV-injection guard. `esc()` only quotes `;`, `"` and newline (L24965, L25378), so cells starting with `=+-@` are not neutralised.
5. **Quota and silent data loss:** `paSave`/`clSave`/`cbSave`/`plSave` catch storage errors with `console.warn` only (L24582, L25483, L26135, L26700), while the UI still toasts "Saved". With 600 KB documents (`PA_MAXDOC` L24697) the ~5 MB quota is reached after a handful of documents.
6. **Role leakage across stores (FACT).**
   - `cbAsCal` swaps `CL.st.role/me` and then calls `clSetStatus`/`clBook`, which call `clSave()` **inside** the swap, so the mapped role is persisted to `remotion-calendar` until the next normal save (L26130 + L25575).
   - `plAsCb` → `cbTaskStatus`/`cbTaskSave` → `cbSave()` has the same problem (L26775).
7. **Privacy leaks in Planning (FACT).** Planning uses `clCanSeeDetails` for events but shows patient names regardless of the `appt.details` permission in:
   - the `pats` view (L27001–L27006);
   - waiting-list items (L27027);
   - notification offers (L27067);
   - the `plOnFreed` OS notification (L26763);
   - Cabinet task titles that embed patient names in the right panel (L26876; seed L26223).

   A "viewer (no patient details)" role therefore sees identities.
8. **Public booking** runs inside the staff UI (preview). Token checks, the honeypot and the in-memory rate limit (`CL_RL`) are client-side. The seed token uses `Math.random` (L25671).
9. **Positive design choices to preserve:**
   - The audit has no clinical content.
   - The directory hides clinical data.
   - The public display shows initials, a ticket or nothing.
   - .ics export is busy-only by default.
   - Notification recipients are masked (`clMask` L25609).
   - The NKA attestation is explicit, entries are amended rather than overwritten, and "entered in error" replaces deletion.
   - Bus payloads carry ids only.

### 11.6 Simulated backend behaviours a real server must take over

| # | Behaviour | Where |
|---|---|---|
| 1 | Authentication / identity of the acting user (`OS_USER` or simulated practitioner `me`) | `paUser` L24572, `clUser` L25478, `cbUser` L26127 |
| 2 | RBAC matrices and their enforcement (`paCan`, `clCan`/`clCanPr`, `cbCan`) | L24564–L24578, L25466–L25477, L26118–L26126 |
| 3 | Care-team–scoped clinical ABAC + break-glass workflow (approval, expiry, review) | L24573–L24578 |
| 4 | Multi-tenancy filter (`tenant:"t1"`, `clT`) — rows of tenant `t2` are seeded and hidden only by the client | L25487, L25668 |
| 5 | MRN sequence & duplicate detection (MPI) | L24591, L24599–L24615 |
| 6 | Atomic merge with snapshot / unmerge | L24723 |
| 7 | Optimistic concurrency (record `ver`, store `rev`, `clReload` before commit) → DB transactions / ETags | L24590, L25485, L26136 |
| 8 | Booking integrity: re-validation at commit, resource capacity, idempotency keys, alternatives | L25548–L25557 |
| 9 | Recurrence storage & exception handling ("one / following / all", split series) | L25560–L25598 |
| 10 | Availability engine incl. HR leave, org closures, external busy | L25494–L25542 |
| 11 | Notification outbox + delivery worker, retries/backoff, consent & channel rules (currently `sim:true`, `simFail`) | L25604–L25612, L26091 |
| 12 | ICS import/export; Google/Microsoft/iCloud sync (OAuth, webhooks) — not simulated | L25614–L25625, L25968 |
| 13 | Public booking links: token issuance, expiry, max uses, rate limit, bot protection, public read model | L25628–L25635 |
| 14 | Integration event bus (outbox, per-consumer checkpoints, retries, catch-up, cross-node delivery) | L24472–L24483 |
| 15 | Billing intake consumer (completed/no-show → appointments to bill) and surfacing of skipped items | L26071–L26074 |
| 16 | Room unavailability propagation Cabinet → Calendar | L26182, L26076 |
| 17 | Real-time multi-workstation sync (now only `storage` events within one browser; in-app note L26268, L26577) | L26652, L27189 |
| 18 | Waiting-list auto-offer on cancellation | L26759–L26764 |
| 19 | Document storage, versions, derivatives, retention policy | L24697–L24710 |
| 20 | Audit logging (immutable, complete) | `paLog`/`clLog`/`cbLog`/`plLog` |
| 21 | Cross-app authorisation (`cbAsCal`, `cbAsPa`, `plAsCb`) | L26130–L26131, L26775 |
| 22 | Reports computation (attendance, wait, utilisation) over full history | L26205, L27071 |
| 23 | Demo seeding & reset | `paSeed` L24756, `clSeed` L25643, `cbSeed` L26215, `plSeed` L26703 |
| 24 | Public waiting-room display feed (now 5 s local polling) | L26412 |
| 25 | Live reads of HR (names, leaves) & Billing (balances) — need service APIs | L24510, L24752 |

### 11.7 Estimated complexity

| Module | Estimate | Reason |
|---|---|---|
| Patients | **XL** (±20%) | 24 sections, 11 clinical kinds, merge, documents, strict audit/permission semantics |
| Calendrier | **XL** | Time-zone/DST correctness, recurrence, conflict engine, wizard, DnD, ICS, public booking |
| Cabinet | **L** | Mostly read-models over Calendar plus visits/tasks/rooms; real-time is the hard part |
| Planning | **L** | Second UI over the same domain; DnD/resize, ranking, waiting list |
| Shared foundation / bus | **M** (in-app) to **L** (server broker) | — |

---

## 12. Counts summary

| Item | Patients | Calendrier | Cabinet | Planning | Shared | Total |
|---|---|---|---|---|---|---|
| JS lines | L24530–L25426 (897) | L25427–L26098 (672) | L26099–L26685 (587) | L26686–L27210 (525) | L24463–L24529 (67) | 2,754 (~896 KB) |
| CSS lines | L6058–L6215 (158) | L6216–L6342 (127) | L6343–L6501 (159) | L6502–L6671 (170) | (hr-* elsewhere) | 614 (~131 KB) |
| Top-level views / pages | 11 (+24 record sections) | 11 (agenda × 5 modes × 3 day layouts) | 12 | 13 (cal × 5 modes) | — | 47 pages |
| Dialogs / drawers / menus / overlays (approx.) | ~32 | ~20 | ~16 | ~16 | — | ~84 |
| Wizards (steps) | 1 (8) | 1 (9) | 0 | 1 smart panel (5 sections) | — | 3 |
| Builder components (main) | ~25 | ~20 | ~10 | ~20 | ~10 | ~85 |
| `data-*` hooks | 87 | 68 | 60 | 67 | — | 282 |
| Interactions Functional / Simulated / Partial / Decorative / Broken | 78/3/2/0/0 | 60/5/2/3/0 | 52/2/1/2/0 | 58/3/1/1/0 | — | ~248/13/6/6/0 |
| localStorage keys | 2 (`remotion-patients`, `remotion-dk-pa1`) | 1 (`remotion-calendar`) | 2 (`remotion-cabinet`, `remotion-dk-cb1`) | 2 (`remotion-planning`, `remotion-dk-pl1`) | 2 (`remotion-bus`, `remotion-shared`) | 9 (+ writes into Billing's `BI_KEY`) |
| Bus event types emitted | 8 | 10 (8 appointment.* + 2 series) | 7 groups (visit.* ×7 stages, resource ×2, task, practitioner, service) | 0 | — | ~31 concrete types |
| Bus consumers | 0 | 3 (`billing`, `calendar`, `os-notify`) | 1 (`cabinet`) | 2 (`planning`, `planning-ui`) | — | 6 |
| Timers | 0 | 1 (30 s) | 2 (15 s, display 5 s) | 1 (30 s) | — | 4 |
| `storage` listeners | 1 | 1 | 1 | 1 | 1 | 5 |
| Keyframes | 5 | 2 | 4 | 5 | — | 16 |
| External network calls | 0 | 0 | 0 | 0 | 0 | 0 |

---

## 13. Defects / inconsistencies found

All are FACT unless marked otherwise. Current behaviour is described; nothing was fixed.

1. **Silent persistence failure.** Save errors are swallowed (`console.warn`) and the success toast still shows (L24582, L25483, L26135, L26700). Documents are base64 in localStorage with a 600 KB limit per file (L24697), so the quota is easily exceeded. Expected: a visible error or rollback.
2. **Role persisted under impersonation.** `cbAsCal`/`plAsCb` mutate another store's `role/me` and the callee saves during the swap (L26130, L26775 → L25575/L26193). Expected: no persistence of the borrowed role.
3. **Planning exposes patient names to roles without `appt.details`.** Affects the `pats` view L27001, waiting list L27027, notifications offers L27067, the auto-offer OS notification L26763, and task titles L26876. Expected: the same masking as `plName` / `clCanSeeDetails`.
4. **Patients "History & activity" shows the per-record audit to any non-reception role** (`paCan("audit.view")||paRole()!=="reception"`, L25108), which includes `clin` without `audit.view`. Expected: gate on `audit.view`.
5. **Booking "Undo" in Planning cancels the appointment** with reason "other" (L26949) instead of voiding it. This queues a patient cancellation notification and fires `appointment.cancelled`, which **auto-offers the slot to the waiting list** (L26764).
6. **`appointment.statusChanged` is subscribed but never emitted** (L27190), and `rmStale` is never used (L24483).
7. **`practitioner.updated` and `service.updated` are emitted without a key** (L26445, L26461). They get a random key, which contradicts the idempotent-key contract (L24474).
8. **Billing skips are recorded but never shown.** `clSt().billSkips` (L26073) has no UI, although the Cabinet services page says such appointments "are flagged in Calendar" (L26467).
9. **Forms linked to a patient can never be marked done.** `paFormDone` (L24835) has no UI caller.
10. **Calendrier `weekends` preference is dead.** `clRange` week mode always yields 7 days (`P.weekends?7:7`, a filter ending `||true`, L25732), and no UI toggles it.
11. **Establishment pickers are capped to the first two establishments** with `rmEsts().slice(0,2)`: filters L25753, availability L25940, exceptions L25946, resources L25956. Patients and Cabinet use the full list. INFERENCE: a third HR establishment would be unusable in Calendrier.
12. **Audit label and semantics inconsistencies (Patients).**
    - `record.print` has no `PA_ACT` label (L25248), so the raw key is displayed.
    - Setting a lead practitioner is logged as `team.add` (L25362).
    - Draft encounter edits are not audited (`paEncDraft` L24832, intentional per comment).
    - Several audit details are French-only (L24628, L25557).
13. **MRN sequence gap in the seed.** `pa16` increments `S.seq` twice (L24828 plus `mk()`), so the next MRN skips one number.
14. **Inconsistent keyboard shortcuts.** Work week is `s` in Calendrier (L26054) and `x` in Planning (L27184).
15. **`plEventSave` sets the exception kind to `"block"` in both branches** (`kind==="meeting"?"block":"block"`, L26768). Meetings are distinguishable only through `evt`.
16. **Dead code:**
    - `cbSetPrStatus` has an empty `forEach` on checked-in appointments when the status is "late" (L26166).
    - `cbAsPa` is unused (L26131).
    - The `.hr-dlg [data-clalt]` branch is a no-op (L26036).
    - `rc` is computed and unused in the Planning day-click (L27113).
17. **No reset or audit view for Planning data.** `remotion-planning` has no removeItem or reseed, and `plSt().audit` is never displayed.
18. **Cross-tab bus double processing is possible** (INFERENCE, §6.3). Duplicate OS notifications are the likely visible symptom.
19. **Waiting-room refresh claim.** The page says "Auto-refresh every 15 s" (L26393). Only wait counters tick every 15 s (`cbTick` L26650); new arrivals from the same tab appear only after actions or storage events from another tab. (INFERENCE: same-tab Calendar changes made in another window of the same document trigger no storage event.)
20. **CSV injection** is not mitigated in the Patients list, Patients audit, Cabinet report and Planning CSV exports (L24965, L25378, L26562, L27097).
21. **Accessibility gaps** are listed in §10: incomplete grid roles, no Space on `role=button` divs, no focus trap on quick create, listbox without active-descendant.
