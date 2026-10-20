# 03 · Component and interaction inventory

Status: **complete at area level.** Per-control tables with line evidence are in `evidence/inventories/0X-*.md §3–§4`, which together list more than 1,000 rows. This document consolidates them, identifies the **cross-app reusable components** the target must provide once, and lists every interaction that is **not** fully functional. Those interactions must not be silently "upgraded" or dropped.

Classification (brief §4.3): **F** Functional and verified (read end to end) · **PNV** Present, not verified · **Pa** Partial · **B** Broken · **D** Decorative / static · **S** Simulated (sample data or fake backend; a category added because the source has no backend) · **M** Missing relative to documented requirements.

---

## 1. Cross-app reusable components (present in the source; the target should build each one once)

| # | Component | Source implementation(s) | Consumers | Variants / behaviour to preserve | A11y requirements (from source) |
|---|---|---|---|---|---|
| C1 | **OS window** | `osWinOpen` L11811 + v55 decorate L20889 + v56 solo | 12 window apps | genie open from launcher (520 ms) and minimise to dock (420 ms); 8-edge resize; snap halves/quarters with preview; per-desktop/workspace ownership; "show on all desktops"; maximise; app mode; full screen; pop-out | `role=dialog` + `aria-label`; Win+arrows |
| C2 | **Lightweight desktop window** | `dkWin` L11462 | folder, Quick Look, trash | draggable header, Esc closes | dialog |
| C3 | **Multi-level menu** | `osMenu` L11682–L11731 | desktop, Files, launcher, window menu, all apps' context menus | submenus (hover 110 ms), checks, kbd hints, danger, disabled, RTL placement | `role=menu`, `menuitemcheckbox`, arrows / ← → / Esc per level |
| C4 | **Sliding multi-view menu** | `showView` L8452 | keyboard, system and account menus | animated view stack, back header | menu roles, arrow navigation |
| C5 | **Toast / undo toast** | `toast` L7597, `toastUndo` L10067; app-local `feToast`, `dcToast`, `biToast`, `hr-toast` | all | 1.6 s plain, 4.5 s with Undo | `role=status` |
| C6 | **Dialog** | `feModal` L14004, `dcModal` L15228, `biDialog`, `hrDialog`, `paDialog` L24900, `clDialog` L25720, `cbDialog` L26282, `plDialog` L26878, prompt/confirm in Calculator | every app (≈7 implementations) | error area + shake, Esc; healthcare variants re-read stores before OK | **gap: most have no focus trap or focus return** (inv. 01 §10, 03 §13 #23, 06 #26) |
| C7 | **Drawer / side sheet** | `.hr-drw` kit, `.dc-drawer`, Billing drawers, Forms submission drawer | Billing, HR, healthcare, Documents, Forms | slide-in, scrim | gap: no focus trap |
| C8 | **Data table** | `biTable` (sort, paginate, configurable columns, CSV), HR table (density, grouping, column chooser), healthcare tables | Billing, HR, Patients, Calendrier, Cabinet, Planning | saved views, bulk selection, sum row | grid roles incomplete |
| C9 | **App shell for business apps (`hr-*` kit)** | CSS L5849–L6057; helpers `hrE` (escape), `hri` (icons), `hrRM`, `hrNf`, `hrCount` | HR, Patients, Calendrier, Cabinet, Planning | nav groups with badges and sliding ink, breadcrumb, role switcher, KPI cards, filter bar, chips, banners, empty/denied/error states, `data-sz` s/m/l container sizing | — |
| C10 | **Wizard / stepper** | registration (5), HR add (8), patient registration (8), booking (9), Forms guided wizard (4), Billing editor (7 sections), smart booking (5) | 7 places | forward-only until valid; revisit done steps | `aria-current="step"` |
| C11 | **Command palette** | L8800–L8872 | shell | grows from the search bar (clip-path); groups; accent-insensitive | dialog + listbox (gap: no `aria-activedescendant`) |
| C12 | **Notification centre and banners** | L9926–L10197; `pushNc` API used by apps | shell, healthcare (`rmNotify`) | priority/category filters, snooze, DND, quiet hours, chime | live regions |
| C13 | **Icon sets** | 18 shell icon maps + app maps (`AIX`, `OIC`, `FEI`, Documents, `hri`/`HRI`, Calculator 40 icons) | all | inline SVG strings (Lucide-like strokes) | `aria-hidden` |
| C14 | **App glyph / launcher tile** | `DK_APPS` + `dkGlyph` L11244/L11755 | dock, launcher, desktop, window title | gradient tile + white SVG | — |
| C15 | **Charts (SVG)** | Billing `biChart` (L23411), Documents 20+ chart kinds, Forms bars, HR bars, Calculator graph | several | drawn to container width; palettes | text alternatives partial |
| C16 | **Signature pad (canvas)** | Forms L13533, Documents v49 | 2 | PNG data URL | — |
| C17 | **Rich text / contentEditable** | Documents (`execCommand`), Forms inline edit (`plaintext-only`) | 2 | merge-field chips, paste whitelist | — |
| C18 | **Empty / denied / error state** | `biEmpty`, `paEmpty`, `hr-state`, `hrErrorState`, Forms/Documents empties | all business apps | lock icon for denied, retry for error | — |
| C19 | **Segmented control with sliding ink** | sign-in tabs, mode segments in Calendrier/Planning, HR profile tabs | many | animated pill | tablist/tab |
| C20 | **On-screen keyboard** | L8005–L8386 | system-wide text entry | 4 layouts + number pad, suggestions, long-press accents, float/dock | partial (`aria-pressed` only on Caps) |

## 2. Area-level component counts

| Area | Named builders / components | Notes |
|---|---|---|
| A Shell core | ≈150 functions; 18 icon maps | inv. 01 §3 |
| B AI / desktop / OS / WM | ≈150 functions in ≈45 groups | inv. 02 §3 |
| C Forms | ≈60 builders + ≈25 pure-logic functions; 80 field types in 9 library groups | inv. 03 §3 |
| D Documents | 90 block-library entries; ≈60 builders; 191 wrapper patches | inv. 04 §3 |
| E Calculator | 126 registry entries; field renderer; 13 custom page components | inv. 05 §3 |
| F Billing | ≈40 builders | inv. 06 §3.1 |
| G HR | ≈30 builders + the shared `hr-*` kit (≈120 classes) | inv. 06 §3.2–3.3 |
| H Healthcare suite | ≈85 builders | inv. 07 §3 |

## 3. Interaction totals

Inventories counted at different granularity: single controls (shell, OS, Forms, Calculator, healthcare) and control families (Documents, Billing, HR). Totals are therefore given per area and are not added into one figure.

| Area | Unit | F | S | Pa | D | B | PNV | Total |
|---|---|---|---|---|---|---|---|---|
| A Shell core | controls | ≈150 | ≈30 | 4 | ≈45 (incl. 23 "not in preview" shortcuts) | 0 | ≈25 (cross-area) | ≈254 |
| B AI / desktop / OS / WM | controls | ≈93 | ≈16 | 5 | 2 | **1** (`hrPeople` pop-out) | 1 | 120 |
| C Forms | controls | 142 | 14 | 10 | 11 | **3** | 2 | 182 |
| D Documents | families | 34 | 4 | 2 | 1 | **1** | 9 | 51 families (228 `data-*` actions) |
| E Calculator | controls | 74 | 0 | 3 | 1 | 0 | 1 | 81 (+80/80 tools executed) |
| F Billing | groups | 63 | 3 | 1 | 3 | 0 | 0 | 70 |
| G HR | groups | 34 | 1 | 0 | 1 | 0 | 0 | 36 |
| H Healthcare | controls | ≈248 | 13 | 6 | 6 | 0 | 0 | ≈273 |

## 4. Interactions that are NOT fully functional (preservation register)

These items need explicit handling in the plan. **Default rule: reproduce current behaviour, including simulated behaviour, and label it as simulated.** Never replace a simulated feature with a real integration, or remove it, without an approved deviation (doc 12, status `APPROVED_DEVIATION`).

### 4.1 Broken (B)
| ID | Interaction | Evidence | Plan |
|---|---|---|---|
| BR-01 | Pop-out / app mode for `hrPeople` | L21038 regex | Fixed naturally by manifest-validated routes (doc 10 ADR-03). This is defect D-B01, in the proposed fix set (doc 09 §4) |
| BR-02 | Forms JSON import breaks rule/score/chart references | L14096 | Reproduce, or fix with approval (defect, not intended) |
| BR-03 | Forms: opening a submission whose form was deleted fabricates a blank form | L14135 | same |
| BR-04 | Forms: page-rule conditions on page index ≥9 cannot be removed | L14285 | same |
| BR-05 | Documents: formula reference to an unknown table throws `ReferenceError` (undefined `S`) | L15579 | same |

### 4.2 Simulated (S): must stay visibly simulated until real services are approved
| Group | Examples | Evidence |
|---|---|---|
| Authentication | any password ≥4 chars, PIN 1234, any 6-digit OTP, SSO/passkey/gov ID as timers, switch user without credentials | inv. 01 §4.7–4.9 |
| Roles / permissions | role switchers in Billing, HR, Patients, Calendrier, Cabinet, Planning; break-glass self-service | inv. 06 §11.6, 07 §11.5 |
| Org directory, verification channels, account creation | registration steps 3–5 | inv. 01 §4.9 |
| App install / uninstall | launcher 1.3 s progress | inv. 02 #93 |
| Share links, downloads, "Open with" | `https://remotion.io/s/<id>`, `forms.remotion.health`, `docs.remotion.health`, `reservation.exemple.invalid` | inv. 02, 03, 04, 07 |
| AI scripted demos | "prep" and "form" demos with sample data | inv. 02 #22–24 |
| Forms publish / share tokens / automations / KPIs / analytics | hard-coded numbers; nothing executes | inv. 03 §13 #12–13 |
| Documents collaboration (avatars, invites, comments local only), rule-based "assistant", in-person e-signature | inv. 04 §11.5, D15 |
| Calendrier notification delivery (`sim:true`, "simulate provider failure"), external calendar sync cards ("Not connected"), public booking preview | inv. 07 §11.6 |
| Weather, forecast, Today events, reminders on 3 fixed events | inv. 01 §13 #2, #4, #26 |
| Restart / shut down (in-page power screen) | inv. 01 §4.12 |
| Unregistered dock/rail apps (telehealth, Keep Flow, connections, meetings, analytics, commerce, browser, pages, mail, photos, media, boards, maps, messages, accounting) | toast "Opened X" | inv. 02 §1.4.3 |

### 4.3 Partial (Pa)
Calendar widget "previous year" goes back one month; tray "volume" toggles only the key-click sound; on-screen keyboard Ctrl+V; AI conversation `cmp` cannot be deleted; AI share toasts even on failure; AI card checkboxes not persisted; desktop Cut destroys unpasted items; Forms export JSON/CSV copy to clipboard instead of downloading; Forms `file` field stores only the name; Forms repeat toggle doesn't refresh the properties panel; Calculator FR comma-to-dot breaks `max(1,2)`; Billing comparison export; Planning booking "Undo" cancels instead of voiding. (Evidence: inventories §13.)

### 4.4 Decorative (D)
Widget "⋯" buttons, task checkboxes, calendar day buttons, workspace settings gear, Help, "Settings (app)", 23 shortcut rows that toast "not in preview", Billing integration cards (7), HR placeholder modules (14, honestly labelled), Files storage meter, Calculator dead state.

### 4.5 Missing relative to documented requirements (M)
The brief documents no functional requirements beyond the source itself, so **0 M items are established** (FACT). The user's earlier stated wishes (for example "Free Document" mode, Forms 1/2…1/5 widths) are tracked in doc 09 as UNKNOWN, to confirm. They are not migration scope.

## 5. Interaction mechanics the target must reproduce

| Mechanic | Where | Notes for target |
|---|---|---|
| Global keyboard shortcuts with layered priority (overlay > dialog > menu > app > OS) | 56-row catalogue (49 unique combos), per-app capture handlers (Forms L13544, Documents ≈70 listeners, Calculator 18) | One shortcut service with scopes. Fix the AltGr swallowing risk (inv. 01 §13 #9) only with approval |
| Custom user shortcuts (recorded, persisted) | `remotion-custom-sc` | keep the format |
| Pointer drag & drop | desktop icons (grid snap, rubber band), ghost drags dock/rail/launcher/Files → desktop/folder/trash, window move/resize/snap, Forms fields/sections, Documents blocks/pages/table columns, Calendrier/Planning appointments (15-min snap, conflicts), Cabinet kanban (HTML5 DnD), desktop-overview minis (HTML5 DnD) | Keep the pointer-event model; add keyboard alternatives only as an enhancement |
| Context menus | desktop, items, Files, launcher, window title, dock/rail, every app | shared C3 |
| Gestures | two-finger horizontal swipe switches desktops (RTL-aware); drag desktops panel down to close | keep |
| Timers | clock 10 s, reminders 30 s, auto-away 5 min, lock glance 25 s, Cabinet 15 s, Planning/Calendrier 30 s, display 5 s, autosaves (250–500 ms debounce) | keep intervals |
| Cross-window sync | `storage` events per key; healthcare bus | keep in Phase C (doc 10 ADR-07) |
| Undo | toast undo (shell, OS, Billing, HR), editor undo stacks (Forms 80, Documents 100 snapshots) | keep limits |
