# 04 · User journeys and feature parity

Status: **complete at journey level.** Step-by-step traces with line evidence for every journey are in `evidence/inventories/0X-*.md §5`. This document catalogues them in the brief's eight-field format, adds the **cross-app journeys** (the highest-risk part of the migration), and sets the parity baseline used by the matrix in doc 12.

Fields: Entry · Auth/permission · Main actions and transitions · Side effects (storage, bus, other apps) · Validation and recovery · Completion and persistence. "Sim." means the step is simulated in the source.

---

## 1. OS shell journeys (area A–B)

| ID | Journey | Entry | Auth | Main actions → transitions | Side effects | Validation / recovery | Completion |
|---|---|---|---|---|---|---|---|
| J-OS-01 | Boot to desktop | load | none (lock not shown at boot) | boot animation → desktop; workspace menu open ≥860 px | reads 40 keys; seeds desktop icons once (`remotion-dk-*` flags) | — | desktop interactive |
| J-OS-02 | Switch language | top-bar language menu, lock/sign-in popovers | none | View Transition with staggered panels → all components re-render; Arabic sets `dir=rtl` | `remotion-lang`; on-screen keyboard follows if `kbFollow` | reduced motion → instant | toast "Langue : Français" |
| J-OS-03 | Theme light/dark/auto | top bar, system menu, palette | none | circular reveal transition | `remotion-theme` (absent = auto) | — | persisted |
| J-OS-04 | Virtual desktops | Desktops button, Ctrl+Win+arrows, 2-finger swipe | none | add (≤12) → slide 820 ms + HUD → rename / wallpaper / close with Undo | `remotion-desks` (+ `remotion-ws-desks`) | cap toast; last desktop cannot close | persisted |
| J-OS-05 | Workspaces | workspace menu | none | switch → desktops and windows swapped, HUD with counts | `remotion-ws-desks` | — | persisted |
| J-OS-06 | Open app and manage window | dock, rail, launcher, desktop icon, Files, terminal `open` | none | genie open → focus/min/max/close; snap; move to desktop/workspace | app store load; dynamic dock button | unregistered key → toast (Sim.) | window state in memory only (not persisted, FACT) |
| J-OS-07 | App mode / pop-out | window menu, dock/launcher/desktop menus, Ctrl+Shift+Enter | none | app fills the tab, or `window.open(#app=key)` → standalone boot | other window syncs via `storage` | pop-up blocked → dialog (copy link / app mode here); **hrPeople broken (BR-01 / D-B01)** | standalone window |
| J-OS-08 | Lock / unlock | Ctrl+Alt+L, menus, idle | **Sim.** password ≥4 chars, PIN 1234, passkey/SSO timers | lock (shell inert) → face → unlock → boot | `remotion-lk` | <4 chars error; 5 fails → 30 s lockout; CapsLock warning | unlocked |
| J-OS-09 | Sign out → sign in | account menu | **Sim.** | power screen → sign-in (email/SSO/passkey/provider/gov ID) → boot | `remotion-si` (remember e-mail) | invalid e-mail, lockout, reset password flow (Sim.) | signed in |
| J-OS-10 | Register account (5 steps) | sign-in "Create one" | **Sim.** OTP any 6 digits | account → profile (photo ≤5 MB) → org (invite / SIRET detect / create) → verify → review → create | `remotion-accs-extra`, `remotion-acc` | per-field errors; Esc steps back | "Open workspace", language switched |
| J-OS-11 | Command palette | Ctrl+K, search bar | none | type → ↑↓ → Enter runs app/action/shortcut/item | depends on action | empty result state | — |
| J-OS-12 | Notifications | bell, Ctrl+Shift+N, banners | none | filter/search → detail → primary action (Sim.) / snooze 1 h / delete with Undo; settings DND, quiet hours | `remotion-nc` (settings only; notifications not persisted) | — | — |
| J-OS-13 | On-screen keyboard typing | keyboard menu, Ctrl+Shift+K | none | type into the focused field; suggestions; long-press accents; float/drag | `remotion-kb` | — | — |
| J-OS-14 | Custom shortcut | Ctrl+/ → Custom | none | record combo (requires a modifier; rejects taken combos) → save → active | `remotion-custom-sc` | Esc cancels | active immediately |
| J-OS-15 | Change location/department | account menu | none | expand site → department → 0.42 s busy | `remotion-units` | — | top-bar role line updates |
| J-OS-16 | Organise desktop files | desktop context menu, drag | none | new folder → rename → drag into folder → open folder window → drag out; delete → trash → Undo | `remotion-desks`, `remotion-trash` | Esc cancels rename; **Cut loses unpasted items (Pa)** | persisted |
| J-OS-17 | Files manager | Files app | none | navigate places, DnD rows to folder/sidebar/desktop/trash, tags, upload ≤12 files | `remotion-fs` | delete forever without confirm | persisted |
| J-OS-18 | Terminal | Terminal app | none | `cd`, `mkdir`, `touch`, `ls`, `open`, `rm` … (12 commands) | virtual FS | "command not found" | persisted via FS |
| J-OS-19 | Install app | launcher "Available" | none | click → 1.3 s progress (Sim.) → installed → open | `remotion-apps` | — | **uninstall does not hide dock/rail (defect)** |
| J-AI-01 | Ask Remotion AI (live) | AI button, Quick Look "Ask AI" | none | compose (+ ≤4 attachments, workspace context) → stream answer → Stop | `remotion-ai` (stores prompts **and attachment text**) | 5 mapped error states; truncated notice | conversation persisted (≤30) |
| J-AI-02 | Fill VPH form from PDF (demo) | AI suggestion | none | scripted extraction (Sim.) → in-chat form card → type "poids 72, taille 178" (regex parser) or live `set_fields` tool → certify → "valider" | `remotion-ai.form` | missing → jump to field; not certified → shake | validated message; download Sim. |

## 2. Application journeys (areas C–H)

| ID | Journey | Entry | Auth | Main actions → transitions | Side effects | Validation / recovery | Completion |
|---|---|---|---|---|---|---|---|
| J-FE-01 | Create a form (6 modes) | Forms → New | none | blank / template (12) / wizard (4 steps) / AI (staged ops preview) / import JSON-CSV-PDF-DOCX / compose blocks / duplicate | `remotion-forms`; CDN pdf.js/mammoth for PDF/DOCX; `window.claude` for AI | invalid import warnings; AI with nothing understood leaves an empty draft (RISK) | editor opens |
| J-FE-02 | Build and edit | editor | none | add 80 field types; drag reorder; per-device widths; sections/pages; undo/redo 80 | autosave 900 ms | Ctrl+S | saved timestamp |
| J-FE-03 | Logic and rules | field props / Rules tab | none | AND/OR with 9 operators; page skip rules; dependency/cycle analysis | — | analysis flags errors | — |
| J-FE-04 | Preview and test submit | Preview tab | none | desktop + phone mirrors; per-page validation; summary; submit test | test submission saved (with signature data URL) | shake + scroll to first error | thank-you screen |
| J-FE-05 | Publish and share | header | none | Publish → version snapshot; share link/embed/invites/tokens (**Sim.**) | `remotion-forms.ver` | — | "v n published" |
| J-FE-06 | Review submissions | Submissions | none | open drawer → approve / request correction (note) / reject (note) | audit log per submission | notes required | status updated |
| J-FE-07 | Autofill with provenance | Preview options | none | choose sources → review rows → apply → provenance badges | — | conflicts off by default | — |
| J-FE-08 | Reusable blocks | section menu | none | save as block → insert → publish block → outdated instances update/ignore/unlink | `blocks` | — | — |
| J-DC-01 | Edit the sample report | Documents | none | type → undo burst 1.2 s → sanitise → save 500 ms → thumbnails/pagination/checker refresh | `remotion-docs` | Ctrl+Z | "All changes saved" (**even when quota fails, D2**) |
| J-DC-02 | Create from template | Templates (5 collections) | none | preview → use | — | unknown id → blank | editor |
| J-DC-03 | Import a file (25 extensions × 3 modes) | New ▸ Import, drop | none | parse per file → destination (new / add) → style/PDF/Word/as-is options | IndexedDB for "as is" | per-file errors; size limits 8 MB / 60 MB; signed-locked documents refuse "add" | document opens |
| J-DC-04 | Fill and export an official VPH form | Templates ▸ Official | none | auto-detected fields bound to patient/practitioner → fill/sign → PDF via pdf-lib or DOCX | CDN pdf-lib | — | file saved via `window.claude.use("downloads")` or `<a download>` |
| J-DC-05 | Multi-person signing | Review ▸ Signatures | none (identity = checkbox, Sim.) | set up signers/order → sign (draw/type, consent) → content frozen (SHA-256) → certificate page | `sig` in the document | decline with reason; reset unlocks | certificate on export |
| J-DC-06 | Quality check before sharing | status badge | none | issues → Go/Fix/Fix all safe/Ignore | — | — | — |
| J-DC-07 | Print / Save as PDF | Ctrl+P → print centre | none | range/layout/theme → print or vector PDF | — | **File ▸ Print opens export dialog instead (D5)** | — |
| J-DC-08 | Find and replace | Ctrl+F/H | none | replace all → Undo toast | — | — | — |
| J-DC-09 | Entities from an API | Document tab ▸ Entities | none | URL + token → test → search (8 s timeout) → fill | **real `fetch`**, token in localStorage | errors shown | — |
| J-DC-10 | Open "as is" and save back to Word | Import mode "Open as is" | none | edit paragraphs → save DOCX (only edited paragraphs rewritten) | IndexedDB `remotion-docs-live` | — | DOCX |
| J-CA-01…10 | Calculator: quick calculation, standard with memory/tape, scientific with variables, generic tool (e.g. loan + CSV), unit conversion, expression worksheet, custom formula, health utility (acknowledgement-gated), backup/restore JSON, manual currency rate | Calculator | none | see inv. 05 §5 | `remotion-calc`; exports `remotion-calculatrice.json`, `remotion-calculs.*` | 84 localised error keys; health tool behind acknowledgement | results + history |
| J-BI-01 | Appointment → draft → issue → payment | Billing ▸ To bill | Sim. role (`inv.draft`, `inv.issue`, `pay.record`) | prepare draft → 7-step editor → issue (gap-free number, snapshot) → record payment (allocations, idempotency) | `remotion-billing` | blocking checks; chronology error; duplicate payment confirm | paid/partial state |
| J-BI-02 | Correct an issued invoice | row menu | `inv.credit` | reason → credit note + new draft | — | — | editor |
| J-BI-03 | Quote lifecycle | Quotes | `qt.edit` | draft → sent → accepted/refused → converted | — | expiry derived | invoice draft |
| J-BI-04 | Bank reconciliation | Recon | `pay.recon` | CSV import → suggestions (±6 days) → match / discrepancy | — | no unmatch | matched |
| J-BI-05 | Refund after credit note | drawer | `pay.refund` | refund ≤ credit → pending → done/failed | — | — | — |
| J-HR-01 | Add employee (8-step wizard) | Employees | `add` | validate each step → create `EMP-####` → row flash | `remotion-hr` | duplicates, required fields, manager loops | new row |
| J-HR-02 | Import employees CSV/XLSX | Employees | `import` | upload → mapping → validation → preview → chunked import → report CSV | — | invalid rows never imported; **later managers not found (defect)** | report |
| J-HR-03 | Leave request → approval | Profile ▸ Time / Requests | **request not permission-gated (defect)**; approve `leave.approve` | pending → approved/refused (reason) | affects Calendrier availability | overlap rejected; managers cannot decide their own request | — |
| J-HR-04 | Departure → archive | row menu / bulk | `deactivate`, `archive` | left (`leftOn`) → archived | — | — | never deleted |
| J-PA-01 | Register a patient (8 steps) | Patients ▸ New | `pat.create` (reception, medlead, admin) | live duplicate panel → … → create `PAT-000NNN` | `remotion-patients`; bus `patient.registered`; OS notification | duplicates require "I checked"; file >600 KB toast | record opens |
| J-PA-02 | Clinician documents a session | Record ▸ Encounters | care team + `clin.sign`; break-glass if not in team (Sim.) | draft → sign → addendum | bus `clinical.noteSigned` | empty note error; signed note immutable | signed |
| J-PA-03 | Merge duplicates | Data quality ▸ Duplicates | `dq.*` | compare → choose survivor + fields → justification + type MRN → merge with snapshot | bus `patient.merged` | "Different people" path | merged |
| J-CL-01 | Book an appointment (9 steps) | Calendrier ▸ New | `cal.*` | patient → service → practitioner → place → slot (availability engine) → recurrence → notifications → checks → confirm | `remotion-calendar`; bus `appointment.booked/confirmed`; outbox (Sim. delivery) | stale/conflict → back to slot with alternatives | booked |
| J-CL-02 | Drag reschedule (15-min snap) | agenda | `cal.*` | drag → revalidate → move; undoable | bus `appointment.rescheduled` | failure dialog with alternatives | moved |
| J-CL-03 | Public online booking (preview) | Online booking | public link token (client-side, Sim.) | service → slot → contact → consent → request | `requested` appointment | honeypot; 3/h rate limit in memory | staff confirm |
| J-CL-04 | External calendar ICS | Sync | `sync.manage` | import .ics (UID-idempotent) / export busy-only (full needs confirm) | — | — | — |
| J-CB-01 | Day-of-visit flow | Cabinet ▸ Reception | `checkin`, `visit.status` | check in (identity box) → waiting → call → start → complete | Calendar status via borrowed role (`cbAsCal`); bus → Billing intake | no-show too early; not your patient; stale version | visit done |
| J-CB-02 | Room out of service | Rooms | `res.*` | issue → `resource.unavailable` → Calendar maintenance block + reschedule task → resolve | bus | — | — |
| J-PL-01 | Cancellation frees a slot for the waiting list | Planning / Calendrier | `cal.*` | cancel → `plOnFreed` offers to best waiting entry → book / declined | bus, OS notification | — | — |
| J-PL-02 | Smart booking | Planning ▸ New | `cal.*` | patient → type → ranked suggestions (`plSuggest`) → book → toast with Undo | **Undo cancels and triggers a waiting-list offer (defect)** | — | booked |

## 3. Cross-app journeys (highest migration risk)

These depend on globals and shared storage between apps. They break if apps are migrated in the wrong order or isolated without an adapter.

| ID | Flow | Coupling mechanism (FACT) | Preservation requirement |
|---|---|---|---|
| X-01 | Calendrier appointment **completed / no-show → Billing "To bill"** | bus consumer `billing` writes `BI.st.appts` (L26071–L26074); also skips → `billSkips` (never shown) | Billing intake must keep the same id rule (`cal-{appt}`) and idempotency |
| X-02 | Cabinet check-in / start / complete → **Calendrier status** | direct call under borrowed role `cbAsCal` (L26130) | Service API in the target; do not persist the borrowed role (defect D-H2) |
| X-03 | Cabinet room issue → **Calendrier maintenance block** | bus `resource.unavailable/available` | same event contract |
| X-04 | Calendrier cancellation → **Planning waiting-list offer** | bus consumer `planning` | same |
| X-05 | **HR approved leave → Calendrier availability** | `hrSt()` read (L25494) | HR read API before Calendrier is migrated |
| X-06 | HR establishments/employees → **practitioner names, establishments** across Patients/Calendrier/Cabinet | `rmHrEmp`, `rmEsts` (L24510, L24519) | shared registry service |
| X-07 | **Forms list → Billing** (forms adapter) and **Patients** (clinical forms, open in editor) | `feS`, `feLoad`, `feOpenForm` globals | forms read service |
| X-08 | Patients balance card → **Billing** | `biSt`, `biBal`, `biOverdue` | billing read service |
| X-09 | Any app → **OS notification centre** | `pushNc`, `rmNotify` | notifications API in the shell |
| X-10 | Any app download → **Documents `dcSaveFile`** (and `window.claude.use("downloads")`) | global call | shared download service |
| X-11 | Desktop / launcher / Files / terminal → **open any app** | `dkOpenX` chain | manifest-based `openApp` |
| X-12 | Every app ↔ **language switch** | `osRelabel` wrappers | i18n context |
| X-13 | Pop-out window ↔ main window data | `storage` events on each store key | same keys (doc 06) or BroadcastChannel |
| X-14 | Quick Look → **Remotion AI** with attachment | `openAI` + attachment | AI panel API |

## 4. Feature-parity baseline

Every feature in the inventories becomes a row in doc 12 with status **ASSESSED**. **PLANNED** is added once a backlog task (doc 11) is assigned. No row may reach **VERIFIED** without evidence from functional and visual checks (doc 13).

| Area | Features (rows in doc 12) | Rows with simulated parts (keep as simulated) | Rows linked to recorded defects |
|---|---|---|---|
| A Shell core | 24 | 7 | 5 |
| B AI / desktop / OS / WM | 22 | 4 | 4 |
| C Forms | 16 | 4 | 3 |
| D Documents | 20 | 2 | 2 |
| E Calculator | 10 | 0 | 4 |
| F Billing | 14 | 1 | 3 |
| G HR | 10 | 1 | 2 |
| H Healthcare | 26 | 3 | 6 |
| Cross-app | 14 (X-01…X-14) | 0 | 1 |
| **Total** | **156 parity rows** | **22** | **30** |

Defects stay recorded as current behaviour. The defect register (158 items, doc 12 §3) is tracked separately from the parity rows. Each defect needs a decision: *reproduce* or *fix as an approved deviation* (doc 09, Q-03).
