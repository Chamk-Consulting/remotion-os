# 14 · Deployment and rollback plan

Status: **Phase 2 plan.**

FACT: the source has **no deployment infrastructure.** It is one static HTML file with no server, environment variables, secrets, database, health check or monitoring. The target's deployment architecture is UNKNOWN (B-01). The commands below are therefore marked **UNVERIFIED** until they have been run against the actual target repository (brief §7.5). Nothing here authorises a production deployment, DNS change, secret rotation or infrastructure change.

---

## 1. Deployment options

| Option | When | Notes |
|---|---|---|
| **D1 Static export** (`output:"export"`) to any static host or CDN | Scenario B, no backend (matches the source) | `/apps/[appKey]` pre-rendered for the 11 keys via `generateStaticParams`; `#app=` redirect is client-side; no server runtime |
| D2 `next start` on Node / Docker | Scenario A if the target runs a server, or if Q-05/Q-06 later add server routes | Health route needed |
| D3 Vercel or the target's platform | **[A]** if the target already deploys there | Reuse the existing pipeline |

**REC:** D1 for the migration (no new infrastructure). Same-origin hosting with the current file is preferred for data continuity (Q-07).

## 2. Production configuration checklist

| # | Item | Requirement | Status |
|---|---|---|---|
| P-1 | Runtime | Node LTS for build; no server runtime for D1 | to verify |
| P-2 | Env vars | **None required** for parity. Optional, only if approved: `NEXT_PUBLIC_LEGACY_BRIDGE` (on/off during transition) | to verify |
| P-3 | Server vs public variables | No secrets exist; the entities API token stays user-entered (as in the source) | — |
| P-4 | Auth callbacks / cookies | n/a (simulated auth, Q-04) | — |
| P-5 | API origins / CORS | Entities API is user-configured; CORS is the API owner's responsibility (as in the source) | document |
| P-6 | CSP | see §4 | to verify |
| P-7 | Assets and cache headers | `/_next/static/*` immutable 1 year; `/official/*` (VPH PDFs/DOCX) 1 day + checksum filenames; `pdf.worker` immutable; HTML no-cache | to verify |
| P-8 | Deep links and refresh | `/`, `/apps/<11 keys>`, `/#app=<key>` → redirect; unknown key → not-found page | E2E (F-02) |
| P-9 | Health check | D1: synthetic check that `/` and `/apps/calcsci` return 200 and boot without console errors. D2: `/api/health` | to verify |
| P-10 | Error reporting / logging | None in the source; adding monitoring is a deviation (no PHI may be sent) | Q |
| P-11 | Data continuity | Same origin → existing localStorage is reused (same keys). New origin → users export/import (Calculator and Billing exports exist; a generic export is a deviation) | Q-07 |
| P-12 | Legacy bridge file | `/legacy/Remotion_Desktop.html` (byte-identical, checksum) served only while `legacy:true` manifests exist; removed at C-17 | — |

## 3. Release procedure (runbook — UNVERIFIED until run against the target)

```bash
# 0. Preconditions
git status --porcelain            # expect: empty
git rev-parse --abbrev-ref HEAD   # expect: release/<version>
pnpm install --frozen-lockfile    # expect: no lockfile changes

# 1. Quality gates (doc 13 §8)
pnpm typecheck && pnpm lint && pnpm test && pnpm test:golden
pnpm build                        # expect: "Export successful" (D1) or a .next build (D2)
pnpm test:e2e --project=chromium,firefox,webkit
pnpm test:visual                  # expect: 0 unexplained diffs

# 2. Artifact checks
npx serve out -l 4173 &           # D1 local preview
pnpm test:smoke --base-url=http://localhost:4173

# 3. Staging deploy (platform-specific, to fill after B-01)
# <deploy command for the target platform> --env=staging
pnpm test:smoke --base-url=$STAGING_URL

# 4. Production (only with explicit authorisation)
# <deploy command> --env=production
pnpm test:smoke --base-url=$PROD_URL
```

Smoke list (`test:smoke`):
1. `/` boots the desktop (dock, top bar, widgets visible; no console errors).
2. Each of the 11 `/apps/<key>` boots standalone (including `hrPeople`).
3. `/#app=documents` redirects.
4. Language switch to `ar` sets `dir=rtl`.
5. Theme toggles.
6. Open Calculator → `2^10/3` = 341.333333333.
7. Documents sample report renders 6 pages.
8. Billing dashboard KPIs render.
9. Calendrier agenda renders today.
10. Seeded localStorage fixture loads without reseeding.

## 4. Content Security Policy (proposed)

```
default-src 'self';
script-src 'self' 'nonce-<pre-paint>';           # pre-paint theme/dir script
style-src 'self' 'unsafe-inline';                # source relies on inline style attributes (runtime --vars)
img-src 'self' data: blob:;                      # data-URL photos/signatures, blob previews
font-src 'self' data:;
worker-src 'self' blob:;                         # pdf.js worker
connect-src 'self' https:;                       # user-configured entities API (any https origin, as in source)
frame-src 'self';                                # legacy bridge, print iframes, sandboxed export previews
object-src 'none'; base-uri 'self'; frame-ancestors 'self';
```
D1 static hosting needs the CSP set at the host or CDN. Verify no violations in E2E (S-5).

## 5. Rollout strategy

| Step | Scope | Exit criterion |
|---|---|---|
| R1 | Internal staging with all apps on the legacy bridge except the shell (end of Phase B) | Shell parity gates G-1, G-6 for shell screens |
| R2 | Per-app releases as each app reaches VERIFIED (Phase C); the bridge covers the rest | App rows VERIFIED in doc 12 |
| R3 | Bridge removed (C-17), full parity | G-1…G-11 |
| R4 | Production (with authorisation) | Smoke green; 48 h with no regression reports |

## 6. Rollback

| Situation | Action | Time |
|---|---|---|
| A migrated app regresses after release | Flip its manifest to `legacy:true` (bridge) and redeploy. Data is unaffected (same keys) | < 15 min |
| A natively ported app regresses (HR & Payroll since slice 12, Billing & Revenue since slice 13, Calculator since slice 17, Documents since slice 19) | Remove its `import "@/apps/<app>/<App>App"` line in `src/os/shell/OsShell.tsx` and redeploy: the window falls back to the legacy bridge body (`LegacyAppFrame`). Same storage keys (`remotion-hr`, `remotion-billing`, `remotion-forms`, `remotion-calc`, `remotion-docs` and the "open as is" IndexedDB store), so data is unaffected | build + deploy time |
| The native Forms & Surveys app regresses (since slice 18) | Revert the slice 18 commit (not only the `FormsApp` import): Billing and Patients read the Forms app's in-memory store and Patients opens forms through the native `feOpenForm`, so the bridged-era `src/apps/forms/store.ts` (with its storage listener) and the Patients bridge call must come back with the bridged window. Same storage key (`remotion-forms`), so data is unaffected | build + deploy time |
| Native healthcare suite (Patients, Calendar, Cabinet, Planning — default since slice 16) | `?health=legacy` serves the four bridged apps for one visit (diagnosis, support). To make the bridge the default again, build with `NEXT_PUBLIC_HEALTH_NATIVE=0` and redeploy. Same keys (`remotion-patients`, `remotion-calendar`, `remotion-cabinet`, `remotion-planning`, `remotion-bus`, `remotion-shared`), so data is unaffected | link: immediate · build + deploy time |
| Shell regression | Redeploy the previous artifact (immutable builds kept for 5 releases). Without a redeploy, `?shell=legacy` on `/` and `/apps/<key>` serves the whole legacy OS through the bridge (diagnosis, support) | < 15 min (link: immediate) |
| Shell regression, no previous artifact | Build with `NEXT_PUBLIC_OS_SHELL=legacy`: the legacy OS becomes the default again; `?shell=react` still reaches the React shell (added in slice 11) | build + deploy time |
| Full rollback | Serve the original `Remotion_Desktop.html` at the same origin. Same keys, so user data stays readable | < 15 min |
| Data corruption suspected | Users keep data (no migrations run). Restore from export if needed. **No destructive migration is part of this plan** | — |

Rehearse the rollback in staging before R4 (F-05).

## 7. What must not happen without explicit authorisation (brief §7.5)

Production deploy · DNS change · secret rotation · destructive data migration · infrastructure changes · enabling telemetry. Each needs a named approver and a date recorded in doc 17.

## 8. Staging deployment (record)

Authorised by the product owner on 2026-10-18 ("submit on GitHub and Vercel, verify"; Vercel option chosen: **new project, preview only**). No production deployment, DNS change or secret rotation was made. The existing `remotion-desktop` Vercel project and its production deployment were not touched.

| Item | Value |
|---|---|
| Repository | `github.com/Chamk-Consulting/remotion-os` (created by the product owner; **public**). `main` = the migration history; `preview/slice-NN` branches are the staging builds |
| Vercel | Team "Nessim teams", new project `remotion-os` (framework Next.js, `pnpm install --frozen-lockfile`, `pnpm build`, Node 24). Vercel Authentication on (`all_except_custom_domains`): only team members can open the deployments |
| How it is deployed | A deployment created from the Git source (repository, branch and commit) with target **staging**. The project's Git connection is active: a push to `main` started an automatic production build on 2026-10-18, which was cancelled while building (never served). Since then the project's ignored build step skips `main` (`if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 0; else exit 1; fi`); remove it in the project settings when production deploys from `main` are wanted |
| Slice 20 staging | Commit `481cc71`, branch `preview/slice-20`, deployment `remotion-efl9ghmd9-nessim-teams.vercel.app` |
| Slice 19 staging | Commit `0ae7ee3`, deployment `remotion-50ovksrey-nessim-teams.vercel.app` (READY). A first attempt was created with the production target by default (a new project without a production branch) and was **cancelled before it built**; it was then recreated with the staging target |
| Environment variables | None needed (no secrets; the build has no server-side configuration) |
| Verification (slice 19) | HTTP: `/`, `/apps/documents` and an unknown app key (404) as expected; `/legacy/Remotion_Desktop.html` byte-identical to the source. Browser suites run in Vercel Sandboxes against the deployment: E2E 162 / 162 (2 passed on re-run: timing), visual React shell: 84 of 116 scenes compared before the run was stopped, all within 0.1 % (largest 0.056 %), bridge 115 / 116 with the 116th flipping between 0.000 % and 5.463 % in repeated runs of the source itself (`?shell=legacy` serves the original file; see doc 15). Baselines were re-captured from the source in the same sandbox, as the sandbox's Chromium build renders text differently from the local baselines (0.2–0.5 % everywhere) |
| Temporary access | An automation bypass secret was created for the sandbox runs and **revoked** after them (2026-10-18). The value is not recorded anywhere |

Rollback of the staging deployment: delete or redeploy the `remotion-os` project's previous deployment; nothing else depends on it.
