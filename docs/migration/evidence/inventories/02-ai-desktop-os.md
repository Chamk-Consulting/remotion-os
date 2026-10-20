# 02 — Remotion AI, Free Desktop, OS layer, Window manager (v55/v56)

Source: `source/Remotion_Desktop.html` (read-only). All `Lnnnnn` refer to FILE line numbers.
Labels: **FACT** (read in code), **INFERENCE** (deduced), **RISK**, **UNKNOWN**.

---

## 0. Executive summary (for the migration lead)

- This area is the **OS kernel** of the mockup: it owns the window manager (`OSW`, `osWinOpen`, `osFocus/osMin/osRestore/osMax/osClose`), the app-open registry (`OS_OPEN`, `OS_DOCK`, `OS_SOLO`, `dkOpenX` chain), the app catalogue (`DK_APPS`, `AL_APPS`, `alStore`), the desktop file system (`desks[i].items`, `fsData`, `dkTrash`), shared menus (`osMenu` with submenus), app mode / pop-out (`#app=<key>` URL boot) and full screen. Every later app (Forms, Documents, Calculator, Billing, HR, Patients, Calendar, Cabinet, Planning) plugs in through the same **8-step monkey-patch contract** documented in §1.4 (FACT, L13568–13590, L15418–15420, L22564–22598, L23789–23805, L24423–24440, L25410–25425, L26082–26097, L26667–26684, L27194–27210).
- Registration is **not declarative**: each app reassigns global functions (`dkOpenX`, `renderDock`, `osRelabel`) by wrapping the previous value, plus hard-coded key chains in two places (L11857 and L20981). That is the #1 thing to replace with a typed `AppManifest` registry in Next.js.
- Remotion AI is a self-contained slide-over dialog with (a) scripted demos on **sample data**, (b) **live answers via `window.claude.use("sample")`** (streaming, abort, tool calling for form filling), (c) a sample French VPH (wheelchair needs-assessment) form panel + in-chat form card with a regex "smart edit" parser.
- Defects found include: pop-out of `hrPeople` boots the wrong page (regex `[a-z]+` drops camelCase, L21038), base conversation `cmp` cannot be deleted (L10782), "cut" desktop items are destroyed if never pasted (L11440), four registered apps lack `OS_DOCK` entries (no running indicator / minimise animation), uninstalling an app in the launcher doesn't remove it from dock/rail. See §13.

---

## 1. Scope & line ranges

### 1.1 JS

| Block | Lines | Notes |
|---|---|---|
| Remotion AI i18n (EN/FR/DE/AR) | L10450 (51,668 chars, one line) | 230 EN keys, 227 in FR/DE/AR (`aiCtx`, `aiLiveSys`, `aiTitle` EN-only → fall back via `t()`) |
| Remotion AI core (icons, markdown, conversations, DOM, render, open/close, popovers, composer, header/sidebar actions, thread interactions, scripted demos, live answers, shortcuts) | L10449–L10893 | |
| VPH form side panel (sample document) | L10895–L11051 | 5-step wizard |
| Form-in-chat + smart edits / parsing + live form assistant | L11053–L11235 | i18n D-dict at L11054 (22 keys × 4 langs) |
| Free desktop (icons, folders, files, shortcuts, selection, rubber band, trash, ghost drags, file drop, context menu, thumbnails, hooks) | L11237–L11621 | i18n at L11238 (60 keys × 4) |
| OS layer (menus+submenus, glyph catalogue, folder colours/view options, design seed, storage outside desktops, windows, dock/rail open, desktop menus, sidebar show/hide, tray, launcher, Files manager, Terminal, relabel+init) | L11623–L12307 | i18n at L11624 (157 keys × 4) |
| v55 window manager | L20843–L20978 | |
| v56 app mode / pop-out / boot | L20979–L21041 | |
| v56 full screen | L21042–L21067 | |

Total JS in scope ≈ 1,860 + 225 = **~2,085 lines** (several are very long).

### 1.2 CSS

| Section | Lines |
|---|---|
| Remotion AI (`.ai`, `.ai-win`, sidebar, main, cards, attachments, empty state, composer) | L1738–L1988 |
| VPH form panel (`.ai-form`, `.vf-*`) | L1989–L2169 |
| Form inside the chat (`.fc-*`, `.ai-qr`) | L2170–L2241 |
| Free desktop icons (`.dk-layer`, `.dk-ic`, `.dk-menu`, `.dk-win`, `.dk-ghost`, `.dk-band`) | L2242–L2357 |
| OS menus `.os-menu` | L2358–L2387 |
| Windows `.os-win` | L2388–L2414 |
| Launcher `.al-*` | L2415–L2472 |
| Files `.fm-*` | L2473–L2560 |
| Terminal `.tm-*` | L2561–L2572 |
| Sidebar peek, tray | L2573–L2585 |
| Icon sizes & visibility, phone overrides | L2586–L2603 |
| v55 window manager (`.os-eh` edge handles, `.os-snapv`, `.osm` desktop-thumbnail windows) | L5108–L5131 |
| v56 app mode / pop-out dialog (`body.os-appmode`, `.os-solo`, `.os-solob`, `.os-popdlg`, `body.os-booting`) | L5132–L5153 |
| App-specific app-mode tweak example | L5577–L5578 (`body.os-appmode .ca-win .ca`) |

### 1.3 Markup ids / anchors used (from `markup.html`)

`#wall` (canvas), `#shell`, `.nav` (top bar; contains `[data-t="apps"]`, `[data-t="files"]`), `.right [data-t="ai"]` (AI button, re-identified as `#aiBtn` at L10587), `#rail` (left app rail), `#wsMenu`, `.main`, `.widgets`, `#dock`, `#scrim` (AI dialog inserted before it, L10583), `#desks` (desktop overview, `desksEl`), `#tray` (rendered inside desks panel), `#dHud`, `#toast`. Created at runtime: `#ai`, `#dkLayer` (after `#rail`, L11276), `.rail-peek` (L11930), `.os-win[data-osw]`, `.dk-win[data-key]`, `.os-menu[data-level]`, `.dk-menu`, `.ai-pop`, `.os-snapv`, `.os-popdlg`, `.dk-ghost`.

### 1.4 THE APP REGISTRATION CONTRACT (most important for migration)

There is **no single registry object**. An "app" is the union of entries in several global tables plus wrapped global functions. Below, `K` = app key (string, also the `OSW` window key and the dock `data-t`).

#### 1.4.1 Global tables

| Table | Defined | Shape | Purpose |
|---|---|---|---|
| `railItems` | L7603 (outside area) | `[key, background, svgHTML][]` | Left rail buttons (`files, calendar, patients, telehealth, billing, hrPeople, docs, apps, add`). Rendered by `renderRail()` L7614 as `<button data-t=K>` |
| `dockApps` | L7724 (outside area) | same | Dock (`files, launchpad, explorer, browser, pages, documents, Keep Flow, connections, meetings, analytics, commerce, terminal, settings, trash`). `renderDock()` L7740 |
| `DK_APPS` | L11241 (built from railItems+dockApps), extended L11734 (`notes, mail, photos, media, boards, remotionAI, forms, maps, messages, accounting`), L22565 `calcsci`, L26668 `cabinet`, L27195 `planning` | `{[K]: [background, svgHTML]}` | Glyph source for desktop icons, launcher cards, ghost drags, window title icons, dynamic dock buttons (`dkGlyph({type:"app",app:K})`, L11244/L11755) |
| `AL_APPS` | L11746, pushed L22566, L26669, L27196 | `[K, categoryKey, installedByDefault 0/1][]` | Launcher catalogue. Note: uses `docs` (not `documents`) |
| `AL_CATS` | L11747 | `[catKey, colour][]` | 10 launcher categories |
| `alStore` | L11748 → `localStorage["remotion-apps"]` | `{inst:{[K]:0|1}, fav:{[K]:1}, recent:K[] (≤12)}` | Installed/favourite/recent state. `alInst(K)` L11751 = stored value else catalogue default |
| `OS_OPEN` | L11853; added L13588 `forms`, L15418 `documents`/`docs`, L22587 `calcsci`/`calculator`, L23799 `billing`, L24435 `hrPeople`, L25420 `patients`, L26093 `calendar`, L26680 `cabinet`, L27206 `planning` | `{[dataT]: () => void}` | "This dock/rail/top-bar key opens a REAL window". Base: `files, explorer → osFiles`, `launchpad, apps → osLauncher`, `terminal → osTerminal` |
| `OS_DOCK` | L11807; added L13568 forms, L15418 documents, L22567 calcsci, L23790 billing, L24424 hrPeople | `{[windowKey]: dockDataT}` | Maps window key → dock button (running dot `os-run`, minimised `os-minz`, minimise/restore genie animation target). **Missing for patients, calendar, cabinet, planning (FACT)** |
| `OS_SOLO` | L20980 (static literal) | `{[K]: {n: i18nKeyOfName}}` | Apps allowed in app mode / pop-out / app full screen: `documents, forms, files, terminal, calcsci, billing, hrPeople, patients, calendar, cabinet, planning` |
| `OSW` | L11806 | `{[K]: {el, key, o, min, max, prev?, snap?, snapPrev?, ws, did, all?}}` | Live window registry |

#### 1.4.2 Hard-coded key chains (must be kept in sync by hand)

- L11857 (dock/rail/top-bar click → window key): `files|explorer→files, terminal, forms, documents|docs→documents, calcsci, billing, hrPeople, patients, calendar, cabinet, planning, else → "apps"`. **RISK**: any new key not added here (e.g. `calculator`) maps to `"apps"`, so clicking its dock button while the launcher is open toggles/minimises the launcher instead.
- L20981 `osSoloKey(k)`: same chain incl. `calculator→calcsci`, returns `null` otherwise.

#### 1.4.3 The per-app integration recipe (observed identically in 9 apps)

Using Calculator (L22564–L22598) as the canonical example; Billing L23789–L23805, HR L24423–L24440, Patients L25410–L25425, Calendar L26082–L26097, Cabinet L26667–L26684, Planning L27194–L27210, Forms L13567–L13590, Documents L15418–L15420 follow the same pattern.

| # | Step | Code pattern | Purpose |
|---|---|---|---|
| 1 | Glyph | `DK_APPS.K=[bg, svg]` (or inherited from rail/dock arrays) | icon everywhere |
| 2 | Catalogue | `if(!AL_APPS.some(a=>a[0]===K))AL_APPS.push([K,cat,1])` | launcher card |
| 3 | Name i18n | `Object.assign(I18N.fr,{K:"…"})` ×4 (L26670, L27197) or app-local `xxW("app")` | `t(K)` used by dock, launcher, desktop icon |
| 4 | Dock entry | `OS_DOCK.K="K"` + `xxDockBtn(on,quiet)` that **inserts a `<button data-t=K class="fe-dockb">` before the trash** when the window opens and removes it on close, then `osRunMark()` | transient dock icon for apps not in `dockApps` |
| 5 | Opener | `function xxOpen(from){ if(OSW.K){restore+focus;return} alStore.inst.K=1; alSave(); alTouch(K); load state; xxDockBtn(true); osWinOpen(K,{title, icon:dkGlyph(...).replace('gl app','gl app gmini'), cls:"xx-win", w:min(1640,innerWidth-16), h:max(440,dockTop-66), x:centred, y:64, minW:340, minH:420, body:xxBody() /*HTMLElement*/, from, onClose(){xxDockBtn(false); save}, onResize(){xxSize()} }); xxRender(true); ResizeObserver(root) }` | creates the window |
| 6 | Registry | `OS_OPEN.K=()=>xxOpen()` | dock/rail/top-bar click, app mode, boot |
| 7 | Desktop/launcher/Files open | `{const _p=dkOpenX; dkOpenX=function(it,el,loc){ if(it?.type==="app"&&it.app===K){dkPop(el);alTouch(K);xxOpen(el);return} return _p(it,el,loc)}}` | desktop icon, launcher card, Files "open", terminal `open` |
| 8 | Dock survives re-render | `{const _r=renderDock; renderDock=function(){_r(); if(OSW.K) xxDockBtn(true,true)}}` | language change re-renders dock |
| 9 | Language | `{const _l=osRelabel; osRelabel=function(){_l(); if(OSW.K){title text, aria-label, xxRender(false), dock title}}}` | called from `applyLang` L7991 |
| 10 | First-run seed | IIFE guarded by `localStorage["remotion-dk-<x>1"]` that sets `alStore.inst.K=1` and pushes `{type:"app",app:K,c,r}` onto `desks[0].items` | desktop shortcut once |
| 11 | Cross-tab | `addEventListener("storage", e=>{ if(e.key!==XX_KEY||!OSW.K)return; reload; refresh })` | pop-out window ↔ main window sync |
| 12 | App mode | Add `K` to `OS_SOLO` literal (L20980) and `osSoloKey` chain (L20981) and L11857 chain | app mode, pop-out, full screen menus |

Contract of `osWinOpen(key, o)` (L11811, wrapped at L20889): `o = {title:string, icon?:html, cls?:string, w:number, h:number, x?:number, y?:number (default 90), minW?:380, minH?:260, head?:html (extra title-bar content), body:HTMLElement (appended, not HTML string), from?:Element (genie origin; else OS_DOCK button), onClose?():void, onResize?():void}`. Returns window record `w`; after v55 wrapper it also gets `w.ws=selWs`, `w.did=osDid(cur)` and edge handles + window menu button (`osWinDecorate`). Idempotent: if `OSW[key]` exists, restores and focuses.

Window lifecycle API (all keyed by K): `osFocus` L11810 (+v55 wrapper L20892 navigates to the window's desktop/workspace), `osMin` L11835 (+v56 wrapper L21009 exits app mode), `osRestore` L11841, `osMax` L11845, `osClose` L11834 (+wrappers L20893 minis refresh, L21008 exits app mode; calls `o.onClose`), `osSnap/osUnsnap` L20914–15, `osMoveWin/osMoveWinWs` L20896/20900, `osAppMode/osAppModeExit` L20991/20999, `osPopout` L21016, `osAppFull` L21048, `osTopWin` L20860, `osRunMark` L11809.

Other entry points that route through the contract:
- Desktop icon double-click/Enter → `dkOpen` → `dkOpenTarget` (resolves `ref` shortcuts) → `dkOpenX` chain (L11862–L11873).
- Launcher card click/Enter → `alOpenApp` (install first if not installed) → `dkOpenX` (L11989).
- Files manager open of an app node → `fmOpenNode` → `dkOpenX` (L12106). Terminal `open <app>` → `dkOpen` (L12284).
- Dock/rail/top-bar click (capture listener L11854) → `OS_OPEN[k](button)`; if the window exists and the click is on the dock: minimised→restore, frontmost→minimise, else focus (L11858).
- Context menus: dock/rail (L21031), launcher card (L21032), desktop app icon (L21065), window title bar / ⧉ button (L20938–L20942, wrapped L21029, L21055) → `osAppMenuItems(k)`: Open/Show · App mode · Full screen (inserted L21057) · Open in new window · Close.
- Built-in keys handled in base `dkOpenX` (L11869): `remotionAI→openAI()`, `files|explorer→osFiles`, `terminal→osTerminal`, `launchpad|apps→osLauncher`, `settings→setSysMenu(true)`, **anything else → `toast("Opened X")` (Simulated)**.
- Unregistered dock/rail keys fall to the global click toaster at L7598 (`toast(t("opened",{x}))`) — e.g. telehealth, Keep Flow, connections, meetings, analytics, commerce, browser, pages, settings (dock) are Simulated.

#### 1.4.4 App mode & separate browser window (URL routing)

- `osAppUrl(k)` (L21015) = `location.href.split("#")[0] + "#app=" + encodeURIComponent(k)` (FACT). No query string, no path routing; hash only.
- `osPopout(k)` (L21016): `window.open(url, "remotion-"+k, "popup=yes,width≤1280,height≤860,centred")`; on success sets `win.opener=null`, toasts, and minimises the local window (unless it is in app mode). If blocked (null) → `osPopBlocked(k)` dialog (L21020) with URL field, "Copy link" (Clipboard API → `execCommand('copy')` fallback), "Cancel", "App mode here".
- Boot (L21038, IIFE `osBootApp`): parses `/#app=([a-z]+)/` from `location.hash` **once at load** (no `hashchange` listener); maps through `osSoloKey`; adds `body.os-appmode os-standalone os-booting` (hides wall/windows, L5138); polls every 100 ms (≤60 tries = 6 s) until `OS_OPEN[k]` is a function, then `osAppMode(k, true)` (standalone: title becomes `"<App> · Remotion"`, solo bar shows "To desktop" instead of "Exit").
- `osAppMode(k, stand)` (L20991): opens/focuses the window via `osAppOpen`, retries every 120 ms if the window does not exist yet (**RISK**: unbounded retry if `OS_OPEN[k]` never creates `OSW[k]`), un-maximises/unsnaps, adds `body.os-appmode` + `.os-solo` on the window (CSS L5133–L5137 hides top bar, dock, main, desks, HUD, other windows; window becomes fixed 100vw×100dvh), injects `.os-solob` (full screen toggle, pop-out, exit) into the title bar, FLIP-animates from previous rect, calls `o.onResize`.
- Exit (L20999): removes classes, exits browser full screen, restores title.
- Shared data between windows: each app's own `storage` event listener (e.g. L21041 Documents, L22598 Calculator). No BroadcastChannel.

---

## 2. Screens / views / sub-pages

### 2.1 Remotion AI

| # | View | Entry point | Purpose | States / notable content |
|---|---|---|---|---|
| A1 | AI dialog shell `#ai.ai` (role=dialog) | top-bar AI button `#aiBtn` (L10707); desktop item "Ask Remotion AI" (L11493); desktop/launcher app `remotionAI` (L11869) | Chat assistant slide-over | opening/closing classes, `.narrow` (≤860px), `.max` (expanded), `.has-form`, `.side-open`, `.busy` |
| A2 | History sidebar `#aiSide` | always visible on wide; drawer on narrow / with form (`side-open`) via clock button or Ctrl+K | List conversations grouped Today / Yesterday / This week; search with `<mark>` highlight; category filter | empty: "No conversations match “x”" (L10597) |
| A3 | Filter popover | `#aiFilterBtn` | radio menu: all / files / plan / analysis (L10772) | |
| A4 | Header | per conversation | brand (narrow), conversation icon + title + "using" subtitle, buttons new/history (narrow-only), share, more, expand/collapse, close (L10601) | |
| A5 | "More" popover | header ⋯ | Rename (inline contentEditable title), Delete (danger) (L10768) | |
| A6 | Welcome / hello | new or empty live conversation (L10666) | 4 suggestion cards: Prepare tomorrow (demo), Fill form from PDF (demo), Plan my day (live prompt), Draft email (live prompt) | |
| A7 | Scripted conversation "prep" | sidebar or suggestion | Two user turns + rich cards: tomorrow's 3 meetings, 4 recent documents, 5 tasks with priority flags + checkboxes, quick notes with copy/👍/👎; then last-meeting summary (expand), client requirements, next actions | **Simulated** (sample data, `aiSample` note L10645) |
| A8 | Scripted conversation "form" | suggestion / "More ▸ Fill form" / created by `runDemo("form")` | PDF attachment → 4-step extraction progress → extracted fields card (show more) → "Open form"/"Compare with original" CTA + in-chat form card → follow-up with missing fields + quick replies; then appended user/assistant messages (`aiStore.formMsgs`) | Simulated + smart edits + live assistant |
| A9 | 9 simple canned conversations (sum, plan, find, data, mail, ws, rec, cmp, err) | sidebar | user prompt + markdown answer from i18n (`AI_SIMPLE` L10544) | Simulated |
| A10 | Live conversation (`kind:"live"`, id `c<ts>`) | "New chat" or typing in any non-form conversation | Streaming answer from `window.claude` sample capability, markdown rendered by `aiMd` | loading ("Thinking…" dots), streaming caret, error states mapped from error codes (L10850): not granted, no live, rate limited, refused, failed; truncated note; cancelled (Stop) |
| A11 | Composer | bottom | textarea auto-grow (≤160px), attach (≤4 files; text files ≤2 MB read to 30k chars), attachments chips with remove, chips: Use workspace (toggle), Search the web (inserts prompt), Create ▾ (doc/task/event/mail prompts), Summarise, Analyse, More ▾ (translate, explain, demo prep, demo form), hint text; Send/Stop button | |
| A12 | Contextual quick-reply strip `#aiCtx` | above composer in "form" and "prep" conversations (L11166) | form: Fill missing fields / Validate, Open full form, Show original, What does it mean?; prep: Draft follow-up email, What should I start with? | |
| A13 | VPH form side panel `#aiForm.ai-form` | "Open form" (≥1200px; otherwise redirected to chat card, L10996), quick reply "Open full form", card expand button | 5-step wizard: Patient / Situation / Besoins / Préconisations / Validation; left "source" pane with PDF file card, Re-analyse, tabs All/Filled/Missing with field list; footer status + Prev/Cancel + Next/Validate | done state (L10921) with Download/Close |
| A14 | "Original document" overlay `.vf-orig` | "View original" toggle / "Compare with original" | rendered paper page with `<mark>` for extracted values, blanks for missing | |
| A15 | Save split-menu popover | form header chevron | Save draft / Save & export (toasts) | Simulated |
| A16 | In-chat form card `#aiFC` | inside form conversation | progress ring + bar, 4 collapsible sections with per-field inputs/selects, certify checkbox + Validate; done row with Download | |
| A17 | Diff card `.fc-diff` | after smart edit / tool call | "Form updated" old→new rows | |

### 2.2 Free desktop

| # | View | Entry | Purpose / states |
|---|---|---|---|
| D1 | Desktop icon layer `#dkLayer` (role=listbox, multiselectable) | always (per desktop `desks[cur].items`) | grid of icons (apps, folders, docs, links); empty state "spark + dkEmptyT/D" (L11319); `.phone` mode ≤860px (no drag, tap-to-select then tap-to-open); `.filedrop` overlay; `.dragging`; size s/m/l, `noicons` |
| D2 | Folder window `.dk-win[data-key="f<id>"]` | double-click folder | grid of children, count footer; empty "This folder is empty"; draggable header, Esc closes |
| D3 | Quick Look window `.dk-win.ql` | double-click doc | big glyph, kind/size/modified/where; preview = stored text (`<pre>`) or skeleton page + "sample" note; buttons Open (toast), Ask Remotion AI |
| D4 | Trash window `.dk-win[data-key="trash"]` | dock trash click (capture L11516) | list with Restore per item, Empty trash; empty state |
| D5 | Legacy desktop context menu `.dk-menu` (L11583) | superseded by OS menus (dkMenu reassigned L11921) — still used for folder-window item menu (L11501) | |
| D6 | Ghost drag `.dk-ghost` | drag from dock/rail/folder window/launcher card/Files rows | |
| D7 | Rubber band `.dk-band`, drop hint `.dk-hint` | pointer | |
| D8 | Desktop overview thumbnails `.desk .mini .m-ic` | desks panel | mini icon dots (≤10) per desktop (L11615) |

### 2.3 OS layer

| # | View | Entry | Purpose / states |
|---|---|---|---|
| O1 | Desktop context menu (multi-level `.os-menu`) | right-click desktop background (L11896) | View ▸ (Large/Medium/Small, Show icons, Show sidebar, Show widgets) · Sort by ▸ (name/type/size/date) · Align to grid ✓ · Refresh · New ▸ (Folder, App shortcut ▸ grid of installed apps, File shortcut ▸ ≤10 docs outside desktops, Text/Document/Spreadsheet/Slides) · Paste (disabled when no clipboard) · Open in terminal · Change wallpaper ▸ (canvas swatches) · Display settings |
| O2 | Item context menu (desktop icon & Files) | right-click icon/row; Files "⋯" | Open · Open with ▸ (Docs, Remotion AI, Browser) [docs only] · Share (copies fake link) · Download [docs] · Rename [not apps] · Move to ▸ (each desktop + Documents/Downloads/Images/Shared) · Copy · Cut · Duplicate · Add/Remove favourite · Delete · Get info. For app icons with OS_SOLO: + App mode, Full screen, Open in new window (L21065) |
| O3 | Window chrome `.os-win` | `osWinOpen` | title bar (icon, title, optional head, ⧉ window-menu button, minimise, maximise/restore, close), body, bottom-right resize grip `.os-rz`, 8 edge handles `.os-eh` (v55); states: focus, moving, sizing, max, snapped (`data-snap`), min (hidden), `os-off` (other desktop/workspace), `os-solo` (app mode) |
| O4 | Window menu | right-click title bar / ⧉ button (L20943) | [OS_SOLO apps: Full screen app · App mode/Exit · Open in new window ·] Snap left · Snap right · Quarter ▸ (TL/TR/BL/BR) · Maximise/Restore · Unsnap (if snapped) · Move to desktop ▸ (each desktop, "here" marker, New desktop) · Move to workspace ▸ · Show on all desktops ✓ · Minimise · Close |
| O5 | Snap preview `.os-snapv` | dragging a title bar to an edge | |
| O6 | Pop-up blocked dialog `.os-popdlg` (role=dialog, aria-modal) | `osPopout` when `window.open` returns null | URL + copy, Cancel, App mode here |
| O7 | App mode solo bar `.os-solob` | app mode | Full screen toggle, Pop-out, Exit / To desktop |
| O8 | Applications launcher window (`OSW.apps`, `.al-win`) | top-bar Apps, rail `apps`, dock `launchpad`, tray grid button, desktop app `launchpad/apps` | search, maximise, settings; left nav All / Favourites / Recent / Installed / Available + 10 categories; header title + count, Sort ▾ (name/category/recent), grid/list toggle; cards with star, glyph, name, status (Installed / Free), list mode adds category + action; empty "No apps"; installing progress bar (1.3 s fake) |
| O9 | Launcher card context menu | right-click card | Open / Install · Add to desktop · Favourite toggle · Uninstall (not for files/settings/remotionAI); for OS_SOLO apps replaced by app-mode menu + Add to desktop + Favourite (L21032) |
| O10 | Files manager window (`OSW.files`, `.fm-win`) | dock files/explorer, rail files, top-bar files, desktop app, "Get info", folders outside desktop | sidebar places (Home, Desktop, Documents, Downloads, Images, Videos, Music · Shared, Recent, Favourites, Trash) + storage meter (fake 28.4 GB base); toolbar back/fwd, breadcrumbs, search, grid/list, share, upload, delete, more; list (sortable Name/Size/Type/Modified) or tiles; detail pane (glyph, Open, ⋯, information rows, tags with add/remove); empty / no-result states; inline rename |
| O11 | Files background menu | right-click empty area / toolbar ⋯ | New folder, Upload, Paste (containers) · Sort by ▸ · View ▸ · Empty trash (in Trash) |
| O12 | Files trash item menu | right-click in Trash | Restore · Delete forever |
| O13 | Terminal window (`OSW.terminal`, `.tm-win`) | dock terminal, desktop menu "Open in terminal", desktop app | scrollback (aria-live), prompt `user@remotion:~/Desktop/...$` |
| O14 | Tray (in desktops panel) | desktops bar | current desktop name ▾ (menu: each desktop ✓, Add desktop), Apps (launcher), Show desktop (minimise/restore all + close dk-wins) |
| O15 | Sidebar peek `.rail-peek` | shown when rail hidden | re-shows rail |
| O16 | Workspace HUD `#dHud` | on workspace switch (L20885) | dots, workspace name, "N desktops · M windows" (1.6 s) |
| O17 | Desktop thumbnails with window minis `.osm` | desktops overview | draggable mini-windows; count badge `.osm-n`; drop target highlight |

---

## 3. Components (builders / reusable pieces)

| Component | Function(s) | Responsibility / variants | Line |
|---|---|---|---|
| SVG icon factory | `aiSv`, `AIX` (≈50 icons), `AI_FI` (file-type icons), `OSI`, `OIC` (≈45 icons), `osIc`, `OSA_IC`, `FOLD_IC` | inline SVG strings | L10451–L10509, L11625–L11680, L20983–L20986, L11481 |
| HTML escapers | `aiEsc`, `DKE`, `dEsc` (outside) | three duplicate implementations | L10510, L11239 |
| Light markdown | `aiMd(src)` | escapes then supports `code`, **bold**, *italic*, http(s) links (target=_blank rel=noopener), ul/ol, `#` headings → h4, fenced code; no tables/quotes | L10512 |
| Conversation model | `aiConvs`, `aiConv`, `aiTitle`, `aiSub`, `aiGroup`, `aiTime` | merges live + base + optional form conversations, filters deleted, sorts by time | L10550–L10560 |
| Message bubbles | `aiU` (user, with avatar via `aiUserAv`), `aiA` (assistant w/ spark), `aiThink` (typing dots) | | L10625–L10628 |
| Card header / link | `cardHead`, `lnk` | | L10629–L10630 |
| Demo cards | `prep1`, `prep2`, `form1`, `formEx`, `form2`, `formAtt`, `hello`, `followHTML` | | L10635–L10668, L11181 |
| Thread renderer | `convHTML`, `renderAIThread`, `renderAIHist`, `renderAIHead`, `renderAIStatic`, `renderAI` | full innerHTML re-render | L10590–L10687 |
| Popover menu | `openAIPop/closeAIPop` | items `{id,l,ic,radio,on,cls,run}` or "-" | L10718–L10733 |
| Live sampler | `aiGetSample`, `aiAsk`, `formAsk`, `wsContext`, `aiErrText` | | L10837–L10882, L11210 |
| VPH form panel | `newFormState`, `vfField`, `vfRadio`, `vfChecks`, `vfSec`, `vfPane` (5 step variants + done), `vfSrcList`, `vfTabs`, `vfFoot`, `vfSteps`, `renderForm`, `vfOrig`, `vfGoStep`, `vfFocus`, `vfRefreshCounts`, `vfAge` | | L10905–L11019 |
| Form state store (shared by panel/card/chat) | `ensureForm`, `saveForm` (250 ms debounce), `formSet`, `formSetExtra`, `formSetCert`, `formValidate` | single setter syncs both UIs | L11055–L11138 |
| Chat form card | `fcField`, `fcSecHead`, `fcSec`, `fcRing`, `fcFoot`, `fcHTML`, `fcRefresh`, `fcOpen` | | L11066–L11147 |
| Smart parsing | `parseFormText`, `sanitizeUps`, `applyUpdates`, `formStatusMsg`, `pushFormMsg`, `diffHTML`, `fmsgHTML` | | L11176–L11209 |
| Desktop glyph | `dkGlyph(it,size)` (app/folder/link/doc by extension `DK_EXT`), wrapped for yellow folders `col:"y"` | | L11244, L11755 |
| Desktop grid geometry | `dkGeom`, `dkXY`, `dkBlocked` (widgets rect avoidance), `dkFree`, `dkNearest`, `dkFix`, `dkCellAt`, `dkPlace` | pure-ish layout maths | L11280–L11326, L11430 |
| Icon renderer | `dkIconHTML`, `renderIcons` (+wrapper L12249 refreshes Files) | | L11311–L11322 |
| Desktop actions | `dkDelete`, `dkIntoFolder`, `dkAdd`, `dkRename`, `dkClone`, `dkCopy`, `dkPaste`, `dkDuplicate`, `dkMoveToDesk`, `dkSort`, `osSortDesk`, `dkOpen`/`dkOpenTarget`/`dkOpenX` | | L11409–L11458, L11862–L11927 |
| Lightweight windows | `dkWin({key,title,icon,body,w,from,cls})`, `dkWinClose` | non-registered windows (folders, quick look, trash) | L11462–L11479 |
| Ghost drag system | `dkArmGhost(selector, payloadFn)`, `dkGhostStart/Move/End` (+Files wrappers L12229–L12247) | payload kinds `app`, `kid`, `fs` | L11518–L11548 |
| Context menu (legacy) | `dkMenuShow`, `closeDkMenu` | | L11563–L11582 |
| OS menu w/ submenus | `osMenuBuild`, `osPlace` (viewport clamp, RTL), `osMenu`, `osSubOpen`, `osMenuCloseAll/From` | items `{l, ic, kbd, check, sub (array or fn), disabled, danger, run, html}` | L11682–L11731 |
| Item menu factory | `itemMenuItems(nodes, ctx)` with ctx `{root,path,open,rename,copy,dup,del,info}` | shared by desktop and Files | L11874 |
| Window manager | `osWinOpen`, `osFocus`, `osClose`, `osMin`, `osRestore`, `osMax`, `osRunMark`, `osDockBtn` | | L11806–L11851 |
| WM v55 | `osDid`, `osVis`, `osDeskApply`, `osTopWin`, `osSlideWins`, `osWsSwitch`, `osWsSave`, `osWsHud`, `osGoTo`, `osMoveWin`, `osMoveWinWs`, `osAvail`, `osSnapRect`, `osSnapShow`, `osSnap`, `osUnsnap`, `osWinDecorate`, `osWinMenu`, `osMinis` | | L20844–L20978 |
| App mode v56 | `OS_SOLO`, `osSoloKey`, `OSA`, `osAppOpen`, `osAppMode`, `osAppModeExit`, `osSoloBar`, `osAppUrl`, `osPopout`, `osPopBlocked`, `osAppMenuItems`, `osBootApp` | | L20980–L21039 |
| Full screen v56 | `osFsOk`, `osFsEnter`, `osFsExit`, `osFsToggle`, `osAppFull`, `osDeskFull` | | L21043–L21049 |
| Launcher | `alList`, `alTitle`, `alCard`, `alRenderMain`, `alBody`, `osLauncher`, `alOpenApp`, `alInstall`, `alTouch` | | L11951–L11997 |
| Files manager | `fmLoc`, `fmTypeLabel`, `fmDate`, `fmItems`, `fmPathStr`, `fmRowHTML`, `fmTileHTML`, `fmDetailHTML`, `fmCrumbs`, `fmStorage`, `fmBody`, `fmRefresh`, `fmGo`, `osFiles`, `fmSetSel`, `fmOpenNode`, `fmCtx`, `fsStrip`, `fsMove`, `fmLocOnDesk`, `fmDelete`, `dkTrashAct` (override), `fmRename`, `fmDuplicate`, `fmPasteTo`, `fmItemMenu`, `fmBgMenu` | | L12014–L12192 |
| Virtual FS | `fsData`, `FS_ROOTS`, `fsEach` (walks all desktops + roots), `fsFind`, `fsSave`, `fsSaveAll` | | L11785–L11803 |
| Terminal | `tmPrompt`, `tmBody`, `tmPrint`, `tmSync`, `osTerminal`, `tmFindIn`, `tmRun` | | L12253–L12289 |
| Tray | `renderTray` (override) | | L11938 |
| Relabel | `osRelabel` (wrapped by each app) | | L12300 |

---

## 4. Interaction inventory

Legend: F = Functional (verified end-to-end), P = Partial, S = Simulated (toast/sample/fake), D = Decorative, B = Broken, PNV = Present-not-verified.

### 4.1 Remotion AI (and form)

| # | Control / behaviour | Class | Evidence |
|---|---|---|---|
| 1 | Top-bar AI button toggles dialog | F | L10707 |
| 2 | Close button / Esc (focus inside) | F | L10763, L10889 |
| 3 | Expand/collapse (`.max`) | F | L10766 |
| 4 | History drawer button (narrow) & scrim click | F | L10765, L10770 |
| 5 | New chat (sidebar + header) — reuses empty live chat | F | L10785 |
| 6 | Filter popover (4 radio) | F | L10772 |
| 7 | Search conversations (live, highlighted) | F | L10773 |
| 8 | Ctrl/Cmd+K focuses search (opens drawer if needed) | F | L10891 |
| 9 | Select conversation (aborts running stream) | F | L10688 |
| 10 | Rename (contentEditable, Enter/Esc/blur) | F | L10775 |
| 11 | Delete conversation (animated, toast) | P — base `cmp` cannot be deleted (see §13) | L10780 |
| 12 | Share → copies thread text to clipboard (toast even on failure) | P | L10767 |
| 13 | Suggestion cards (2 demos, 2 live prompts) | F/S | L10795 |
| 14 | Composer Enter=send, Shift+Enter newline, IME-safe | F | L10738 |
| 15 | Send / Stop (AbortController) | F | L10739 |
| 16 | Attach files (≤4; text read, binary name only) + remove chip | F | L10741–L10750 |
| 17 | Chip "Use workspace" toggle (adds `wsContext()` to prompt) | F | L10753 |
| 18 | Chips Search / Summarise / Analyse insert prompt | F (prompt only; no real web search) | L10754–L10756 |
| 19 | Create ▾ (4 prompts), More ▾ (translate, explain, 2 demos) | F | L10757–L10758 |
| 20 | Live answer streaming via `window.claude` | F (depends on host capability) | L10851 |
| 21 | Error mapping / truncated notice | F | L10850, L10875 |
| 22 | Demo "prep" scripted playback (timers; cancellable by token) | S | L10811 |
| 23 | Demo "form" scripted playback | S | L10824 |
| 24 | Card links (calendar/files/tasks/doc open) → toast | S | L10797–L10800 |
| 25 | Task checkboxes (visual toggle only, not persisted) | P | L10793 |
| 26 | Copy notes, 👍/👎 (aria-pressed, not persisted) | F/D | L10801–L10802 |
| 27 | Show more / less (summary, extracted fields) | F | L10803 |
| 28 | Open form / Compare with original | F | L10804–L10805 |
| 29 | Quick replies (fill, full, orig, validate, explain, pmail, pprio) | F | L11156 |
| 30 | Form panel steps nav (click step) | F | L11035 |
| 31 | Panel tabs All/Filled/Missing | F | L11036 |
| 32 | Panel field list jump (`data-vgo`) | F | L11037 |
| 33 | Panel inputs/radios/checkboxes/textarea live-sync to chat card | F | L11021–L11031 |
| 34 | Next / Prev / Cancel / Back / Close | F | L11039–L11041 |
| 35 | Validate (missing → jump; uncertified → shake) | F | L11128 |
| 36 | Download / Save / Save draft / Save & export | S (toasts) | L11043–L11045 |
| 37 | View original overlay toggle | F | L11046 |
| 38 | Hide/show source pane | F | L11047 |
| 39 | Re-analyse (scan animation + toast) | S | L11048 |
| 40 | Chat card section accordions | F | L11152 |
| 41 | Chat card inputs/selects/certify/validate/expand/download | F (download S) | L11149–L11153 |
| 42 | Smart edits: regex parse of "poids 72, taille 178", `key: value` aliases in FR/EN/DE/AR | F | L11183 |
| 43 | "valider/validate/bestätig/اعتمد" short message triggers validation | F | L11218 |
| 44 | Free-text form questions → live model with `set_fields` tool (if `limits().tools`) | F (host-dependent) | L11223–L11233 |
| 45 | Esc closes popover → drawer → original overlay → dialog (priority chain) | F | L10886 |
| 46 | Resize / wsMenu MutationObserver → width fit | F | L10715–L10716 |
| 47 | Empty click handler on dock/rail when AI open | D (no-op) | L10893 |

### 4.2 Free desktop

| # | Control | Class | Evidence |
|---|---|---|---|
| 48 | Click/ctrl/shift select icon | F | L11346 |
| 49 | Rubber-band selection | F | L11351, L11358 |
| 50 | Drag move (grid snap, collision resolution, RTL) | F | L11360–L11381 |
| 51 | Free placement when "Align to grid" off (`fx/fy`) | F | L11377, L11765 |
| 52 | Drop on folder → move in | F | L11375 |
| 53 | Drop on dock trash → delete (animated, undo toast) | F | L11374, L11409 |
| 54 | Double-click / Enter open | F (apps without real window = S) | L11384, L11395 |
| 55 | Phone tap-select / tap-open | F | L11385 |
| 56 | Keyboard: Ctrl+A/C/X/V, F2, Delete/Backspace, ContextMenu/Shift+F10, arrows (spatial nav, shift extends) | F | L11387–L11403 |
| 57 | Click outside clears selection | F | L11405 |
| 58 | Rename inline textarea (keeps extension selected) | F | L11431 |
| 59 | Copy/Cut/Paste/Duplicate | P (cut destroys if not pasted) | L11440–L11442 |
| 60 | Move to other desktop | F | L11443 |
| 61 | Folder window: dblclick child open, context menu (open, move out, ask AI, delete) | F | L11500–L11502 |
| 62 | Quick Look: Open (toast) / Ask Remotion AI (opens AI with attachment + prompt) | S / F | L11497, L11493 |
| 63 | Window drag (dk-win header), bring to front, Esc close | F | L11471–L11480 |
| 64 | Trash: open, restore item, empty | F | L11507–L11515 |
| 65 | Ghost drag from dock/rail → create app shortcut / into folder | F | L11547 |
| 66 | Ghost drag folder-window child → desktop / other folder / trash | F | L11548 |
| 67 | Ghost drag launcher card → desktop | F | L12011 |
| 68 | OS file drop (≤12 files, text ≤200 KB stored to 20k chars) | F | L11552–L11561 |
| 69 | Legacy dk-menu (now only folder-window items) keyboard nav | F | L11581 |
| 70 | Wallpaper swatches in menu | F | L11577, L11718 |
| 71 | "Link" icon open → toast (URL never opened) | S | L11456 |
| 72 | Desktop thumbnails mirror icons | F | L11615 |

### 4.3 OS layer

| # | Control | Class | Evidence |
|---|---|---|---|
| 73 | Multi-level menus: hover-open (110 ms), click, keyboard ↑↓ → ← (RTL aware), Esc per level, resize closes | F | L11700–L11731 |
| 74 | View size L/M/S, show icons, sidebar, widgets | F | L11901 |
| 75 | Sort by name/type/size/date | F | L11922 |
| 76 | Align to grid toggle (converts fx/fy back to cells) | F | L11765 |
| 77 | Refresh (wall flash + re-render) | D/F | L11928 |
| 78 | New folder / text / doc / sheet / slides (+ auto rename) | F (empty metadata only, no content) | L11899 |
| 79 | New app shortcut (installed apps grid) | F | L11897 |
| 80 | New file shortcut (`ref`, `sc:1`) | F | L11720, L11863 |
| 81 | Paste (desktop or Files clipboard) | F | L11908 |
| 82 | Open in terminal | F | L11910 |
| 83 | Display settings → system menu Appearance | F | L11913 |
| 84 | Item menu: Open with Docs/Browser | S | L11880 |
| 85 | Share link `https://remotion.io/s/<id>` copied | S | L11881, L12167 |
| 86 | Download | S | L11882 |
| 87 | Favourite toggle | F | L11889 |
| 88 | Get info → Files detail | F | L11919 |
| 89 | Sidebar show/hide: Ctrl/Cmd+B, peek button, persisted | F | L11930–L11936 |
| 90 | Tray: desktop switch menu, add desktop, Apps, Show desktop | F | L11942–L11948 |
| 91 | Dock/rail/top-bar click opens real windows; dock toggles min/focus | F | L11854–L11860 |
| 92 | Window drag, dblclick-title maximise, grip resize, min/max/close | F | L11821–L11831 |
| 93 | Launcher: search, nav, categories, sort, grid/list, star, open, install (fake 1.3 s), uninstall, add to desktop, keyboard Enter/Space, maximise, settings | F (install S) | L11998–L12010 |
| 94 | Files: places, crumbs, back/fwd, sort headers, grid/list, search (recursive), select (click/ctrl/shift), dblclick open, Enter, Backspace up, Delete, F2, Ctrl+A/C/X/V/D/I, ↑↓(←→ grid) | F | L12158–L12213 |
| 95 | Files upload (≤12 files) | F | L12216 |
| 96 | Files tags add/remove | F | L12173, L12215 |
| 97 | Files drag rows to folder / sidebar place / desktop / trash | F | L12224–L12247 |
| 98 | Files share / download / open-with | S | L12167 |
| 99 | Files storage meter | D/S (fake base 28.4 GB) | L12060 |
| 100 | Terminal commands (12) + history ↑↓ + Tab completion + click-to-focus | F | L12265–L12297 |

### 4.4 Window manager v55/v56

| # | Control | Class | Evidence |
|---|---|---|---|
| 101 | Resize from 8 edges (min sizes, viewport clamp; disabled ≤860px/max) | F | L20917–L20928 |
| 102 | Drag to edge → snap (left/right/quarters/top=max) with preview | F | L20930–L20937 |
| 103 | Drag snapped window → restores previous size under cursor | F | L20933 |
| 104 | Title-bar context menu / ⧉ button → window menu | F | L20938–L20942 |
| 105 | Win(Meta)+←/→/↑/↓ snap/max/min cycle | F | L20956 |
| 106 | Windows belong to desktop; desktop switch slides windows | F | L20863–L20869 |
| 107 | Show on all desktops | F | L20952 |
| 108 | Move window to desktop / new desktop / workspace | F | L20896–L20902 |
| 109 | `dMoveNext/dMovePrev` actions (shortcut list) | PNV (bindings elsewhere) | L20903–L20905 |
| 110 | Focusing a window on another desktop/workspace navigates there | F | L20891–L20892 |
| 111 | Workspace switch keeps per-workspace desktops & windows, HUD | F | L20874–L20886 |
| 112 | Desktop overview minis: drag window onto another desktop / "add desktop" | F | L20973–L20977 |
| 113 | Snapped windows re-fit on resize/fullscreen change | F | L20978, L21053 |
| 114 | App mode (menu, dock/rail/launcher/desktop context menus, Ctrl+Shift+Enter) | F | L20991, L21035 |
| 115 | App mode locks drag/resize/dblclick | F | L21011–L21012 |
| 116 | Pop-out to browser window | F for lowercase keys; **B for `hrPeople`** | L21016, L21038 |
| 117 | Pop-up blocked dialog (copy link, app mode here, Esc, backdrop) | F | L21020–L21026 |
| 118 | Boot `#app=<key>` | F (lowercase keys) | L21038 |
| 119 | Full screen app (Ctrl+Alt+Enter, menus, solo bar) / whole desktop (`ACTIONS.osFullscreen`) | F (fallback toast if unsupported) | L21044–L21062 |
| 120 | Documents list refresh on `storage` from other window | F | L21041 |

**Counts (4.x)**: 120 inventoried interactions → Functional ≈ 93, Partial 5 (#11, #12, #25, #59, plus F/S mixes), Simulated ≈ 16 (#18 partially, #22–24, #36, #39, #62a, #71, #77, #84–86, #93 install, #98, #99), Decorative 2 (#47, #77/#99 shared), Broken 1 (#116 for `hrPeople`), PNV 1 (#109).

---

## 5. User journeys

1. **Open an app from the dock and manage its window** — click dock/rail icon → capture handler L11855 → `OS_OPEN[k]()` → app's `xxOpen` → `osWinOpen` (genie from button) → `osWinDecorate` (edges, ⧉). Click same dock icon: frontmost → minimise (genie to dock if `OS_DOCK` mapped, else instant hide); minimised → restore; behind → focus. Close → `o.onClose` (app saves, removes dynamic dock button). Failure: unregistered key → toast "Opened X" (Simulated).
2. **App mode / pop-out** — right-click dock icon (OS_SOLO app) → "Open in new window" → `window.open(url#app=K)`; new tab boots `osBootApp` → standalone app mode. Blocked → dialog → "App mode here" (same tab) or copy link. Exit: solo bar "Exit" / Ctrl+Shift+Enter / minimise / close. Failure: `hrPeople` pop-out boots the whole desktop instead (regex).
3. **Snap & multi-desktop** — drag title to left edge → preview → release → half-screen; Win+↑ on left → top-left quarter; window menu → Move to desktop 2 → window animates out, desktop-2 thumbnail shows mini; switching desktops slides windows; focusing it from dock jumps to desktop 2.
4. **Organise desktop files** — right-click background → New ▸ Folder → inline rename → drag docs onto folder (animated suck-in) → double-click folder → folder window → drag child back to desktop. Cancel: Esc on rename keeps old name. Delete → flies to trash → Undo toast restores (to *current* desktop).
5. **Files manager** — open Files → Documents → drag a row onto "Shared" in sidebar → moved; Trash → right-click → Restore (goes back to original root) or Delete forever (no confirmation).
6. **Ask AI about a file** — Quick Look a doc → "Ask Remotion AI" → AI opens, new chat, file attached (text content if dropped as text), prompt prefilled → Send → live streaming answer (or "live answers not available" error if no `window.claude`).
7. **Fill the VPH form from a PDF (demo)** — AI "Fill form from PDF" → scripted extraction → in-chat card shows 16/18 → type "poids 72 kg, taille 178" → regex parser applies, diff card, status "certify then validate" → tick certify → type "valider" → validated message. Alternative: "Open full form" (≥1200px) → 5-step panel → Validate. Failure: validation with missing → jump to field + toast; without certify → shake + message.
8. **Install an app from the launcher** — Apps → "Available" → click a free app → progress bar 1.3 s → "Installed" toast → click again → opens (real window only for registered apps; else toast).
9. **Terminal** — `cd Documents`, `mkdir Test`, `touch a.txt`, `ls`, `open a.txt` (Quick Look), `rm a.txt` (to trash). Unknown command → "command not found".
10. **Workspace switch** — choose another workspace → blur/scale out, desktops & windows swapped from `remotion-ws-desks` store, HUD shows counts.

---

## 6. State & persistence

### 6.1 localStorage keys (exact)

| Key | Owner line | Shape | Notes |
|---|---|---|---|
| `remotion-ai` | L10548–L10549 | `{live:[{id:"c<ts36>",at,title,sub?,msgs:[{r:"u"|"a",t,at,files?:string[],send?:string(full prompt incl. attached file text),err?}]}] (≤30), ren:{[id]:title}, del:string[], forms:boolean, formAt?:ms, form?:{v:{[field]:string},extra:{obs,act[],vph,opt[],just},cert,done,edited:string[]}, formMsgs?:[{r,t,at,diff?:[k,old,new][],st?,qr?,err?,ok?}] (≤40)}` | **RISK**: stores full attached file text (`send`) and patient form data (name, DOB, address, phone, email, diagnosis, doctor) in plain localStorage |
| `remotion-trash` | L11253 | `Item & {from:deskIndex, root?:string, at:ms}` [] (≤60) | |
| `remotion-dk-v1` | L11256 | `"1"` | first seed done |
| `remotion-dk-v2` | L11767 | `"1"` | design seed (overwrites desktop 1 items once!) |
| `remotion-dkview` | L11760 | `{size:"s"|"m"|"l", align:boolean, icons:boolean}` | |
| `remotion-fs` | L11785 | `{documents, downloads, images, videos, music, shared: Item[]}` | |
| `remotion-apps` | L11749 | `{inst, fav, recent}` | |
| `remotion-rail` | L11933 | `"1"|"0"` | rail hidden by default unless "1" (L11935) |
| `remotion-ws-desks` | L20844, L20849 | `{sel:wsIndex, st:{[ws]:{l:desks[], c:cur}}, n:workspaceCount}` | duplicates full desktop items per workspace |
| `remotion-desks` | L7749 (outside, written via `saveDesks()` everywhere here) | `{l:desks[], c:cur}`; desk = `{n, s(scene), w(widgets), items:Item[], _id}` | |
| Written by registrations | L22592 `remotion-dk-calc1`, L23803 `remotion-dk-bill1`, L24439 `remotion-dk-hr1`, L25424 `remotion-dk-pa1`, L26684 `remotion-dk-cb1`, L27210 `remotion-dk-pl1` | `"1"` | one-time desktop shortcut seeds |

**Item schema** (desktop & fs): `{id:"i<ts36><rand4>", type:"app"|"folder"|"doc"|"link", app?:K, name?, size?, mod?:ms, text?:string, url?, kids?:Item[], c?:col, r?:row, fx?/fy?:px (free mode), col?:"y" (yellow folder), tags?:string[], fav?:boolean, ref?:id (shortcut target), sc?:1}`.

No schema versioning beyond seed flags; tolerant parsing with try/catch; arrays truncated on load.

### 6.2 In-memory stores

`RAI` (L10546: open, cur, cat, q, busy, ctl:AbortController, useWs, attach[], form, max, play:token, sample:fn|null|undefined), `aiStore`, `RAI.form` (`newFormState` L10905: step, v, edited:Set, src, filter, cert, done, orig, extra), `dkSel:Set`, `dkClip`, `dkGeo`, `dkDrag`, `dkGhost`, `dkMenuEl`, `osMenus[]`, `OSW`, `OSX` (tok, ws, store, key, pend, nav), `OSA` (key, stand, fs), `AL` (view, q, sort, grid), `FM` (root, path, hist, fwd, sel, sort, view, q, detail, clip), `TM` (root, path, hist, hi), `dkView`, `alStore`, `fsData`, `dkTrash`.

### 6.3 Cross-module events / hooks

- Global function overrides (monkey-patching): `dkGlyph` (L11755), `dkMenu` (L11921), `dkOpen` (L11873), `dkOpenX` (×9 apps), `dkTrashAct` (L12130), `dkGhostMove/End` (L12230/L12238), `renderIcons` (L12249), `dkSwitch` (L12250), `renderDock` (L11620, L12299, + each app), `renderDesks` (L11619, L20970), `toggleWidgets` (L11618), `toggleIcons` (L11933), `renderTray` (L11938), `osWinOpen/osFocus/osClose/osMin/osWinMenu/osAppMenuItems/osIconMenu` (v55/v56), `gotoDesk/closeDesk/addDesk/renderWs/setDesks` (L20863–L20874, L20971), `osRelabel` (each app), temporary reassignment of `osMenu` inside wrappers (L21029, L21055, L21065).
- `ACTIONS.dMoveNext/dMovePrev/osFullscreen`, `SC_CATS` rows (shortcut list) (L20903–L20905, L21062–L21063).
- `window.__dkFree` (free placement flag, L11761), `window.__aiOn` (enables relabel in `applyLang`, set L27212).
- `storage` event listeners (cross-window) per app; Documents at L21041.
- Timers: scripted demo `aiWait` (token-cancelled), `saveForm` debounce 250 ms, install 1.3 s, ghost click-suppression 60 ms, menu hover 110/180 ms, slide 820 ms, workspace 300 ms, boot poll 100 ms×60, app-mode retry 120 ms.

---

## 7. Integrations & external dependencies

| Integration | Use | Lines |
|---|---|---|
| `window.claude.use("sample")` | obtains a sampling function `S(turns, {cache, signal, onText, tools})`; `S.limits()` probed for `tools` support | L10588, L10845–L10849, L10874, L11223–L11233 |
| Tool calling | `set_fields` tool with JSON schema `{fields: {[key]: string}}`, `execute` applies sanitized updates and returns `{changed, stillMissing}` | L11231 |
| Clipboard API | share thread, copy notes, share links, pop-up URL | L10767, L10801, L11881, L12167, L21025 |
| `document.execCommand("copy")` | fallback | L21025 |
| File API (`input[type=file]`, `File.text()`, DataTransfer files) | AI attachments, desktop drop, Files upload | L10741, L11555, L12216 |
| `window.open` (popup) | pop-out | L21017 |
| Fullscreen API (`requestFullscreen({navigationUI:"hide"})`, `fullscreenchange`) | app/desktop full screen | L21043–L21053 |
| Pointer Events + `setPointerCapture` | drag, band, resize, snap | L11341+, L11822+, L20919+ |
| HTML5 DnD (`dataTransfer` `text/x-osw`) | desktop overview minis | L20973 |
| Web Animations API (`el.animate`, `getAnimations`) | all motion, gated by `lkRM()` | passim |
| `Intl.DateTimeFormat`, `RelativeTimeFormat`, `NumberFormat` | dates/times/numbers per locale | L10560, L10633 |
| `MutationObserver` | AI width fit on wsMenu class change | L10716 |
| `ResizeObserver` | (apps' windows) | in app registrations |
| `CSS.escape` | launcher card lookup | L11996 |
| `canvas` painting (`paint`, `sceneFor`) | wallpaper swatches | L11611, L11689 |
| No network requests, no CDN in this area (FACT). External URLs only as strings: `https://remotion.io` (seed link L11269), `https://remotion.io/s/<id>` (fake share). |

Other areas read/written: `desks`, `cur`, `deskCount`, `saveDesks`, `deskName`, `gotoDesk`, `addDesk`, `closeDesk`, `setDeskWall`, `scenes`, `paint`, `sceneFor`, `drawWall`, `wall`, `shell`, `desksEl`, `renderDesks`, `setDesks`, `renderWs`, `workspaces`, `selWs`, `wsName`, `toggleWidgets`, `toggleIcons`, `setSysMenu`, `toast`, `toastUndo`, `lkRM`, `t`, `loc`, `nf`, `fmtT`, `LANGS`, `lang`, `I18N`, `FLAGS`, `UNI`, `ACCOUNTS`, `curAcc`, `roleOf`, `homeOrg`, `curUnit`, `TODAY_EVENTS`, `calIcon`, `railItems`, `dockApps`, `renderDock`, `renderTray`, `ACTIONS`, `SC_CATS`, `dEsc`; and later-defined `DC_KEY`, `DC`, `dcLoad`, `dcRender` (Documents).

---

## 8. i18n / RTL

- Languages: FR, EN, DE, AR (`LANGS`, `t()` L7507 falls back to EN then key).
- Storage: `Object.assign(I18N.<lang>, {...})` blocks (L10450) and self-installing `D` dictionaries `for(const l in D)Object.assign(I18N[l],D[l])` (L11054, L11238, L11624). v56 uses `os_*` keys defined elsewhere (UNKNOWN location, outside area). Apps use `L4("fr|en|de|ar")` pipe strings (L21374) and app-local `xxW()`.
- Key counts: AI 230/227/227/227; form-chat 22×4; desktop 60×4; OS 157×4 (no missing keys except AI's `aiCtx`, `aiLiveSys`, `aiTitle`, which are EN-only prompts/brand — intentional).
- **Hard-coded French** (not translated, INFERENCE intentional since it is a French administrative form): VPH field labels/steps (`VPH_STEPS`, `VPH_F`, L10896–L10903), radio options, section titles in `vfPane`, original paper page, live form system prompt (EN with FR form).
- Live answers: system prompt asks the model to reply in `LANGS[lang].name` (L10869, L11225).
- RTL: `dir="auto"` on user text; `[dir=rtl]` handling in grid maths (`dkGeom.rtl` mirroring columns L11290, drag deltas L11364, arrows L11400), submenu placement and arrow keys (L11705, L11728), AI fit edge (L10710), launcher position (L11985), snap arrows (L20960), slide direction (L20866), CSS `inset-inline-*`, `[dir="rtl"] .ai...` (L1762). VPH panel forced `dir="ltr"`.
- Language refresh: `applyLang` → `renderAI()`, `renderIcons(false)`, `osRelabel()` (L7991) — `osRelabel` rebuilds launcher/Files bodies (Files loses nothing since state in `FM`), relabels window controls, tray, peek; each app appends its own relabel.

---

## 9. Design tokens & motion

- Global tokens consumed: `--surface`, `--fg`, `--muted`, `--line`, `--hover`, `--chip`, `--red`, `--blue`, `--green`, `--shadow`, `--glass-strong`, `--panel-h`, `--dash`, `--spring: cubic-bezier(.2,1.25,.35,1)` (≈100 uses), `--ease: cubic-bezier(.22,.8,.24,1)` (L13–L61).
- Local custom properties: `--ai-r:16px`, `--ai-avail` (JS-computed width), stagger indices `--i`, `--j`, `--k`, colour `--c`, popover origin `--ox/--oy`.
- Accent: brand green `#22b14c` (spark, ring, quick replies), dark mode greens `#5fe08a`, `rgba(76,213,114,…)`; blue links `#2f6fe0/#6aa8ff`; priorities `#e23b3b/#f07a12/#2f8ef0`; launcher category colours (L11747).
- Keyframes (CSS L1738–L2603): `aiCard aiCaret aiDot aiFloat aiForm aiFormOut aiFormR aiIn aiMsg aiOut aiPop aiPulse aiRow aiRowR aiShim aiSpin alProg dkIn vfGlow vfInL vfInR vfRing vfScan`; plus `osPopIn` (L5153).
- JS easings: `cubic-bezier(.2,1,.3,1)`, `(.2,1.2,.3,1)`, `(.2,1.4,.3,1)` (overshoot pops), `(.55,0,.6,1)` (to trash), `(.72,0,.24,1)` desktop slide 820 ms, genie open 520 ms / min 420 ms.
- Breakpoints: 1200px (AI layout, form panel redirect), 860px (phone: AI narrow, no icon drag, windows full-width L2592, no edge handles/snap L5130), 560px (solo bar labels).
- Dark mode: `:root.dark` selectors (17 in area CSS).
- Reduced motion: `lkRM()` (L8897; user setting OR `prefers-reduced-motion`) gates all `animate()` calls; CSS `@media (prefers-reduced-motion:reduce)` at L2149, L2357, L2603, L5131.

---

## 10. Accessibility observations

| Observation | Evidence | Assessment |
|---|---|---|
| AI dialog `role=dialog` + `aria-labelledby`; AI button `aria-expanded/controls` | L10562, L10587 | good; **no focus trap**, not `aria-modal`; focus moved to input on open, back to button on Esc |
| History list `role=list/listitem` on buttons, `aria-current` | L10596 | ok |
| Thread `aria-live="polite"` — streaming rewrites innerHTML on each token | L10573, L10874 | RISK: very chatty for screen readers |
| Popovers `role=menu`, `menuitem/menuitemradio` with `aria-checked`, first item focused; no arrow-key nav in `.ai-pop` | L10721 | partial |
| Icon buttons have `aria-label` + `title` | passim | good |
| Desktop layer `role=listbox` multi, icons `role=option aria-selected`, keyboard arrows/F2/Del/ContextMenu | L11275, L11313, L11387 | good |
| OS menus `role=menu`, `menuitemcheckbox`, `aria-haspopup/expanded`, separator role, full keyboard incl. RTL | L11687, L11723 | good |
| Windows `role=dialog` + `aria-label` (non-modal) | L11813, L11464 | ok; resize handles aria-hidden; no keyboard resize/move (only Win+arrows snap) |
| Files table `role=grid` / rows `role=row` with roving tabindex, but cells lack `gridcell` role | L12042, L12067 | partial |
| Launcher cards are `div role=button tabindex=0` with nested `<button>` (star) | L11962 | RISK: nested interactive |
| Terminal output `aria-live`, input labelled | L12255 | ok |
| VPH form: labels `for=` ids, radiogroups, required asterisk visual only (no `aria-required`), missing tag text | L10913, L10917 | partial |
| Pop-up blocked dialog `aria-modal="true"` but no focus trap | L21020 | partial |
| Snap preview `aria-hidden` | L20912 | ok |
| Ghost drag / rubber band / snapping are pointer-only (keyboard alternatives exist via menus) | | ok |

---

## 11. Migration notes (Next.js App Router, TypeScript, React)

### 11.1 Patterns to replace
- innerHTML string rendering everywhere (AI thread, form, icons, menus, Files rows) → React components; escapers become unnecessary.
- ≈40 `document.addEventListener` delegations (click/dblclick/contextmenu/keydown/input/change/pointerdown/pointerover, many in capture phase with `stopImmediatePropagation`) → component handlers + one `useGlobalShortcuts` hook; ordering semantics between capture listeners (dock click L11854 vs trash L11516 vs ghost suppress L11549 vs global toast L7598) must be reproduced intentionally.
- Monkey-patch chains (§6.3) → explicit registries and event subscriptions.
- Global mutable singletons (`OSW`, `desks`, `cur`, `FM`, `RAI`…) → Zustand/Redux store slices: `windows`, `desktops`, `fs`, `apps`, `ai`, `vphForm`, `launcherUi`, `filesUi`, `terminal`.

### 11.2 Proposed `AppManifest` (replaces §1.4 recipe)

```ts
interface AppManifest {
  key: string;                       // "calcsci"
  aliases?: string[];                // ["calculator"]
  nameKey: string;                   // i18n key
  glyph: { bg: string; svg: ReactNode };
  category: LauncherCategory; installedByDefault: boolean;
  placement?: { rail?: number; dock?: number; dynamicDock?: boolean; seedDesktopShortcut?: boolean };
  window: { w: number|((vp)=>number); h: ...; minW: number; minH: number; className?: string };
  solo?: boolean;                    // app mode / pop-out / full screen
  storageKeys?: string[];            // for cross-window sync
  load: () => Promise<{ default: ComponentType<AppWindowProps> }>; // next/dynamic, ssr:false
  onClose?: () => void | Promise<void>;
}
```
One `openApp(key, {from, mode})` function replaces `OS_OPEN`, `dkOpenX` chain, `OS_DOCK`, both key chains and `osSoloKey`.

### 11.3 Routing for app mode / pop-out
Keep hash compatibility (`#app=<key>`) but implement as a route: `/os?app=<key>` or `/apps/[key]` (App Router segment rendering only that app full-window, `standalone` layout). Fix camelCase regex bug by validating against manifest keys. Cross-window sync: `BroadcastChannel` + `storage` events, or server persistence.

### 11.4 Client-only
Everything here is client-only (`"use client"`): pointer capture, Fullscreen, window.open, localStorage, Clipboard, File API, Web Animations, `window.claude`. Wallpaper canvas and geometry need `window` sizes; guard SSR.

### 11.5 Pure TS modules extractable unchanged (with types)
- `aiMd` markdown (or replace with `react-markdown` + sanitize) — L10512.
- Conversation model/grouping (`aiConvs`, `aiGroup`) — L10550–L10559.
- VPH form schema (`VPH_STEPS`, `VPH_F`, `FC_OPTS`), `newFormState`, `vfAge`, `parseFormText`, `sanitizeUps`, `formStatusMsg`, diff computation in `applyUpdates` — L10896–L10915, L11061, L11183–L11208. (Worth unit tests: regex parsing of weight/height FR/EN/DE/AR.)
- `wsContext()` prompt assembly and the `set_fields` tool schema — L10837, L11231.
- Desktop grid maths (`dkXY`, `dkBlocked`, `dkFree`, `dkNearest`, `dkFix`, `dkCellAt`, sort placement) — L11290–L11309, L11430, L11922.
- Virtual FS walkers (`fsEach`, `fsFind`, `fsMove` minus DOM, `fmLoc`, `fmItems` sort/search, `fmPathStr`) — L11797–L11802, L12018–L12038, L12110.
- Snap geometry `osAvail`/`osSnapRect` and edge-resize maths — L20908–L20910, L20921–L20926.
- Terminal command interpreter `tmRun` (make it return output lines) — L12265.
- Launcher filter/sort `alList` — L11953.

### 11.6 Suggested React decomposition
`<OsShell>` → `<Wallpaper/>`, `<TopBar/>`, `<Rail/>`, `<DesktopLayer/>` (`<DesktopIcon/>`, `<RubberBand/>`, `<DropHint/>`), `<Dock/>` (`<DockButton/>` with running/min indicators), `<WindowLayer/>` (`<OsWindow>` with `<TitleBar/>`, `<EdgeHandles/>`, `<SnapPreview/>`), `<MenuRoot/>` (portal; `<Menu items>` recursive), `<DragGhostLayer/>`, `<DesktopsOverview/>` (`<DesktopThumb/>`, `<WindowMini/>`), `<Tray/>`, `<WorkspaceHud/>`, `<PopoutBlockedDialog/>`, `<Toast/>`. Apps: `<LauncherApp/>`, `<FilesApp/>` (`<FilesSidebar/>`, `<FilesToolbar/>`, `<FilesTable/>`/`<FilesGrid/>`, `<FilesDetail/>`), `<TerminalApp/>`, `<FolderWindow/>`, `<QuickLook/>`, `<TrashWindow/>`. AI: `<AiPanel>` (`<AiHistory/>`, `<AiHeader/>`, `<AiThread>` with `<UserMsg/>`, `<AssistantMsg/>`, demo cards, `<FormCard/>`, `<DiffCard/>`; `<AiComposer/>` with `<AttachmentChips/>`, `<ContextChips/>`, `<QuickReplies/>`), `<VphFormPanel>` (`<Stepper/>`, `<SourcePane/>`, step panes, `<OriginalOverlay/>`). Hooks: `useWindowManager`, `useDesktop`, `useFs`, `useAiSampler` (wraps `window.claude`, abort, streaming), `useReducedMotion` (lkRM).

### 11.7 Security / privacy
- Health data (patient identity, diagnosis, doctor contacts) and attached file contents persisted unencrypted in `localStorage["remotion-ai"]`; desktop/file items with `text` content in `remotion-desks`, `remotion-ws-desks`, `remotion-fs`, `remotion-trash` (duplicated). RISK for a clinical product → move to server with auth, or IndexedDB + encryption, with retention.
- Workspace context sent to the model includes user name, org, site, department, events, tasks (L10840) — needs consent/disclosure.
- Live tool `set_fields` lets the model write form fields; values sanitized (whitelisted keys, enum match, numeric check, 120-char cap, L11192) — good; keep server-side validation.
- `aiMd` escapes before formatting and only allows http(s) links — safe; any React replacement must remain sanitised.
- `window.open` sets `opener=null` after opening (L21018) — prefer `noopener` feature in the call.
- Simulated: install/uninstall (no permissions), share links, downloads, storage quota, "Open with".

### 11.8 Complexity estimate
| Part | Size | Uncertainty |
|---|---|---|
| Window manager (open/focus/min/max/snap/edges/desktops/workspaces/minis/app mode/pop-out/full screen) | XL | medium (many interacting edge cases, animations) |
| App registry + migration of 9 existing apps to manifest | L | low |
| Desktop layer (grid, drag, band, ghosts, file drop, menus, trash) | L | medium |
| Files manager + virtual FS | L | low |
| Launcher | M | low |
| Terminal | S | low |
| Remotion AI (chat, history, live sampling, attachments, demos) | L | medium (depends on real LLM backend replacing `window.claude`) |
| VPH form panel + chat card + smart edits + tool calling | M–L | low/medium |

---

## 12. Counts summary

| Metric | Count |
|---|---|
| JS lines in scope | ≈2,085 (L10449–L12309 + L20843–L21067) |
| CSS lines in scope | ≈866 (L1738–L2603) + ≈46 (L5108–L5153) |
| Views / screens (§2) | 42 (AI 17, desktop 8, OS 17) |
| Dialogs / windows / overlays | AI dialog, VPH panel, original overlay, folder win, quick look, trash win, launcher, Files, terminal, pop-up-blocked dialog = 10 |
| Menus / popovers | AI filter, AI more, Create ▾, More ▾, Save ▾, desktop menu (with 6 submenus), item menu (3 submenus), Files bg/item/trash menus, launcher sort, launcher card, tray desktop menu, window menu (3 submenus), dock/rail app menu, legacy dk-menu = 16 roots |
| Components / builders (§3) | ≈150 named functions in ~45 component groups |
| Interactions inventoried (§4) | 120 — F ≈93, Partial 5, Simulated ≈16, Decorative 2, Broken 1, PNV 1 |
| Keyboard shortcuts | Ctrl/Cmd+K (AI search), Enter/Shift+Enter, Esc (layered), Ctrl/Cmd+B (sidebar), desktop Ctrl+A/C/X/V, F2, Del/Backspace, arrows, Shift+F10/ContextMenu; Files Ctrl+A/C/X/V/D/I, F2, Del, Backspace, Enter, arrows; terminal ↑↓ Tab Enter; Win+arrows; Ctrl+Shift+Enter; Ctrl+Alt+Enter = 30+ |
| localStorage keys | 10 own (`remotion-ai`, `-trash`, `-dk-v1`, `-dk-v2`, `-dkview`, `-fs`, `-apps`, `-rail`, `-ws-desks`, + writes `remotion-desks`) + 6 registration seed flags |
| Global tables of the app registry | 9 (`railItems`, `dockApps`, `DK_APPS`, `AL_APPS`, `AL_CATS`, `alStore`, `OS_OPEN`, `OS_DOCK`, `OS_SOLO`) + 2 hard-coded key chains |
| Registered real-window apps | 12 window keys: apps, files, terminal, forms, documents, calcsci, billing, hrPeople, patients, calendar, cabinet, planning (+ AI as non-window panel) |
| Integrations | `window.claude` sampling + tools, Clipboard, File API, window.open, Fullscreen, Pointer Events, HTML5 DnD, WAAPI, Intl, MutationObserver, `storage` events |
| i18n keys | 230 + 22 + 60 + 157 = 469 per language (EN) |

---

## 13. Defects / inconsistencies (current vs expected)

| # | Defect | Evidence | Current | Expected |
|---|---|---|---|---|
| 1 | Pop-out / `#app=` boot fails for camelCase keys | L21038 regex `/#app=([a-z]+)/`; `osAppUrl("hrPeople")` → `#app=hrPeople` | parses `hr` → `osSoloKey("hr")` null → new window shows full desktop (not HR) | match `[A-Za-z]+` or validate against registry |
| 2 | Base conversation `cmp` cannot be deleted | L10782 `!id.startsWith("c")` guard meant for live ids `c<ts>` | `cmp` not added to `del`, reappears immediately (toast says deleted) | distinguish live ids by `kind`, not prefix |
| 3 | Desktop "Cut" destroys items if never pasted | L11440 removes items on cut; L11441 clears clip after paste only | replacing clipboard (copy something else) or reload loses items (not in trash) | cut = mark, move on paste |
| 4 | Undo delete restores onto current desktop, not origin | L11413 uses `desks[cur]` at undo time | items appear on wrong desktop if user switched | restore to `from` |
| 5 | `OS_DOCK` missing for patients, calendar, cabinet, planning | grep: only L11807, L13568, L15418, L22567, L23790, L24424 | no running dot / min state on their dock buttons; minimise hides instantly (no genie), restore not animated | add mapping (manifest) |
| 6 | Dock key chain falls back to `"apps"` | L11857 | unknown OS_OPEN key (e.g. `calculator`) toggles the launcher window if open | derive from registry |
| 7 | Uninstall doesn't affect dock/rail/desktop | L12010 sets `inst=0`; rail/dock render from static arrays | uninstalled app still launchable from rail/dock/desktop | hide or prompt install |
| 8 | Dock "Settings" vs desktop "Settings" behave differently | L7598 toast vs L11869 `setSysMenu(true)` | dock shows "Opened Settings" toast only | open system settings |
| 9 | Share in AI shows "Copied" even on clipboard failure | L10767 both branches toast `aiCopied` | misleading | error toast |
| 10 | `nFilled` footer always shows initial auto-filled count | L10963 uses constant `VPH_AUTO` | doesn't reflect user edits (missing count does) | possibly intentional ("auto-filled") — INFERENCE |
| 11 | Task checkboxes / 👍👎 in AI cards not persisted | L10793, L10802 | reset on re-render | persist or mark decorative |
| 12 | `osAppMode` retries forever if app never creates its window | L20991 `setTimeout(...,120)` without bound | possible infinite timer | bounded retry |
| 13 | `aria-live` thread re-announces on every streamed token | L10573 + L10874 innerHTML rewrite | screen-reader noise | announce on completion |
| 14 | Launcher card: nested interactive (button inside role=button) | L11962 | a11y violation | separate controls |
| 15 | Delete forever in Files Trash has no confirmation | L12125 | irreversible | confirm |
| 16 | `remotion-dk-v2` seed overwrites desktop 1 items once on upgrade | L11774 assigns `desks[0].items=[...]` | user items placed before v2 on desktop 1 are discarded | merge |
| 17 | Duplicate persistence of desktop items (`remotion-desks` + every workspace in `remotion-ws-desks`) | L7749, L20849 | double storage, possible divergence | single source |
| 18 | Empty no-op listener | L10893 | dead code | remove |
| 19 | Three duplicate HTML-escape helpers and two key-normalisation chains | L10510, L11239, L11857 vs L20981 | drift risk (already drifted: `calculator`) | single util |
| 20 | Link items never open their URL | L11456 | toast only | `window.open(url,'_blank','noopener')` |
