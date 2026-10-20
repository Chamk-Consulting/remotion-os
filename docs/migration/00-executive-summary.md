# 00 · Executive summary: ReMotion HTML → Next.js migration

**Phases covered:** Phase 1 (audit) and Phase 2 (plan). **No application code was written or changed** (brief §10).
**Date:** 2026-10-14 · **Source:** `source/Remotion_Desktop.html` (SHA-256 `5a452785…ccedd`) · **Target:** *not provided* (blocker B-01).

**Independent check:** a separate reviewer verified 42 claims against the source (35 confirmed, 4 partly, 1 wrong, 2 unverifiable). All corrections are applied in this version; none changed a finding or decision.

**Audit completeness:**
- Source: complete. Every line range was read by one of seven area audits. The file was rendered in a browser 15 times with 0 JS errors, and the 80 generic calculator tools were executed.
- Target: **incomplete**, because the target repository is unavailable. Docs 07 and 10–14 are conditional on it.

---

## 1. What the source actually is

The file is not a mockup. It is a **complete single-file web OS**: 6.5 MB, 27,218 lines (6,852 CSS, 321 markup, 20,039 JS). It contains:
- an OS shell with a real window manager (snap, virtual desktops, workspaces, app mode, pop-out windows),
- **12 window apps**: Launcher, Files, Terminal, Forms & Surveys, Documents, Calculator, Billing, HR & Payroll, Patients, Calendrier, Cabinet, Planning,
- a **Remotion AI** assistant,
- a healthcare event bus.

All data lives in the browser: **40 localStorage keys + 1 IndexedDB**. **There is no backend.** Authentication and permissions are **simulated** in the UI.

| Measure | Value |
|---|---|
| Top-level screens / secondary surfaces | ≈343 / ≈300 (doc 02) |
| Interactions inventoried | > 1,000 controls and families (doc 03) |
| Parity rows (features) | 156 (doc 12) |
| Recorded defects (current behaviour) | 158 (doc 12 §3) |
| Languages | en, fr, de, ar (RTL) |
| External dependencies | Google Fonts; pdf.js 3.11.174, mammoth 1.6.0, pdf-lib 1.17.1 from cdnjs (no SRI); `window.claude` host APIs (AI and downloads); one optional user-configured REST API |

## 2. Key findings

1. **The domain logic is solid and portable.** Money and tax, numbering, formula engines, time zones/DST, availability, duplicate scoring and calculator numerics are largely pure functions. They can be ported to TypeScript **unchanged** and proven equal by golden tests that run the source itself.
2. **The UI layer is the hard part.** It uses string-template rendering (568 `innerHTML`/`outerHTML`/`insertAdjacentHTML` occurrences), 195 document-level listeners and **≈252 monkey-patch wrappers** (191 in Documents alone). Behaviour is defined by the *last* wrapper in script order. This is the main regression risk (R-03).
3. **There is no app registry.** Each app plugs in through 9 global tables, 2 hand-maintained key chains and 3 wrapped functions. A typed `AppManifest` replaces all of them (ADR-03) and fixes 3 defects for free.
4. **Apps are coupled through globals and shared storage.** Examples: Calendrier writes into Billing, Calendrier reads HR leave, Cabinet and Planning act through Calendrier under a borrowed role, and every healthcare app reuses the HR UI kit. The migration order must follow these dependencies (doc 04 §3).
5. **Health data sits unencrypted in localStorage** across 6+ stores, including AI conversation logs and an API token. The migration must not make this worse. Fixing it is a separate, approval-gated workstream.
6. **Verified defect:** `#app=hrPeople` (the HR pop-out) opens the whole desktop instead of HR, because a regex ignores capital letters.

## 3. Recommended approach (doc 10)

**Incremental strangler with a legacy bridge.**
1. Build the OS shell and kernel in React first, keeping visuals pixel-identical: the CSS is ported **verbatim** in cascade layers, with the same class names.
2. Then migrate apps one by one: Calculator → Forms → Documents → HR → Billing → Patients → Calendrier → Cabinet → Planning → AI.
3. Until an app is migrated, it opens in an OS window that hosts the original file in its own app mode (same origin). Because the **storage keys stay identical**, data is shared live between old and new apps.
4. Defects are reproduced by default. Only a short list is fixed, where the new architecture removes the bug for free or the source's own privacy rules are violated (doc 09 §4).

Backlog: **63 tasks in 6 phases, ≈61–87 engineer-weeks (±35%)** (doc 11).

## 4. Critical blockers and decisions

| ID | Item | Needed from |
|---|---|---|
| **B-01** | Target Next.js repository: send owner/repo or a .zip, or confirm a new app | User |
| **B-02 / Q-01** | Design authority: this HTML's visuals (as the brief says) or the existing Web OS design system (as stated earlier)? | User |
| **B-03 / Q-03** | Defect policy: reproduce by default + 8 approved fixes (recommended) | User |
| Q-04 / Q-05 / Q-06 | Real auth, live AI outside the Claude host, health-data persistence: all **out of scope** by default | User |
| Q-07 | Current hosting origin (data continuity) | User |

## 5. Implementation sequence and acceptance

| Phase | Content | Exit criterion |
|---|---|---|
| A Foundation | scaffold, CSS layers, fonts, i18n, motion, storage contracts, golden harness, **baseline with real fonts** | harnesses green; baseline captured |
| B Shell and kernel | registry, window manager, desktops, menus, overlays, notifications, palette, keyboard, Launcher/Files/Terminal, legacy bridge, shared kit, bus | shell parity rows VERIFIED |
| C Apps | 9 apps + AI, in dependency order; bridge removed | 156/156 rows VERIFIED or APPROVED_DEVIATION |
| D Integrations | host adapters, bundled libraries, entities API, file formats, cross-window sync | integration tests green |
| E Parity and hardening | visual, responsive, RTL, accessibility, performance, security, defect reconciliation | gates G-1…G-11 (doc 13 §8) |
| F Release | config, artifacts, staging smoke, rollback rehearsal | rollback < 15 min |

## 6. Document map

| # | Document |
|---|---|
| 01 | Repository and architecture audit |
| 02 | Route and screen inventory |
| 03 | Component and interaction inventory |
| 04 | User journeys and feature parity |
| 05 | Design system and visual parity |
| 06 | State, data and integrations |
| 07 | Target Next.js assessment (**incomplete, B-01**) |
| 08 | Compatibility and risk register (20 compatibility topics, 27 risks) |
| 09 | Gaps, unknowns, blockers, decisions |
| 10 | Migration architecture and decisions (14 ADRs) |
| 11 | Task backlog and dependencies (63 tasks) |
| 12 | Feature parity matrix (156 rows) + defect register (158) |
| 13 | Testing and acceptance plan |
| 14 | Deployment and rollback plan |
| evidence/ | 7 area inventories (≈4,700 lines with line-level citations), JS/CSS outlines, baseline screenshots + log, screenshot script, calculator harness |

Docs 15–17 (implementation progress, verification report, final acceptance) are created in Phase 3, after approval.

**Approval requested:** answers to B-01, Q-01 and Q-03 (and Q-07 if known). Phase 3 starts only after that.
