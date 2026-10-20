# 09 · Gaps, unknowns, blockers and decisions needed

Status: complete as of this audit. Every item has an owner: **User** (product owner) or **Eng** (migration team).

---

## 1. Blockers (must be resolved before Phase 3 implementation)

| ID | Blocker | Why it blocks | Needed from | Unblocks |
|---|---|---|---|---|
| **B-01** | Target Next.js repository not provided (no GitHub link, no archive) | The brief requires the existing target to be the destination and its conventions to be reused; docs 07 and 10–14 are conditional | User: owner/repo (with access) or .zip, **or** confirmation that a new app is intended | doc 07 FACT pass; ADR finalisation |
| **B-02** | Q-01 design authority decision | Determines whether source tokens/CSS or the target design system wins; affects every UI task | User | Phase B |
| **B-03** | Q-03 defect policy | 158 recorded defects; the brief forbids silently redefining defects or changing behaviour without approval | User (can accept the default proposal below) | parity criteria |

## 2. Decisions needed (questions)

| ID | Question | Options | Recommendation (REC) |
|---|---|---|---|
| **Q-01** | Which visual identity is authoritative: this HTML (brief: "preserve brand identity…") or the existing Web OS design system (user's earlier statement)? | (a) Source visuals exactly · (b) Target design system, keeping source layouts · (c) Source visuals now, converge later | **(a) for this migration** (it is what the brief specifies), with (c) as the follow-up |
| **Q-02** | If the target already contains Documents/REDaction or Forms, which implementation survives? | source · target · merge | Decide per app after B-01. Default: source (brief) |
| **Q-03** | Defect policy | (a) reproduce all · (b) fix all · (c) **reproduce by default; fix only the listed "fix-in-migration" set as approved deviations** | **(c)**. Proposed fix set (§4) is limited to defects that the new architecture removes for free, or that break the source's own rules |
| **Q-04** | Authentication | keep simulated lock/sign-in/registration (parity) · integrate real auth | Keep simulated for parity; real auth is a separate project |
| **Q-05** | Live AI outside the Claude host (`window.claude.use("sample")`) | (a) keep source fallback ("live answers not available") · (b) server route to an LLM API (new backend, needs keys, data-processing review since prompts can contain PHI) | (a) for parity; (b) only with a privacy review |
| **Q-06** | Health-data persistence | keep localStorage (parity) · encrypt at rest in browser · server persistence (HDS-certified hosting in France) | Keep for the frontend migration; open a security workstream before any production use with real patients |
| **Q-07** | Deployment origin | same origin as today's file (keeps users' data) · new origin (start clean / export-import) | UNKNOWN today: where is the HTML currently hosted? |
| **Q-08** | Legacy bridge during transition (unmigrated apps open the legacy file in an iframe window with `#app=`) | allow · big-bang only | Allow (reduces risk, enables per-app releases) |
| **Q-09** | Deep links into app pages (`/apps/billing/invoices/123`) | not in source → deviation | Defer until after parity |
| **Q-10** | Browser support matrix | — | Latest 2 versions of Chrome/Edge, Firefox, Safari; iPadOS Safari; Android Chrome |
| **Q-11** | Hosting the 4 official VPH PDFs and 3 Word forms as static files (moved out of JS, same bytes) | allow | Allow (no behaviour change) |
| **Q-12** | Public booking page and waiting-room display as real public routes | not in source | Out of scope (post-parity) |

## 3. Unknowns

| ID | Unknown | Impact | How to resolve |
|---|---|---|---|
| U-01 | Everything about the target (doc 07 checklist T-01…T-18) | high | B-01 |
| U-02 | Where and how the source is hosted today (origin, users with real data?) | data continuity | ask the user |
| U-03 | Whether any real (non-demo) data exists in users' browsers | migrations, reseed risk | ask the user |
| U-04 | Fidelity of 25 import formats and 15 export formats (never tested with real files) | Documents parity baseline | build a fixture corpus; run the source to create baselines |
| U-05 | The user's statement "17 practice templates" vs 16 found in code (`RD.BUILTIN_TPL`) | parity row | confirm with the user |
| U-06 | Intended behaviour where code has dead conditions (e.g. `if(DC.vm!=="read"\|\|true)` L15061; Calendrier weekends `P.weekends?7:7` L25732; registration `rg.found` L9849) | which is "current behaviour" | treat the executed behaviour as current |
| U-07 | Whether the workspace menu being open at first load (≥860 px) is intended | first impression | ask; default reproduce |
| U-08 | Whether demo-only labels ("Demo data", "synthetic", "sample") must remain visible in the production build | product | ask; default keep |
| U-09 | Real font rendering baseline (fonts were blocked in the audit sandbox) | visual diffs | recapture with fonts (T-VIS-00) |
| U-10 | Expected performance budgets | acceptance | propose in doc 13 |
| U-11 | Earlier user wishes not present in this source ("Free Document" mode, Forms 1/2–1/5 widths per device, etc.) | scope creep risk | **not in scope** unless present in source; confirm |
| U-12 | Whether in-window "public" previews must later become real public pages | backend | post-parity |
| U-13 | Clinical validation status of the Calculator health tool (BMI/BSA/infusion) | regulatory | outside migration; flag |
| U-14 | Exact pixel behaviour under real GPU blur vs headless | visual threshold | set tolerance |

## 4. Proposed "fix-in-migration" set (for Q-03 option c)

Only defects that (1) the new architecture removes for free, or (2) violate the source's own documented rules or privacy model. All other defects are reproduced and listed as known issues.

| ID | Defect | Evidence | Why fix during migration |
|---|---|---|---|
| D-B01 | `#app=hrPeople` boots the desktop | L21038 | Manifest-validated route removes it for free |
| D-B05 | `OS_DOCK` missing for 4 apps (no running/min indicator) | inv. 02 #5 | Manifest gives every app a dock entry |
| D-B06 | Key chain fallback to the launcher | L11857 | Removed by the manifest |
| D-H03 | Planning shows patient names to roles without `appt.details` | L27001, L27027, L27067, L26763, L26876 | Violates the source's own permission model (privacy) |
| D-H02 | Borrowed role persisted to another store | L26130, L26775 | Service APIs remove the swap |
| D-A22 | Unescaped `a.email` in account header | L10306 | React escaping removes it for free |
| D-E13 | Calculator import renders unescaped fields | L21552, L22122, L22388 | React escaping removes it for free |
| D-D04 | Documents Ctrl+P captured even when another window is focused | L19576 | Scoped shortcut service removes it |

Everything else (for example the Billing VAT on partial credit notes, Calculator negative temperatures, silent save failures) is **reproduced** and listed in doc 17 as known limitations unless the user approves individual fixes.

## 5. Decisions recorded (2026-10-14 20:04 WAT, by the product owner)

| ID | Decision |
|---|---|
| B-01 | **Scenario B: new Next.js project.** The target is created in `remotion-os/`. Doc 07 scenario A no longer applies |
| Q-01 / B-02 | **Option (a): this HTML's visuals exactly.** Source CSS, tokens and class names are authoritative |
| Q-03 / B-03 | **Option (c): reproduce all defects except the 8-item fix set** in §4 (D-B01, D-B05, D-B06, D-H02, D-H03, D-A22, D-E13, D-D04) |
| Start | **Phase A, then Phase B (shell first)**, with the legacy bridge for unmigrated apps (Q-08 implicitly accepted) |
| Q-04 / Q-05 / Q-06 | Defaults stand: simulated auth kept; AI uses the host when present, otherwise the source's "unavailable" state; localStorage persistence kept |
| Q-07 | Still unknown (current hosting origin) |
