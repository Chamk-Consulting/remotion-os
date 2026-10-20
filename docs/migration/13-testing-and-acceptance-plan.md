# 13 · Testing and acceptance plan

Status: Phase 2 plan. The tooling proposals assume scenario B. **[A]** Reuse the target's frameworks once they are known.

Principle: **the legacy file is the oracle.** Every test that can run against the source is run against both the source and the target, and the results are compared. The source is never modified. Tests load `source/Remotion_Desktop.html`, checksum `5a452785…ccedd`.

---

## 1. Test layers

| Layer | Tool | What it proves | Oracle | Gate |
|---|---|---|---|---|
| L1 Golden domain tests | Vitest + Node VM harness (ADR-12) | The ported pure functions return exactly what the source functions return | Source functions executed in a VM on fixtures | 100% equality (numeric tolerance only where the source itself is non-deterministic) |
| L2 Unit tests | Vitest | Stores, persistence adapters, registry, shortcut service, i18n | Spec | green |
| L3 Storage contract tests | Vitest | Round-trip of every one of the 40 keys + IndexedDB with recorded source fixtures; no key renamed; shapes unchanged | Fixtures captured from the running source | byte-stable JSON |
| L4 E2E journeys | Playwright | Each journey in doc 04 (J-OS, J-AI, J-FE, J-DC, J-CA, J-BI, J-HR, J-PA, J-CL, J-CB, J-PL, X-01…X-14) passes on the target **and on the source** with the same page objects | Source run | green on both |
| L5 Visual regression | Playwright screenshots | Every screen/state in doc 02 at the viewports below matches the baseline | Baseline A-03 | diff ≤ threshold (§4) |
| L6 Accessibility | axe-core + keyboard scripts | No new violations vs source; approved fixes verified | Source axe report | ≤ source count per rule |
| L7 Cross-window | Playwright multi-page | Pop-out ↔ main window sync; legacy bridge ↔ migrated app sync; bus cross-tab | Source run | green |
| L8 File output | Node diff tools | Exports (PDF/DOCX/ODT/RTF/HTML/EPUB/PPTX/XLSX/ODS/JSONL/MD/CSV/ICS) structurally equal to the source outputs for the fixture corpus | Source exports | structural equality |
| L9 Performance | Lighthouse CI / Playwright tracing | Budgets in §7 | — | budgets met |
| L10 Security | checklist + automated scans | §6 | — | all pass |

## 2. Fixture corpus (to build in Phase A)

| Fixture | Contents | Used by |
|---|---|---|
| F-STORE-SEED | localStorage + IndexedDB dump after a clean boot and after opening every app once (seeded demo data) | L3, L4 |
| F-STORE-USED | dump after scripted journeys (desktops, forms, documents, invoices, patients, appointments…) | L3, L4, data continuity (doc 14) |
| F-STORE-LARGE | near-quota stores (documents with images) | quota behaviour (D-H01, D-D02) |
| F-DOCS | ≥3 real files per import extension (25) incl. official VPH PDFs and Word forms | L8, J-DC-03 |
| F-CALC | defaults for 126 entries + curated edge cases (calc harness in `evidence/calc-harness/` (from the audit)) | L1 |
| F-TZ | DST transitions Europe/Paris, Africa/Tunis, America/New_York | L1 Calendrier, Calculator |
| F-MONEY | invoices across tax sets (FR, TN), currencies with 2 and 3 decimals | L1 Billing |
| F-CSV | HR/Billing/Patients CSV and XLSX imports incl. malformed rows | L1, L4 |

## 3. Functional verification per route and workflow (brief §7.4)

For `/` and each `/apps/[appKey]` (11), plus every journey:
1. Direct navigation and refresh (including the `#app=` redirect).
2. Every control in the inventories' interaction tables: the class must match (F stays F, S stays S, …).
3. Success, empty, loading, failure and permission-denied states (doc 02 §4).
4. Simulated role switching shows and hides exactly what the source shows and hides (per app permission matrices).
5. Console clean; no failed requests except deliberately offline integrations.
6. Real integrations in safe environments: entities API against a mock server; `window.claude` both present (mock) and absent.

## 4. Visual verification

| Dimension | Values |
|---|---|
| Viewports | 390×844, 768×1024, 1024×768, 1440×900, 1920×1080 |
| Window sizes for business apps | s (<760), m (<1180), l, so that `data-sz` parity is checked inside windows |
| Themes | light, dark (via `remotion-theme` and via the `prefers-color-scheme` emulation) |
| Direction | LTR (en, fr, de) and RTL (ar) |
| States | default, hover, focus-visible, open menus/dialogs/drawers, error, empty, loading/skeleton |
| Motion | `prefers-reduced-motion: reduce` for deterministic captures; separate video spot-checks for signature motions (genie, spaces slide, theme reveal, language stagger) |
| Threshold | ≤0.1% differing pixels per screenshot (anti-aliasing tolerance 0.1). Glass/blur areas are masked or given ≤0.5%, documented per mask |
| Prerequisite | **T-VIS-00:** recapture the baseline with real fonts (the audit baseline used fallback fonts) |

Visual parity is never declared from code inspection (brief §7.3).

## 5. Accessibility and responsive checks

- axe-core on every screen state captured in §4. Keyboard-only runs of the shell (menus, desktops, palette, shortcuts, windows Win+arrows), Forms editor, Documents editor, calendar grids.
- Focus traps: reproduce the source behaviour unless the approved fix set includes them (Q-03).
- RTL: mirrored layout and arrow-key semantics (desktops, menus, swipe direction).

## 6. Security checklist

| # | Check |
|---|---|
| S-1 | No secrets in the repository or bundle; `NEXT_PUBLIC_*` audit |
| S-2 | No new localStorage/IndexedDB keys beyond the 40 + 1 inventoried |
| S-3 | No network requests other than: fonts (self-hosted), entities API (user-configured), optional host adapters |
| S-4 | No `dangerouslySetInnerHTML` except sanitised imported document HTML (the same sanitiser as `dcClean`) and markdown output (same rules as `aiMd`) |
| S-5 | CSP defined (doc 14 §4) and verified with no violations in E2E |
| S-6 | Third-party libraries pinned (pdf.js 3.11.174, mammoth 1.6.0, pdf-lib 1.17.1) with lockfile integrity |
| S-7 | Dependency audit: no high/critical advisories |
| S-8 | PHI never logged (console, telemetry); a test greps captured console output for seeded patient names |
| S-9 | Approved security-relevant fixes verified (D-A22, D-E13, D-H02, D-H03) |

## 7. Performance budgets (proposed, U-10)

| Metric | Budget | Source reference |
|---|---|---|
| Initial JS for `/` (gzip) | ≤ 600 KB (shell + kernel; apps lazy) | Source: 5.7 MB uncompressed script parsed at load |
| LCP (desktop, cold cache, fast 4G) | ≤ 2.5 s | — |
| INP | ≤ 200 ms | — |
| App open (window visible) | ≤ 300 ms after the chunk loads | Source genie 520 ms animation |
| Memory after opening all apps | ≤ source + 10% | measured |

## 8. Acceptance criteria (release gates, brief §6.5)

| Gate | Measurable criterion | Evidence |
|---|---|---|
| G-1 Routes accounted | `/` + 11 `/apps/*` + `#app=` redirect: 100% pass L4 navigation/refresh | Playwright report |
| G-2 Workflows | 100% of the journeys in doc 04 (21 OS/AI, 50+ app, 14 cross-app) pass on the target | Playwright report |
| G-3 No silent mock replacement | Every S row in doc 12 still S, or APPROVED_DEVIATION | doc 12 |
| G-4 No disappeared features | 156/156 parity rows VERIFIED or APPROVED_DEVIATION | doc 12 |
| G-5 Auth boundaries | Per-role visibility tests (Billing 5, HR 4, Patients/Calendrier/Cabinet/Planning roles) identical to the source | L4 |
| G-6 Visual | 0 unexplained diffs above threshold | L5 report |
| G-7 Responsive | §4 matrix complete | L5 |
| G-8 Tooling | `tsc`, lint, unit, golden, e2e and `next build` green; no disabled rules, no `@ts-ignore` added to pass | CI |
| G-9 Production config | doc 14 checklist complete | doc 14 |
| G-10 Rollback | Rollback rehearsed in under 15 minutes | doc 14 |
| G-11 Deviations | Every deviation documented and approved | doc 12, doc 17 |

Automated vs manual checks will be reported separately in doc 16 (brief §8).
