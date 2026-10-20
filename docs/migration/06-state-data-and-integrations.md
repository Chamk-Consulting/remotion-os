# 06 · State, data and integrations

Status: **complete for the source.** Exact schemas are in `evidence/inventories/0X-*.md §6–§7`.

**Key FACT: the source has no backend.** There are no API endpoints, no auth server and no database. All state lives in the browser: 40 `localStorage` keys, 1 IndexedDB database, and in-memory singletons. "Preserving API contracts" (brief §3) therefore means preserving:
- the **storage contracts** (key names, JSON shapes, versions),
- the **in-browser integration contracts** (event bus, cross-app reads, `window.claude`),
- the **one real network integration** (the Documents entities API).

---

## 1. Persistent browser storage (40 localStorage keys)

Sensitivity: **PHI** = health data · **PII** = personal data · **Biz** = business/financial · **Pref** = preference · **Flag** = one-time seed flag.

| # | Key | Owner (area) | Shape (summary) | Version / migration | Sensitivity | Evidence |
|---|---|---|---|---|---|---|
| 1 | `remotion-lang` | A | `"en"\|"fr"\|"de"\|"ar"` | validated | Pref | L7506 |
| 2 | `remotion-desks` | A (+B items) | `{l:[{n,s,items?,w?}], c}` ≤12 | — | PII possible (file text in items) | L7748 |
| 3 | `remotion-kb` | A | `{set, lang, follow, layout, auto}` | field migration `preview→hints` | Pref | L8041 |
| 4 | `remotion-custom-sc` | A | `[{label, act, combo}]` | — | Pref | L8573 |
| 5 | `remotion-lk` | A | `{big, hc, rm}` | — | Pref | L8881 |
| 6 | `remotion-si` | A | `{remember, email}` | — | PII | L9073 |
| 7 | `remotion-nc` | A | `{dnd, quiet, sound, desk}` | — | Pref | L9989 |
| 8 | `remotion-acc` | A | `{id, status, prof}` | validated | PII (low) | L10225 |
| 9 | `remotion-accs-extra` | A | `[{id, name, short, role, email, ini, bg, photo?(dataURL), org?}]` | quota retry without photo | **PII** | L10223 |
| 10 | `remotion-units` | A | `{[orgId]: {s, d}}` | — | Pref | L10265 |
| 11 | `remotion-theme` | A | `"light"\|"dark"` (absent = auto) | — | Pref | L10418 |
| 12 | `remotion-ai` | B | `{live:[conv ≤30], ren, del, forms, form?, formMsgs? ≤40}` incl. **full attachment text** and VPH form values | — | **PHI** | L10548 |
| 13 | `remotion-trash` | B | `Item & {from, root?, at}` ≤60 | — | PII possible | L11253 |
| 14 | `remotion-dk-v1` | B | `"1"` | seed flag | Flag | L11256 |
| 15 | `remotion-dk-v2` | B | `"1"` (**overwrites desktop 1 items once**) | seed flag | Flag | L11767 |
| 16 | `remotion-dkview` | B | `{size, align, icons}` | — | Pref | L11760 |
| 17 | `remotion-fs` | B | `{documents, downloads, images, videos, music, shared: Item[]}` | — | PII possible | L11785 |
| 18 | `remotion-apps` | B | `{inst, fav, recent ≤12}` | — | Pref | L11749 |
| 19 | `remotion-rail` | B | `"1"\|"0"` | — | Pref | L11933 |
| 20 | `remotion-ws-desks` | B | `{sel, st:{[ws]:{l, c}}, n}` (duplicates desktop items) | — | PII possible | L20844 |
| 21 | `remotion-forms` | C | `{v:1, cur, docs, forms, subs, ver, pv, set, saved, g1, g2, blocks, favs, recent}`; submissions with answers and signature data URLs | `v===1` else **reseed (data loss)**; in-place flags g1/g2/pv.cv | **PHI** | L12478 |
| 22 | `remotion-dk-v3` | C | `"1"` | seed flag | Flag | L13593 |
| 23 | `remotion-docs` | D | `{v:1, m2, cur, order, docs, reusable, people, spell?, dir, api:{url, token}, myThemes}`; patient identity, NIR, signatures, imported PDFs base64 (`exb64`) | `v:1` else **reseed**; `m2` accent migration | **PHI + secret (API token)** | L14429 |
| 24 | `remotion-docs-xp` | D | last export format | — | Pref | L16990 |
| 25 | `remotion-dc-lvmode` | D | `"convert"\|"live"` | — | Pref | L20307 |
| 26 | `remotion-calc` | E | settings, history (inputs incl. health values when saved), vars, units, rates, editor | **none** | PHI possible (low) | L21073, L21076 |
| 27 | `remotion-dk-calc1` | E | `"1"` | seed flag | Flag | L22592 |
| 28 | `remotion-billing` | F | store `v:1` (parties, invoices, payments, refunds, quotes, seqs, catalogue, config, audit, appts) | invalid → **reseed** | **Biz + PII + PHI-adjacent** | L22601 |
| 29 | `remotion-dk-bill1` | F | `"1"` | seed flag | Flag | L23803 |
| 30 | `remotion-hr` | G | store `v:1` (emps with personal data, salaries, docs as data URLs ≤400 KB, leaves, settings, audit) | invalid → **reseed** | **PII + salary** | L23825 |
| 31 | `remotion-dk-hr1` | G | `"1"` | seed flag | Flag | L24439 |
| 32 | `remotion-bus` | H | event log `{events, seq, done:{consumer:[keys]}, fail}` | — | ids only (no clinical content by design) | L24468 |
| 33 | `remotion-shared` | H | practitioner registry + service catalogue | — | Biz | L24468 |
| 34 | `remotion-patients` | H | full EHR: identity, contacts, relatives, encounters, allergies, meds, observations, labs, therapy notes, documents (base64 ≤600 KB), consents, audit ≤800 | `ver`/`rev` for optimistic checks | **PHI** | L24534 |
| 35 | `remotion-dk-pa1` | H | `"1"` | seed flag | Flag | L25424 |
| 36 | `remotion-calendar` | H | appointments, series, availability, resources, outbox, links (tokens), sync runs, audit | `rev` | **PHI** (appointments with patient ids/names) | L25429 |
| 37 | `remotion-cabinet` | H | visits, readiness, issues, tasks, config, audit | `rev` | **PHI-adjacent** | L26102 |
| 38 | `remotion-dk-cb1` | H | `"1"` | seed flag | Flag | L26684 |
| 39 | `remotion-planning` | H | calendars visibility, waiting list, colours, audit ≤400 | — | **PHI** (waiting list) | L26689 |
| 40 | `remotion-dk-pl1` | H | `"1"` | seed flag | Flag | L27210 |

**IndexedDB:** database `remotion-docs-live` v1, object store `b`. It holds the images, fonts and original file (<25 MB) of "as is" documents under keys `lv…`, and is cleaned of unused keys older than 1 h about 6 s after open (L20238, L20265, L20273–L20274).

**Not used:** sessionStorage, cookies, Cache API, service worker (FACT).

### 1.1 Storage risks (FACT unless marked)
- **Quota and silent loss.** Documents, Patients, Calendrier, Cabinet, Planning, Billing and HR catch quota errors with `console.warn`, then still show "Saved" or "All saved". Base64 documents (≤600 KB in Patients, 8 MB PDF imports in Documents) reach the ≈5 MB browser quota quickly.
- **Version policy = reseed.** Any `v≠1` silently replaces the store with demo data.
- **Duplication.** Desktop items are stored in both `remotion-desks` and every workspace inside `remotion-ws-desks`.
- **PHI/PII unencrypted** and readable by every app on the origin, including the tokens in `remotion-docs.api.token`.

## 2. In-memory state (singletons to become stores)

| Area | Singletons | Notes |
|---|---|---|
| A | `lang`, `desks`, `cur`, `workspaces`, `selWs`, `kbOpen`, `kbSet`, `status`, `accId`, `isDark`, `NCS` (notifications, not persisted), `rg` (wizard), lockout counters, `ACCOUNTS`, `ORG_UNITS`, `ORG_DIR` | shell |
| B | `OSW` (windows: **not persisted**), `OSX` (workspace store), `OSA` (app mode), `RAI` (AI), `dkSel`, `dkClip`, `FM` (Files UI), `TM` (terminal), `AL` (launcher), `alStore`, `fsData`, `dkTrash` | kernel |
| C | `FE` (view, tab, selection, undo ≤80 JSON snapshots, preview values…), `feS` | Forms |
| D | `DC` (view, undo/redo ≤100 snapshots, find, import/export/print jobs, caches), `dcS`, `RD`, `RDX`, `RDT` | Documents |
| E | `CA`, `CA_U`, `CA_TZ` | Calculator |
| F/G | `BI.ui`, `BI.st`; `HR.ui`, `HR.st` | business |
| H | `PA`, `CL`, `CB`, `PL` (`.ui`, `.st`), `CL_RL` (rate limit) | healthcare |

URL-derived state: only `#app=<key>` at boot (FACT). Every in-app view is lost on refresh.

## 3. Integration contracts

### 3.1 Host integration `window.claude` (artifact runtime)
| Capability | Used by | Contract | Fallback when absent |
|---|---|---|---|
| `window.claude.use("sample")` → `S(turns, {cache, signal, onText, tools})`, `S.limits()` | Remotion AI: eager preload at panel build (L10588) and lazy `aiGetSample` (L10845–L10882); form tool `set_fields` (L11223–L11233), Forms AI (L13120, L14117) | streaming text, AbortController, tool calling with JSON schema | AI shows "live answers not available"; Forms AI falls back to a local intent parser (`feAiLocal`) |
| `window.claude.use("downloads")` → `dl.save({filename, data})` | Documents export (L16972–L16986); `dcSaveFile` used by HR, Patients, Calendrier, Cabinet downloads | file save; formats not in `DC_DLOK` are zipped first | `<a download>` with Blob URL |

**RISK (high):** a Next.js app on its own domain has no `window.claude`, so live AI goes to the "not available" state. Preserving this behaviour needs a server-side LLM integration, which is new infrastructure and requires approval (doc 09, Q-05).

### 3.2 Runtime CDN libraries (no SRI)
| Library | Version | Loaded by | Used for |
|---|---|---|---|
| pdf.js + worker | 3.11.174 | `feLoadScript` (Forms L14082) | Forms PDF import; Documents PDF import, exact forms, as-is (`isEvalSupported:false`) |
| mammoth | 1.6.0 | `feLoadScript` | Forms DOCX import; Documents v1 DOCX import |
| pdf-lib | 1.17.1 | `dcPdfLibW` L18976 | fill official PDFs |
| Google Fonts | Inter, Noto Sans Arabic (static `<link>`, L4); Arimo, Tinos, Cousine, Carlito, Caladea (`<link>` injected at runtime by "as is" mode, L20255–L20256) | — | UI and document metric fonts |

### 3.3 Real network integration
| Integration | Contract | Auth | Failure modes | Migration implication |
|---|---|---|---|---|
| Documents **entities API** (optional, user-configured) | `GET {url}/{type}?q=…` → JSON array, ≤50 results, whitelisted fields | `Authorization: Bearer <token>`; token stored in plaintext in localStorage | 8 s timeout (AbortController), HTTP errors shown | Keep the client contract. CORS depends on the user's API. Moving the token server-side needs approval |

### 3.4 In-browser cross-app integration (event bus and globals)
- **Healthcare event bus** `remotion-bus` (L24472–L24483): about 31 event types, idempotent keys, per-consumer done-lists, 3 retries with backoff, catch-up on app open, cross-tab via `storage`. Full producer/consumer table: inventory 07 §6.3. Known issues: 2 keyless emits, 1 subscribed event never emitted, cross-tab double processing (INFERENCE).
- **Global reads/writes between apps:** X-01…X-14 in doc 04 §3.
- **Cross-window sync:** `storage` listeners in Documents (L21041, lists only), Calculator (history only), Billing, HR, Patients, Calendrier, Cabinet, Planning and the bus. There is no BroadcastChannel.

### 3.5 Browser APIs (client-only in the target)
Canvas 2D, Web Animations, View Transitions, Pointer Events and capture, HTML5 DnD, Fullscreen, `window.open`, Clipboard (read and write) + `execCommand` fallback, File API / FileReader / DataTransfer, Blob / `createObjectURL`, Compression/DecompressionStream (ZIP), IndexedDB, `FontFace`, CSS Custom Highlight API, ResizeObserver, MutationObserver, AudioContext (key clicks, chime), Battery API, `navigator.onLine`, `crypto.getRandomValues` / `randomUUID`, Intl (DateTimeFormat incl. `longOffset`, `supportedValuesOf("timeZone")`, NumberFormat, DisplayNames, RelativeTimeFormat), `matchMedia`, `inert`, `window.print`, `DOMParser` / `XMLSerializer`, `CSSStyleSheet.replaceSync`.

Not used: Notifications API, WebAuthn (passkey is simulated), geolocation, getUserMedia, service workers, WebSocket/SSE.

### 3.6 Analytics / telemetry / error monitoring
None (FACT). The brief says to preserve only what exists, so none is planned.

## 4. Authentication and authorisation (as implemented)

All simulated (FACT; inventories 01 §11, 06 §11.6, 07 §11.5):
- **Identity:** 3 seeded accounts + registered extras; the actor is often hard-coded as "Nassim".
- **Authentication:** password ≥4 chars, PIN 1234, any 6-digit OTP, timers for SSO/passkey/gov ID.
- **Authorisation:** per-app RBAC matrices in client code, all switchable by any user. Billing has 5 roles / 20 permissions, HR 4 / 18 plus a field map. Patients, Calendrier and Cabinet have their own matrices; Patients adds care-team ABAC and break-glass.
- **Sessions:** no tokens, no renewal, no expiry other than idle lock (25 s glance) and auto-away (5 min).

Implication: the brief's requirement to "preserve authentication and authorization boundaries" means preserving **these UI-level boundaries** (what each simulated role sees and can do). Real auth is a separate, approval-gated workstream (doc 09, Q-04).

## 5. Direct DOM manipulation and HTML-specific assumptions (migration hazards)

- 497 `innerHTML` occurrences (438 lines), 46 `outerHTML`, 25 `insertAdjacentHTML`, 195 document-level listeners, about 252 monkey-patch wrappers, 110 `contenteditable` occurrences (85 lines, case-insensitive), 18 `execCommand` uses.
- Global-scope function hoisting across a 20,000-line script; temporal-dead-zone ordering (inv. 01 §13 #27).
- `document.write` into print iframes (Billing, HR, Patients).
- Pagination and the Word renderer **measure the live DOM** after render (Documents L16407, L19452).
- Same-document multi-window: pop-outs boot the full OS bundle again.

## 6. Sensitive data handling

**REC:** in the target, do **not** move sensitive handling into new client components beyond what exists. Specifically:
1. Keep the existing storage contracts (same keys) during the frontend migration, so no new exposure is created.
2. Do not add new client-side stores of PHI.
3. Do not log PHI to the console or telemetry.
4. Bundle CDN libraries locally (removes the supply-chain risk without changing behaviour).
5. Treat encryption, server persistence and real auth as a separate approved workstream. The brief forbids inventing a backend.
