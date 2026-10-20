# 01 — Remotion Desktop OS: Shell Core (inventory, read-only audit)

Source: `source/Remotion_Desktop.html` (single file). All `Lnnnn` refs are FILE line numbers.
Labels: **FACT** (read in code), **INFERENCE** (reasoned, not executed), **RISK**, **UNKNOWN**.

---

## 1. Scope & line ranges

| Part | File lines | Notes |
|---|---|---|
| JS – translations (`LANGS`, `I18N`, `Object.assign` packs) | L7179–L7504 | 4 languages × 777 keys (see §8) |
| JS – `lang`, `t()`, `loc()`, `nf()` | L7505–L7509 | core i18n helpers used by every other area |
| JS – wallpaper painter (procedural canvas) | L7511–L7593 | `scenes` (5 day), `nightScenes` (5), `paint()`, `drawWall()` |
| JS – toast | L7595–L7598 | + `toastUndo` at L10067 |
| JS – rail | L7600–L7616 | |
| JS – workspace menu | L7618–L7636 | |
| JS – language menu, `fitTop`, `isOverlay`, `switchLang` | L7638–L7681 | |
| JS – clock / forecast / calendar widget | L7683–L7721 | |
| JS – dock | L7723–L7742 | |
| JS – desktop panel / virtual desktops (slide, HUD, tray, rename, ctx menu, swipe) | L7744–L7968 | |
| JS – global close, `applyLang` | L7971–L8004 | |
| JS – on-screen keyboard + quick note | L8005–L8386 | |
| JS – keyboard menu | L8388–L8521 | |
| JS – shortcut catalogue, ACTIONS, shortcuts panel, recorder | L8523–L8685 | |
| JS – system (gear) menu | L8687–L8798 | |
| JS – search palette | L8800–L8872 | |
| JS – lock screen | L8874–L9067 | |
| JS – sign-in screen | L9068–L9252 | |
| JS – registration wizard (5 steps) | L9254–L9899 | |
| JS – boot / power (restart, shutdown) | L9901–L9912 | |
| JS – global shortcut handler | L9914–L9924 | |
| JS – notification center, banners, reminders | L9926–L10197 | |
| JS – account menu, org units, sign-out, auto-away | L10199–L10408 | |
| JS – theme (light/dark/auto) | L10410–L10447 | `applyKbSet();setKbPos(...)` at L10410 |
| Boot call (outside range, but drives the shell) | L27212–L27215 | `window.__aiOn=true; applyLang(lang); drawWall(); if(innerWidth<860)setWs(false)` |
| Markup | L6857–L7177 (321 lines) | ids below |
| CSS | ~L5–L1737 | sections: L6 layout/tokens, L66 theme VT, L70 lang VT, L120 top bar, L135 popovers, L152 ws menu, L163 widgets, L233 dock, L241 desk panel, L262 quick note, L272 OSK, L341 top-bar extras, L359 kb menu, L407 shortcuts dlg, L423 rail extras, L438 palette, L459 sys menu, L471 kb settings, L488 shortcuts panel, L533 tray, L539 lock/power, L730 kb wave, L740 notification center, L885 banners, L915 account menu, L973 sign-in, L1108–L1602 registration, L1603 virtual desktops, L1691 org units. (`.top.c1…c10` fit-classes live outside, ~L6812+.) |

**Main markup ids** (FACT, markup.html): `wall`, `shell`, `.top`, `wsBtn`, `wsLabel`, `deskBtn`, `searchBtn`, `langBtn`, `langCode`, `langMenu`, `themeBtn`, `bellBtn`, `bellBadge`, `kbBtn`, `sysBtn`, `accBtn`, `whoAv/whoName/whoRole/whoTxt`, `.main`, `rail`, `wsMenu`, `wsList`, `addWs`, `.widgets` (weather `temp/time/date/fore`, today `evCount`, calendar `prevYear/prev/next/calTitle/calGrid`, notes `noteNew/noteForm/noteInput/n3d`, tasks `t1…t5/t5d`), `dock`, `scrim`, `desks`, `toast`, `nc` (`ncTitle, ncMarkAll, ncMore, ncExpand, ncSearch, ncPri, ncCatsRow, ncCats, ncCatMore, ncScroll, ncDetail, ncSet`), `nbStack`, `accMenu/accVp`, `kb` (`kbTop, kbFloat, kbSugg, kbMore, kbMic, kbPad, kbKeys`), `kbPop`, `kbMenu/kbmVp`, `scDlg` (`scTitle, scSearch, scClose, scNav, scBody`), `sysMenu/sysVp`, `palette` (`palInput, palList`), `lock` (`lockTime, lockDate, lkCard, lockAv, lockName, lockRole, lkForm, lkPass, lkEye, lkMsg, unlockBtn, lkQuote, lkThumb, lkQ, lkSwitch, lkLang, lkLangCode, lkA11y, lkPower`), `si` (`siLang, siLangCode, siTheme, siQuote, siThumb, siQ, siPanel, siScroll`), `rg` (`rgLang, rgLangCode, rgTheme, rgQuote, rgQBg, rgQ, rgCard, rgSteps, rgBody, rgOut, rgArt, rgSlide, rgSlideT, rgSlideS, rgDots`), `power` (`powerSpin, powerMsg, powerOn`). Runtime-created: `dHud` (L7803), `.dctx`, `.kb-var`, `.lk-pop`, `.si-pop`, `.nc-pop`, `.nbn`, `#wallOld`.

---

## 2. Screens / views / sub-pages

States legend: L=loading/busy, E=empty, Er=error, S=success, PD=permission-denied.

| # | View | Entry point | Purpose | States / notable content |
|---|---|---|---|---|
| 1 | Desktop shell (top bar, rail, widgets, dock, wallpaper) | default after `applyLang` at L27213 | home surface | Boot animation `.boot` (L9901). Top bar auto-compacts via `fitTop()` c1..c10 (L7649). Widgets: weather (static 18°C/forecast L7695), clock (Africa/Tunis tz L7684), Today events (static, `evCount` = 3 L7999), mini calendar (L7704), Quick notes (L8378), Tasks (static checkboxes). |
| 2 | Workspace menu (`#wsMenu`) | `wsBtn` (L7636), OSK Win key (L8234), Ctrl+Alt+W | switch/add workspace | **Open on first load on desktop** (markup has no `.closed`, L27215 closes only if <860px). List of 5 seeded workspaces + "Workspace N". E: n/a. |
| 3 | Language menu (`#langMenu`) | `langBtn` (L7644) | switch UI language | 4 items, check mark on current. |
| 4 | Desktop panel (`#desks`, slide-up footer) | `deskBtn` (L7800), Ctrl+Win+Tab, sys menu "Overview" | virtual desktop overview | Thumbnails painted on canvases (L7772), sliding selection ring (L7774), "Add desktop" tile, tray (search, network, volume, battery L7783). Max 12 desktops (L7839) → toast `dskMax`; last desktop cannot close → toast `lastDesk` (L7851). |
| 5 | Desktop context menu (`.dctx`) | right-click / ContextMenu key / Shift+F10 on thumb (L7941, L7949) | rename, wallpaper (5 swatches), new, close | Close disabled when 1 desktop (L7893). |
| 6 | Desktop switch HUD (`#dHud`) | any `gotoDesk`/close of current | shows dots + name + "n of m" | auto-hides 1.4 s (L7808). |
| 7 | Inline desktop rename | dbl-click name, pen, F2, ctx menu (L7864) | rename (max 32) | Enter save / Esc cancel / blur save; empty or default → reset to default name (L7876). |
| 8 | On-screen keyboard (`#kb`) | `kbBtn` menu, Ctrl+Shift+K, palette action, lock a11y "OSK" | virtual typing into focused field | Modes: docked / floating (draggable by top bar L8367) / full; QWERTY/AZERTY/QWERTZ/Arabic/number pad; suggestion bar (7 per page), mic (toast only L8266). Lifts `.main` above the keyboard (L8328). |
| 9 | Accent variants popup (`.kb-var`) | long-press letter 420 ms (L8295) | pick accented char | slide-select via pointermove (L8300). |
| 10 | Key preview bubble (`#kbPop`) | touch/pen press with hints on (L8294) | magnified key | |
| 11 | Keyboard menu – main / settings / input-language / layout views | `kbBtn` (L8471) | OSK toggle, shortcuts, settings | Settings: active layout select, size 80–120%, theme L/D/Auto, hints, sound, auto-hide, transparency 40–100%, position dock/float/full, suggestions, auto-capitalise, double-space period (L8425–L8433). |
| 12 | Keyboard shortcuts dialog (`#scDlg`) | Ctrl+/ , kb menu, sys menu, palette | browse/search shortcuts, create custom | Category nav (13 cats + "All"), search with highlight, E: `scNone` (L8645), custom card with E `customEmpty`, recording state (L8676). |
| 13 | System menu (gear) – 8 views: main, appearance, language, workspaces, desktops, ai, info, news | `sysBtn` (L8763), Ctrl+, , account menu items | global settings | `settingsApp`/`help`/AI rows → "not in preview" toasts (L8771–L8776). Info view reads real UA/screen/tz/online (L8738). |
| 14 | Search palette (`#palette`) | `searchBtn`, Ctrl+K, Ctrl+Shift+F, rail "+" (`data-act="add"` L8872), tray search | launcher / command palette | Clip-path "grow from search bar" (L8810). Groups: suggested / apps / actions / shortcuts / items (notes & tasks). E: `searchNone` (L8848). |
| 15 | Lock screen (`#lock`) – faces: **auth** (password), **pin**, **users** (switch user), **sso**, **passkey** | Ctrl+Alt+L, sys/account menu "Lock", palette | re-auth | L: spinner on unlock (L8915), Er: wrong password/PIN/empty (L8914, L8949), lockout 30 s after 5 fails (L8921), CapsLock warning (L8936), S: "Welcome X" (L8929). Extra states: `glance` (clock only after 25 s idle, L9015), `sleep` (L9021), `signout` class (L9059), large text / high contrast / reduced motion (`lkSet`, L8896). Quote card (4 quotes) with painted thumb (L8980). |
| 16 | Lock bottom-bar popovers: language, accessibility, power | `lkLang`, `lkA11y`, `lkPower` (L8998–L9006) | | Power: sleep / restart / shutdown. |
| 17 | Sign-in screen (`#si`) – main (tabs Email / SSO / Passkey) | sign-out (L10397), account "Add account" (L10381), "Sign in" link from registration (L9835) | full sign-in | Provider tiles (Microsoft Entra, Google Workspace, Apple, Passkey), collapsible "government ID" section (Pro Santé Connect, FranceConnect, European eID). Er: invalid email, empty/short password, SSO domain needed, lockout 30 s after 5 fails (L9162). L: busy button text. S: "Welcome" then `hideSignin` → boot. |
| 18 | Sign-in – reset password screen + "check your inbox" done state | "Forgot?" (L9225) | | Er: invalid email; S: `siDone` card (L9180). |
| 19 | Sign-in / registration language popovers (`.si-pop`) | `siLang` (L9237), `rgLang` (L9889) | | |
| 20 | Registration wizard (`#rg`) step 1 **Account** | "Create one" in sign-in footer (L9227) | method email / gov / SSO (+ Google/Microsoft/Apple social) | Sub-states: gov list, SSO domain form, "verified with X" note (noPass), password meter + 3 rules (L9325), terms checkbox. |
| 21 | Step 2 **Profile** | Next | photo (drag-drop/FileReader ≤5 MB png/jpg/webp), names, read-only email, profession (6), role (3), RPPS (optional, 11 digits; hidden for admin), phone with country code (11 countries), preferred language, time zone (all IANA zones) | Er per field. |
| 22 | Step 3 **Organization** – modes invite / identifier / create | Next | join org | Invite code regex (L9490); SIRET/SIREN/RPPS identifier (9/11/14 digits); "detect" → fake directory lookup (`ORG_DIR`, 3 sample orgs L9412, hash-pick L9420) → found card with "sample data" tag; create form with ID type + "look up" prefill (L9507), URL normalisation (L9651). |
| 23 | Step 4 **Verification** | Next | code by email / WhatsApp / SMS, or magic link | 6-box OTP (paste/arrow/backspace), resend countdown 60 s (L9676), change e-mail inline edit, "need phone" error with jump to step 2 (L9701), link channel auto-verifies after 3.2 s (L9709). Verified-by-provider variant skips code (L9540). **Any 6 digits accepted** (L9688). |
| 24 | Step 5 **Review** | Next | summary cards with "Edit" jump-backs; ToS / Privacy / DPA checkboxes | Er: `rvTermsNeed` (L9764). |
| 25 | Registration "Creating…" progress → "Created" success | Create (L9775) | 3 animated progress rows then success card with "Open workspace" | `finishRegister` (L9791) persists new account(s). |
| 26 | Registration right carousel (3 slides, 6 s autoplay, pause on hover) + quote card | always visible ≥1400px (CSS L1382/L1383 hide on narrow) | marketing | |
| 27 | Notification center (`#nc`) – list + detail + settings | `bellBtn` (L10116), Ctrl+Shift+N, banner click, account menu | inbox | Filters: priority chips (all/unread/critical/high/normal/low), category chips (6), search, Ctrl/Cmd+F focus (L10121). E: `ncEmpty` (L10019), detail E `selectNotif` (L10035). Wide mode toggle (L10142). Mobile ≤900px: detail as overlay (`detail-open`). |
| 28 | NC item menu / "more" menu (`.nc-pop`) | `⋯` on item, header `⋯`, detail `⋯` | mark read/unread, snooze, delete; mark all, clear read, settings | Undo toasts. |
| 29 | Desktop notification banners (`#nbStack`) | `pushNc`/snooze wake/settings test | transient banners (max 3, 6 s) | Silenced by DND / quiet hours (22–07) except critical (L10170). |
| 30 | Account menu – views main (with status list), profile, profiles, accounts, units | `accBtn` (L10368) | identity, status, profile/role, org switch, location & department | Busy state on unit switch (L10293). |
| 31 | Power screen (`#power`) | restart / shutdown / sign-out | | restarting (2.3 s), shutting down → "powered off" + Power-on button (L9908), signing out (1.1 s). |
| 32 | Toast (`#toast`) and undo toast | everywhere | | 1.6 s plain, 4.5 s with Undo (L10067). |
| 33 | Quick note composer (`#noteForm`) | Notes "+" (L8377), Ctrl+Alt+N, OSK with no target (L8121) | add note to widget (max 4 shown) | E: ignores empty (L8379). Not persisted. |

**Totals**: 33 top-level views/overlays; 8 system-menu views; 5 account views; 4 keyboard-menu views; 5 lock faces + 3 lock popovers; 3 sign-in tabs + 2 reset states; 5 wizard steps + 2 final states.

---

## 3. Components (builders and reusable pieces)

| Component / function | Responsibility | Variants | Line |
|---|---|---|---|
| `t(k,vars)` | i18n lookup with `{var}` replace, EN fallback, key fallback | — | L7507 |
| `nf(n)`, `loc()` | locale number formatting / BCP47 | — | L7508–L7509 |
| `paint(cv,scene,w,h)` + `rng(seed)` | deterministic procedural landscape (sky, stars/moon, clouds, ridges with snow, lake glints, trees, hills, 2,200 flowers) | 5 day + 5 night palettes | L7529, L7528 |
| `drawWall()` | paints `#wall` at DPR≤2 for current desktop | debounced on resize 150 ms | L7592 |
| `toast(m)` / `toastUndo(msg,undo)` | status toast; undo action | plain / action | L7597, L10067 |
| `renderRail()` | rail buttons from `railItems` (8 + "add") | calendar icon shows today's date | L7614 |
| `renderWs()` | workspace list (menuitemradio) | named vs numbered | L7629 |
| `renderLangMenu()` | language list | | L7640 |
| `fitTop()` | progressive top-bar compaction classes c1..c10 | | L7649 |
| `switchLang(next)` | language switch with View Transition / WAAPI fallback / reduced-motion instant | overlay-aware (`vt-ov`) | L7662 |
| `applyLang(l)` | sets `<html lang dir>`, re-renders everything ([data-i18n], -aria, -ph) and calls into other areas | | L7979 |
| `tick()` | top-bar & lock clock/date | 10 s interval | L7684 |
| `renderFore()` | 5-day forecast (static temps) | | L7695 |
| `renderCal()` | month grid, today, event dots | | L7704 |
| `renderDock()` | dock (13 apps + trash) | **monkey-patched 10×** elsewhere (L11620, L12299, L13590 …) | L7740 |
| `deskHTML(i)` / `renderDesks()` | desktop thumbnails, add tile, tray | patched L11619, L20970 | L7760, L7764 |
| `paintThumbs()`, `placeSel()`, `markOn()` | thumb canvases, sliding ring | | L7772–L7831 |
| `renderTray()` | search, net, volume, battery | | L7783 |
| `showDeskHud()` | switching HUD | | L7804 |
| `slideSpace(dir)` | macOS-Spaces-like wallpaper/content slide (820 ms) | RM: fade | L7811 |
| `gotoDesk/addDesk/closeDesk` | virtual desktop CRUD | patched L20863/L20871/L20870 | L7832/L7838/L7849 |
| `startRename/endRename` | inline rename | | L7864/L7873 |
| `openDctx/closeDctx/setDeskWall` | context menu & wallpaper swap with cross-fade | | L7885/L7884/L7903 |
| `closeAll()` | closes ws/lang/desks/kb/sys/search/nc/acc menus | | L7972 |
| `buildKeys/renderKb/refreshKeys/keyBtn/keyLabel/keyAria/charFor` | OSK model → DOM | layouts ×4 + pad | L8059–L8114 |
| `insert/typeChar/backspace/move/space/enter/ctrlCombo/autoCap` | text editing on target field (setRangeText) | | L8123–L8185 |
| `candidates/updateSugg/pickSugg/acceptTop` | word suggestions (learned Map + per-language lexicon `WORDS`) | | L8243–L8263 |
| `relayout(fn)`, `kbThemeWave()` | animated layout/theme swap | | L8200, L8215 |
| `openKb/closeKb/toggleKb/setKbPos` | OSK lifecycle | dock/float/full | L8339–L8360 |
| `renderKbMenu()` | 4 views | | L8406 |
| `showView(name,dir,instant,vp)` | **shared** sliding multi-view menu engine (kb, sys, account menus) | | L8452 |
| `placeKbMenu()` / `placeMenu(menu,btn,shift)` | popover positioning with caret `--cx` | | L8446 / L8746 |
| `backHead(title)`, `sysItem()`, `accItem()`, `kbdsOf()` | menu row builders | | L8404, L8701, L10243, L8690 |
| `SC_CATS` / `comboKeys/parseCombo/comboMatches/comboFromEvent` | shortcut catalogue & matching (Mac ⌘→Ctrl mapping) | | L8524–L8572 |
| `ACTIONS` / `runRow` | action registry (extended elsewhere: L20903, L20904, L21062) | | L8579, L8602 |
| `renderScNav/renderScBody/rowHTML/customCard/hl` | shortcuts panel | | L8611–L8646, L8610 |
| `renderSysView(name)` | 8 system views | | L8703 |
| `palData/renderPalette/palMove/palRun` | palette data & list | | L8824–L8858 |
| `showFace(name,dir)` | lock-card face switcher with height morph | | L8899 |
| `renderPin/pinPress`, `renderLkUsers/lkPickUser`, `renderSso/ssoGo`, `renderPasskey/startPasskey` | lock faces | | L8938–L8977 |
| `lkPop(btn,html,onClick)` | lock bottom-bar popover | | L8988 |
| `armIdle/glance/sleepLock/wakeLock` | lock idle states | | L9015–L9022 |
| `lockScreen()/unlock()` | lock lifecycle (sets `shell.inert`) | | L9045/L9058 |
| `siViewHTML/siMainHTML/siResetHTML/renderSi` | sign-in renderers | email/sso/passkey/reset | L9090–L9118 |
| `siSubmit/siTile/siSuccess/showSignin/hideSignin` | sign-in flow | | L9152–L9214 |
| `field()/select()/eyeBtn()/navBtns()/ccSelect()` | registration form builders | | L9343–L9350, L9442 |
| `stepAccount/stepProfile/stepOrg/stepVerify/stepReview` (`STEP_FN`) | wizard step renderers | | L9352–L9601 |
| `methBody/rppsBlock/orgBody/foundCard/vTarget/vCodeArea` | sub-part renderers swapped with `swapPart()` | | L9361…L9533, L9617 |
| `pwCheck/updPw` | password strength (4 levels, 3 rules incl. common-word & name/email check) | | L9325/L9334 |
| `collect/validate/goStep/rgFail/orgErr` | wizard state & validation | | L9621–L9660 |
| `tzList/tzLabel` | IANA zones sorted by offset (cached) | | L9307/L9317 |
| `lookupOrg/detectOrg/lookupCreate/clearFound` | simulated org directory | | L9420–L9515 |
| `sendVia/startResend/paintResend/codeChanged/markVerified/swapVerify` | verification channel logic | | L9671–L9712 |
| `setPhoto(file)` | FileReader → dataURL avatar | | L9739 |
| `createAccount/finishRegister` | creation animation; persist accounts | | L9775/L9791 |
| `renderSlide/autoSlide/renderRgQuote/renderLkQuote/renderSiQuote` | carousel & quote cards (canvas thumbs via `paint`) | | L9805–L9817, L8980, L9215 |
| `boot/powerScreen/restartOS/shutdownOS` | boot & power | | L9901–L9911 |
| `ncFiltered/renderCounts/renderNcList/renderNcDetail/renderNcSet/renderNc` | notification center (FLIP list animation) | | L9997–L10054 |
| `selectNc/setRead/removeAnim/deleteNc/snoozeNc/installUpdate/runPrimary/ncPop/itemMenu` | NC actions | | L10055–L10107 |
| `chime()`, `keyClick()` | WebAudio sounds | | L10164, L8050 |
| `showBanner/pushNc/checkReminders` | banners & reminders (public API `pushNc` used by other areas, e.g. L24522) | | L10169/L10183/L10187 |
| `avatarHTML/paintAvatar/renderWho` | avatar with status dot | org / photo / initials | L10231/L10234/L10235 |
| `unitsView/toggleSite/switchUnit/curUnit/homeOrg/unitsOf` | location & department picker | | L10263–L10301 |
| `renderAccView/renderAcc/setAccMenu/toggleStatusList/setStatus/switchProfile/switchAccount` | account menu | | L10302–L10367 |
| `signOut/bumpActivity` | sign-out, auto-away | | L10397/L10403 |
| `setTheme/animateTheme/setThemeMode/systemDark` | theme engine (circular VT reveal) | | L10414–L10443 |

Icon dictionaries (inline SVG strings): `wsIcons` L7619, `DKI` L7752, `ICON` L8027, `MI` L8392, `CAT_IC` L8539, `SI` L8691, `PI` L8819, `LKI` L8882, `SII` L9074, `RGI` L9261, `FLAGS` L9284, `PFI` L9379, `OI` L9425, `VI` L9517, `RVI` L9553, `NI` L9927, `AI` L10200, `UNI` L10245 → **18 icon maps**.

Component count: ~150 named functions/builders in range (≈95 listed above grouped), 18 icon maps.

---

## 4. Interaction inventory

Classification: **F** Functional (read end-to-end) · **P** Present-not-verified · **Pa** Partial · **B** Broken · **D** Decorative/toast-only ("not in preview"/"X opened") · **S** Simulated (fake backend/sample data).

### 4.1 Top bar & desktop
| Control | Behaviour | Class | Line |
|---|---|---|---|
| Workspace button | toggle ws menu (closes others) | F | L7636 |
| Workspace item | select, toast "Switched to" (workspace → desktop-set swap implemented in another area L20874) | F | L7633 |
| Add Workspace | appends "Workspace N" (not persisted here) | F (in-memory) | L7634 |
| Workspace settings gear (`data-t="wsSettings"`) | toast "opened" only | D | markup 42, L7598 |
| Desktops button | toggle panel | F | L7800 |
| Nav "Apps"/"Files" (`data-t`) | toast "X opened" + other area's OS_OPEN opens real window (L11855) | P (cross-area) | L7598 |
| Search bar | open palette | F | L8859 |
| Language button/menu item | switch language with animation | F | L7644–L7648 |
| Theme button | toggle light/dark (persist) | F | L10444 |
| AI button (`data-t="ai"`) | toast; AI area handles separately | P | markup 27 |
| Bell | ring anim + toggle NC | F | L10116 |
| Keyboard button | kb menu | F | L8471 |
| Gear | system menu | F | L8763 |
| Account (who) | account menu | F | L10368 |
| Rail items (8) | toast "opened" (+ OS_OPEN window where defined) | D/P | L7614, L7598 |
| Rail "+" | open palette | F | L8872 |
| Dock items (14) | toast "opened" (+ OS_OPEN where defined) | D/P | L7741 |
| Widget "⋯"/options/new event/new task buttons (`data-t`) | toast only | D | markup 57/68/105 |
| Calendar ◀ (prevYear) / ◀ / ▶ | month navigation; **prevYear also only −1 month** | Pa | L7720–L7721 |
| Calendar day buttons | no handler | D | L7716 |
| Notes "+" | open composer | F | L8377 |
| Note submit | prepend note (max 4), not persisted | F (in-memory) | L8378 |
| Task checkboxes | native checkbox only; no state | D | markup 108–112 |
| Window resize | re-paint wallpaper, fitTop, menus reposition | F | L7593, L7654 |
| Two-finger horizontal wheel/trackpad swipe on desktop | switch desktop (threshold 150, 850 ms lock, RTL aware) | F | L7960 |

### 4.2 Desktop panel
| Control | Behaviour | Class | Line |
|---|---|---|---|
| Thumbnail click | `gotoDesk` + slide + HUD | F | L7937 |
| Add desktop tile | add (≤12), unused scene chosen | F | L7931, L7838 |
| × on thumb | close with undo | F | L7934, L7849 |
| Pen / name click / dbl-click / F2 | rename inline | F | L7935–L7947 |
| Keyboard ←/→/Home/End/Delete/Backspace/ContextMenu/Shift+F10 | navigate / close / ctx menu | F | L7942–L7949 |
| Context menu: rename / 5 wallpapers / new / close; ↑↓/Tab/Esc | | F | L7918–L7928 |
| Drag panel down >46 px | close | F | L7952 |
| Scrim click | close | F | L7801 |
| Tray search | open palette | F | L7933 |
| Tray volume | toggles `kbSet.sound` (key-click sound — not system volume) | Pa | L7933 |
| Tray network / battery | live `navigator.onLine` / Battery API display | F | L7781–L7790 |

### 4.3 On-screen keyboard & menu
| Control | Class | Line |
|---|---|---|
| Character keys (commit on release), modifiers on press, auto-repeat for ⌫/arrows (420 ms then 55 ms) | F | L8287–L8311 |
| Long-press accent picker | F | L8295, L8276 |
| Shift (one-shot), Caps (lock), Ctrl combos (A select, C/X clipboard, V → toast "paste not available", Z/Y execCommand undo/redo) | F / Pa (paste) | L8142–L8153 |
| Alt+Shift cycles input language | F | L8229 |
| AltGr → first accent variant; Fn → symbol row | F | L8082 |
| Win key → toggles workspace menu | F | L8234 |
| Tab → accept top suggestion else insert spaces/tab | F | L8226 |
| Enter → textarea newline or `form.requestSubmit()` | F | L8181 |
| Double-space → ". " (not Arabic) | F | L8178 |
| Auto-capitalisation (start / after .!?) | F | L8126 |
| Suggestions click / "more" paging | F | L8264–L8265 |
| Mic button | D (toast `kbMic`) | L8266 |
| Pad toggle | F | L8269 |
| Float/dock toggle; drag when floating | F | L8361, L8367 |
| Auto-hide on blur | F | L8363 |
| Physical keyboard mirrors key press highlight; CapsLock sync; Esc closes | F | L8318–L8324 |
| Tab+Enter activation of on-screen keys (e.detail===0) | F | L8312 |
| Kb menu: toggle, shortcuts, settings/lang/layout views, switches (6), theme segment, position buttons, 2 ranges, layout select; ↑↓/→/← navigation | F | L8473–L8519 |

### 4.4 Shortcuts (catalogue L8524; global handler L9915)
56 catalogue rows (2 display-only) → 54 bindable rows, **49 unique combos**; 29 rows have a shell action; after cross-area patches (L20905) **31 functional**, **23 toast "not in preview"** (D): aiOpen×2, lastApp, cycleApps, pinApp, quitApp, openFiles, openDocs, winMin, winMax, snapL, snapR, arrangeIcons, addTask, aiAsk, aiSummarize, openMsgs, startCall, newMsg, toggleMute, textBigger, textSmaller, textReset. Duplicate combos: Ctrl+K ×4 rows, Ctrl+Alt+A ×2, Ctrl+Shift+F ×2 (FACT, node evaluation of `SC_CATS`). Additional rows `os_solo`, `os_fsApp` appended by another area (L21063).

| Shortcut panel control | Class | Line |
|---|---|---|
| Category nav (animated indicator) | F | L8657 |
| Search filter + highlight | F | L8663 |
| Record custom combo (requires Ctrl/Alt/Meta; rejects taken combos; Esc cancels) | F | L8676 |
| Save custom (persist), remove custom | F | L8669, L8666 |
| Close (×, scrim click, Esc) | F | L8655–L8656, L9918 |

### 4.5 System menu (8 views)
| Item | Class | Line |
|---|---|---|
| Settings (app) | D (`notInPreview`) | L8771 |
| Keyboard shortcuts | F | L8774 |
| Appearance: theme segment L/D/Auto; show widgets / icons / navbar switches | F | L8777–L8783 |
| Language view items | F | L8784 |
| Workspaces view: select / add | F | L8785, L8774 |
| Desktops view: select / add / overview | F | L8786, L8774 |
| AI view (3 rows) | D | L8776 |
| System info (real browser data) | F | L8738 |
| Help | D | L8772 |
| What's new (6 static items) | F (static) | L8742 |
| Lock / Restart / Shut down | F (Restart/Shutdown = S: in-page power screen only) | L8774 |
| ↑↓ / → enter sub-view / ← back | F | L8788 |

### 4.6 Search palette
| Control | Class | Line |
|---|---|---|
| Type to filter (accent-insensitive), ↑↓, Enter, hover-select, click | F | L8860–L8868 |
| App results → toast "opened" only | D | L8828 |
| Action results (theme, OSK, shortcuts, new note, new desktop, overview, widgets, lock, languages) | F | L8829–L8838 |
| Shortcut results → `runRow` | F/D per row | L8841 |
| Notes/Tasks items → reveal & flash in widget | F | L8842 |
| Outside click / Esc closes; OSK Enter runs highlighted item (fake `form` property) | F | L8869, L8871 |

### 4.7 Lock screen
| Control | Class | Line |
|---|---|---|
| Password submit — **any value ≥4 chars unlocks**; <4 → error; 5 fails → 30 s lockout | S | L8912–L8927 |
| Eye toggle (keeps caret) | F | L8935 |
| CapsLock warning | F | L8936, L9043 |
| PIN pad / digits keyboard (DEMO_PIN "1234") | S | L8879, L8942, L9040 |
| Passkey face (fake 1.9 s fingerprint → verified) | S | L8977 |
| SSO buttons Remotion/Google/Microsoft (1.5 s → success) | S | L8967 |
| Switch user list (changes `accId`, persisted) | F/S (no re-auth per user) | L8956 |
| Quote card cycle | F | L8985 |
| Language popover | F | L8998 |
| A11y popover: larger text, high contrast, reduce motion (persist), OSK | F | L8999–L9003 |
| Power popover: sleep / restart / shutdown | F (S power) | L9004 |
| Idle 25 s → glance; pointer/keys wake; sleep → any key/pointer wakes; Esc = back/glance | F | L9015–L9042 |
| Pointer parallax on wallpaper (`--px/--py`) | Decorative F | L9025 |

### 4.8 Sign-in
| Control | Class | Line |
|---|---|---|
| Tabs Email / SSO / Passkey (animated indicator & height) | F | L9132 |
| Email+password submit: regex email, **any password ≥4 chars**; matching account email switches identity; 5 fails → 30 s lockout | S | L9155–L9163 |
| Remember me (persists e-mail in `remotion-si`) | F | L9194–L9195 |
| SSO domain submit (1.6 s fake redirect) | S | L9165 |
| Passkey submit (1.8 s fake) | S | L9171 |
| Provider tiles (Microsoft/Google/Apple 1.7 s fake; Passkey → passkey tab+submit) | S | L9230, L9185 |
| Gov ID tiles (PSC, FranceConnect, eIDAS) | S | L9231 |
| Gov section collapse | F | L9229 |
| Forgot → reset form → "check inbox" (no email sent) | S | L9175 |
| Create one → registration | F | L9227 |
| Need help / Contact admin | D | L9228 |
| Language popover, theme toggle, quote card | F | L9237–L9246, L9220 |
| Esc closes popover / leaves reset screen | F | L9249 |

### 4.9 Registration wizard
| Control | Class | Line |
|---|---|---|
| Steps bar (jump to visited steps) | F | L9883 |
| Method cards (email/gov/SSO) | F | L9840 |
| Gov provider buttons / SSO domain continue / Google-Microsoft-Apple social → `verifyWith` (1.5 s fake, prefills **ACCOUNTS[0] (Nassim)** identity) | S | L9661–L9667, L9842–L9844 |
| Password eye toggles; live strength meter & rules | F | L9841, L9720 |
| Terms/Privacy links | D | L9839 |
| Next / Back / Esc (back one step) / Enter submits | F | L9846–L9847, L9899, L9735 |
| Photo pick / drag-drop / remove (validation type & 5 MB) | F | L9739–L9752, L9861–L9862 |
| Profession change auto-selects role unless user chose; RPPS counter & toggle | F | L9754–L9761 |
| Phone country select (flag + dial code) | F | L9881 |
| Org mode cards; invite/ident detect (1.1 s fake directory); clear; copy SIRET (clipboard); "view details" (D); create-mode ID lookup prefill (0.9 s fake) | S/F | L9849–L9860 |
| Country selects with flag pop | F | L9880 |
| Verification channel buttons email/WhatsApp/SMS/link (0.9 s fake send) | S | L9698 |
| OTP boxes: type/paste/backspace/arrows/Enter; **any 6 digits verify after 0.9 s** | S | L9713–L9737, L9685 |
| Resend (60 s cooldown) | S | L9863 |
| Change e-mail inline (edit/save/cancel, Enter/Esc) | F | L9865–L9871 |
| Review edit buttons; policy checkboxes; policy links (toast) | F / D | L9848, L9773, L9874 |
| Create account (3-step fake progress) → Open workspace (persists accounts, sets profile, switches to preferred language) | S | L9775, L9791 |
| Carousel dots, hover pause, quote card, theme, language popover | F | L9884–L9898 |

### 4.10 Notification center & banners
| Control | Class | Line |
|---|---|---|
| Priority chips, category chips, "more categories" expand, search, Ctrl/Cmd+F | F | L10132–L10135, L10121 |
| Item click/Enter → select + mark read; ↑↓ list nav | F | L10127–L10130, L10123 |
| Item primary action (Join/Open/View/Details/Install) | S/D (toasts; Install = 2.4 s fake, then "Restart now" → restartOS) | L10090, L10083 |
| Item ⋯ menu: mark read/unread, snooze (1 h), delete (with undo) | F | L10104 |
| Header: mark all read (undo), ⋯ (mark all / clear read with undo / settings), expand/wide | F | L10136–L10142 |
| Detail: close, primary, view details (D), secondary (snooze / reschedule D), ⋯ | F/D | L10144–L10150 |
| Settings: collapse, DND (syncs account status), quiet hours, sound (chime), desktop banners (shows test banner), "more" (D) | F | L10153–L10161 |
| Banner click → open NC at item; × closes; hover pauses | F | L10176–L10179 |
| Reminders 10 min before 3 hard-coded "Today" events (16:30/17:30/20:00 local) | F (timer) / S (data) | L10185–L10196 |
| Esc (closes pop → detail (mobile) → NC) | F | L10120 |

### 4.11 Account menu
| Control | Class | Line |
|---|---|---|
| Status button + 5 statuses (online/busy/DND/away/invisible) | F | L10373–L10374, L10347 |
| My profile view (read-only rows) | F | L10321 |
| Security | D | L10380 |
| Appearance / Language → opens sys menu at view | F | L10383 |
| Notifications → open NC (unread badge) | F | L10383 |
| Keyboard & shortcuts → kb menu | F | L10383 |
| Switch organization (accounts view) / Add account → sign-in | F/S | L10375, L10381 |
| Location & department: expand sites, select department (0.42 s busy, persisted) | F/S (static `ORG_UNITS`) | L10377–L10378 |
| Switch profile (admin/therapist/reception/guest) — changes displayed role only | S (no permission model) | L10355 |
| Lock / Restart / Sign out | F/S | L10383, L10397 |
| ↑↓/→/←/Esc keyboard nav | F | L10385 |
| Auto-away after 5 min inactivity; resumes online on activity | F | L10403–L10408 |

### 4.12 Global
| Behaviour | Class | Line |
|---|---|---|
| Esc → `closeAll` (+ palette/shortcuts precedence) | F | L7976, L9918 |
| Outside-click closers (lang, kb menu, sys, palette, NC, acc, dctx) | F | L7973, L8520, L8797, L8869, L10117, L10394, L7916 |
| `[data-t]` click → toast "{x} opened" (global) | D | L7598 |
| Restart (2.3 s) / Shutdown → Power on (1.4 s) | S | L9907–L9912 |
| Theme follows OS in Auto + `data-theme` attribute observer | F | L10446–L10447 |

### Interaction counts (approx., rows above)
| Class | Count |
|---|---|
| Functional (F) | ~150 |
| Simulated (S) | ~30 |
| Decorative / toast-only (D) incl. 23 shortcut rows | ~45 |
| Partial (Pa) | 4 (calendar prevYear, tray volume, Ctrl+V paste, kb mic-style) |
| Present-not-verified (P, cross-area) | ~25 (rail/dock/nav `data-t` opening real windows in other areas) |
| Broken (B) | 0 hard-broken found; see §13 for defects |

---

## 5. User journeys

1. **Switch language** — Language button → choose FR → `switchLang` (View Transition with staggered panels, L7667; fallback blur L7675; reduced-motion instant) → `applyLang` re-renders all components, sets `dir="rtl"` for Arabic, OSK follows language if `kbFollow` (L7987), persists `remotion-lang`. Toast "Langue : Français". Cancel: n/a. Works from lock / sign-in / registration overlays too (popovers closed first, L7669).
2. **Manage virtual desktops** — Desktops → panel → "+" adds desktop (unused scene) → click thumb → wallpaper/content slide + HUD → right-click thumb → rename / change wallpaper / close → Undo in toast restores snapshot (L7859). Failure: 12-desktop cap toast; closing last desktop toast. Shortcut path: Ctrl+Win+→/←/D/Shift+D/Tab; two-finger swipe.
3. **Lock & unlock** — Ctrl+Alt+L → `lockScreen` (shell `inert`, body.locked) → type password (≥4 chars) → spinner 0.7 s → "Welcome Nassim" → `unlock` → boot animation. Failure: <4 chars → shake + error, 5 fails → 30 s lockout countdown. Alternatives: PIN 1234, passkey (auto 1.9 s), SSO buttons, switch user. Idle 25 s → glance; power popover → sleep/restart/shutdown.
4. **Sign out → sign in** — Account → Sign out → power screen "Signing out" 1.1 s → sign-in screen (email prefilled if remembered) → email+password → 0.85 s → success → `hideSignin` sets status online and boots. Alternatives: SSO domain, passkey, providers, gov IDs (all simulated). Forgot → reset → "check inbox" → back.
5. **Register a new account** — Sign-in "Create one" → Step 1 (email method, names, email, strong password, terms) → Step 2 (photo, profession/role, RPPS, phone, language, TZ) → Step 3 (invite code detect / SIRET detect / create org with lookup) → Step 4 (send code; enter any 6 digits; or magic link auto-verifies) → Step 5 review, 3 policy checkboxes → Create → progress → "Open workspace" → account + org persisted in `remotion-accs-extra`, `remotion-acc` updated, switch to chosen language. Cancel: "Sign in" link → back to sign-in; Esc steps back. Errors per field (§4.9).
6. **Find & run anything** — Ctrl+K → palette grows from search bar → type "dark" → Enter → theme toggles with circular reveal. Or type a note title → widget scrolls & flashes.
7. **Triage notifications** — Bell → NC (filters/search) → click item → detail → primary action (toast/simulated) / snooze (1 h, banner on wake) / delete with Undo / mark all read with Undo; settings DND also sets status "DND" and silences non-critical banners.
8. **Type with the on-screen keyboard** — Keyboard menu → "Open keyboard" → focus field (inputmode none) → type; suggestions; long-press accents; Shift+Alt changes layout; float & drag; settings for size/transparency/theme. With no focused field, typing opens Quick Note composer automatically (L8121).
9. **Create a custom shortcut** — Ctrl+/ → "Custom" category → choose action → "Click to record" → press combo with modifier (rejects taken / modifier-less) → Save → persisted, immediately active in global handler.
10. **Change location/department** — Account → Location & department → expand site → choose department → busy → saved per org in `remotion-units`, top-bar role/unit line updates.

---

## 6. State & persistence

### localStorage keys owned by the shell (11)
| Key | Shape | Read | Write | Notes |
|---|---|---|---|---|
| `remotion-lang` | `"en"|"fr"|"de"|"ar"` | L7506 | L7980 | validated against `I18N` |
| `remotion-desks` | `{l:[{n:string≤32,s:sceneIdx,items?:[],w?:bool}],c:curIndex}` (≤12) | L7748 | L7749 | `items`/`w` fields owned by desktop-icons area (FACT: sanitised but preserved) |
| `remotion-kb` | `{set:kbSet,lang,follow,layout,auto}`; `kbSet={sugg,autoCap,dbl,hints,sound,autoHide,zoom,alpha,theme,pos}` | L8041 | L8042 | **migration**: `preview`→`hints`, drops legacy `size` (L8041) |
| `remotion-custom-sc` | `[{label,act|null,combo}]` | L8573 | L8574 | |
| `remotion-lk` | `{big,hc,rm}` | L8881 | L8896 | |
| `remotion-si` | `{remember:boolean,email:string}` | L9073 | L9195 | e-mail stored in clear |
| `remotion-nc` | `{dnd,quiet,sound,desk}` | L9989 | L9990 | notifications themselves NOT persisted |
| `remotion-acc` | `{id,status,prof}` | L10225 | L10226 | validated against lists |
| `remotion-accs-extra` | `[{id,name,short,role,email,ini,bg,photo?:dataURL,org?}]` | L10223 | L9798 | photo dataURL; retries without photo on quota error (L9799) |
| `remotion-units` | `{[orgId]:{s:siteId,d:deptKey}}` | L10265 | L10295 | |
| `remotion-theme` | `"light"|"dark"` (absent = auto) | L10418 | L10440 | |

No IndexedDB, no sessionStorage, no `storage` event listener, no versioning other than the `remotion-kb` field migration. All writes wrapped in try/catch.

### In-memory stores (not persisted)
`workspaces`/`selWs` (L7626 — persisted by another area via `remotion-ws-desks`, L20844 INFERENCE), `desks/cur/deskCount` (persisted), `st` modifiers & `KEYS/ROWS` (L8038), `learned` word Map (L8056), `NCS` notifications (7 seeded L9978, + reminders), `reminded` Set, `rg` wizard object (`RG0()` L9258, ~40 fields), `lkFails/lkLockUntil`, `siFails/siLockUntil`, quick notes DOM, tasks DOM, `ACCOUNTS` (3 seeded + extras), `STATUSES`, `PROFILES`, `ORG_UNITS`, `ORG_DIR`.

### Timers
| Timer | Interval | Line |
|---|---|---|
| clock `tick` | 10 s | L7691 |
| reminders | 30 s (+ first at 2 s) | L10196 |
| NC "ago" refresh | 60 s | L10197 |
| auto-away | 5 min idle | L10405 |
| lock glance | 25 s idle | L9015 |
| lockout countdowns | 1 s (30 s total) | L8926, L9151 |
| resend countdown | 1 s (60 s) | L9676 |
| carousel | 6 s | L9811 |
| snooze wake | 1 h (not cancellable) | L10080 |
| toast | 1.6 s / 4.5 s | L7597, L10070 |
| HUD | 1.4 s | L7808 |
| banner | 6 s (2.5 s after hover) | L10179 |

### Cross-area coupling (FACT)
- Shell functions are **monkey-patched** later: `renderDock` (L11620, L12299, L13590, L22589, L23801, L24437, L25422, L26095, L26682, L27208), `renderDesks` (L11619, L20970), `setDesks` (L20971), `gotoDesk` (L20863), `addDesk` (L20871), `closeDesk` (L20870), `renderWs` (L20874); `ACTIONS` extended (L20903, L20904, L21062); `SC_CATS` mutated (L20905, L21063).
- Shell calls into other areas: `dkSwitch` (L7812, defined L11328), `renderAI/renderIcons/osRelabel` (L7991 when `window.__aiOn`), `fitSteps` guards with `typeof`.
- Global document listeners: ≥14 `click`, ≥10 `keydown` (some capture: L7923, L8676, L10118), `focusin/focusout/selectionchange`, window `pointermove/pointerup/pointercancel/wheel/resize/online/offline`.

---

## 7. Integrations & external dependencies

| Type | Detail | Line |
|---|---|---|
| Network calls | **None** (no fetch/XHR/WebSocket in range) | — |
| CDN | Google Fonts CSS: Inter + Noto Sans Arabic (head) | L3–L4 |
| `window.claude` | not used in shell | — |
| Canvas 2D | wallpaper, desktop thumbs, ctx swatches, lock/sign-in/registration quote thumbs | L7529 etc. |
| Web Animations API | pervasive (`el.animate`) | — |
| View Transitions API | language & theme switches (with fallbacks) | L7667, L10428 |
| Battery API `navigator.getBattery` | tray | L7781 |
| `navigator.onLine` + online/offline events | tray, info | L7782 |
| WebAudio `AudioContext` | key click (triangle 1500→500 Hz), notification chime (880/1318.5 Hz) | L8050, L10164 |
| Clipboard `navigator.clipboard.writeText` | OSK Ctrl+C/X, copy SIRET | L8148, L9858 |
| `document.execCommand("undo"/"redo")` | OSK Ctrl+Z/Y (deprecated API) | L8152–L8153 |
| `FileReader.readAsDataURL`, drag-and-drop `DataTransfer` | registration photo | L9743, L9752 |
| Intl: `DateTimeFormat` (incl. `timeZoneName:"longOffset"`, `numberingSystem:"latn"`), `NumberFormat` (EUR currency), `DisplayNames` (region, language), `RelativeTimeFormat`, `supportedValuesOf("timeZone")` | | many |
| `matchMedia` (reduced-motion, prefers-color-scheme) + MutationObserver on `data-theme` | | L10446–L10447 |
| `navigator.userAgentData` / UA, `screen`, `devicePixelRatio`, `navigator.platform` (Mac detection) | info view, ⌘ labels | L8739, L8390 |
| Pointer capture, `inert`, `setRangeText`, `requestSubmit` | | |
| Not used: Notifications API, WebAuthn, crypto, window.open (only `<a target=_blank>` in review L9589), print, fullscreen | | |

---

## 8. i18n / RTL

- **Languages** (FACT L7180–L7185): `en` (en-US, ltr), `fr` (fr-FR, ltr), `de` (de-DE, ltr), `ar` (ar-TN, **rtl**).
- **Storage**: `I18N` object with per-language base dictionaries (L7186–L7267) extended by **28 `Object.assign(I18N.xx,{…})` packs** in L7269–L7504 (7 packs × 4 languages). Further packs elsewhere: L10450, L26670, L27197 (4 each) — outside scope.
- **Key counts in L7179–L7504** (FACT, evaluated with node): **777 keys per language, identical key sets (0 missing), 0 placeholder mismatches, all strings**. 12 keys identical in EN/FR/DE (brand/loan words: `design, terminal, infoVersion, catWidgets, position, fPatient, ssoRemotion, ssoGoogle, ssoMs, chWa, dp_design, dp_support`). Approx. size ~118 KB of the 405 KB range.
- **Lookup**: `t(k,vars)` → `I18N[lang][k] ?? I18N.en[k] ?? k`; replaces only the **first** occurrence of each `{var}` (L7507).
- **DOM binding**: `data-i18n` (textContent), `data-i18n-aria`, `data-i18n-ph` re-applied in `applyLang` (L7984–L7986); everything else re-rendered via render functions.
- **Locale formatting**: `nf()` uses locale digits (Arabic-Indic numerals in `ar-TN` INFERENCE: depends on ICU; clock forces `numberingSystem:"latn"` L7685).
- **RTL handling**: `document.documentElement.dir` set from `LANGS[l].dir` (L7982); direction-aware maths for slides (L7815), segmented indicators (`rtlS`), arrow keys in menus/desktops/swipe (L7945, L7966, L8513), NC pop placement (L10096), `dir="auto"` on user content, `bdi` in review. Fonts: `[dir="rtl"] body` switches to Noto Sans Arabic (CSS L113). OSK container fixed `dir="ltr"` (markup 155); Arabic layout has its own rows, no auto-cap/double-space (L8127, L8178).
- OSK per-language lexicons `WORDS` (en 31, fr 29, de 28, ar 28 words, L8021).
- Some strings hard-coded EN: key aria labels "Backspace/Left/Right/Up/Down" (L8099), "Fn/Alt/Alt Gr", sample notification names, "Dr. Sarah", org directory data.

---

## 9. Design tokens & motion

- **Tokens** (CSS L7–L50): `--glass`, `--glass-strong`, `--line`, `--fg`, `--muted`, `--green #22b14c` (accent), `--green-soft`, `--green-line`, `--red #e23b3b`, `--blue #2f8ef0`, `--violet #c22fd6`, `--shadow`, `--font` (Inter, Noto Sans Arabic…), `--spring cubic-bezier(.2,1.25,.35,1)` (204 uses), `--ease cubic-bezier(.22,.8,.24,1)`, `--panel-h 118px`, `--sky`, `--hover`, `--chip`, `--surface`, `--rail-bg`, `--rail-line`, `--dock-bg`, `--ring`, `--track`, `--out`, `--icon`, `--green-ink`, `--plus-hover`, `--dash`, `--cloud`, `--cloud-line`, `--scrim`, `--toast-bg/fg`, `--key`, `--key-mod`, `--key-press`, `--key-edge`, `--kb-bg`, `--kb-rgb` (≈42 tokens). Registration has its own `--rg-ink/--rg-muted/--rg-line` (CSS L1106–L1108).
- **Dark mode**: tokens redefined under `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not(.light)}` and `:root[data-theme="dark"]:not(.light),:root.dark` (CSS L51–L64). JS sets `html.dark`/`html.light` (L10415, L10422). Wallpaper switches to `nightScenes` (stars + moon).
- **Runtime CSS vars**: `--bi` stagger, `--i/--j/--r/--c` stagger indexes, `--w` key width, `--kz` zoom, `--ka` alpha, `--cx` caret, `--ox` popover origin, `--px/--py` parallax, `--rx/--ry/--rr` theme reveal, `--c0` palette clip, `--sc` status colour, `--p` range fill.
- **Keyframes** (48 in CSS 5–1737): bootIn, bootTop, bump, cardIn, ckDraw, ckIn, codeIn, codeOk, dkGrab, drain, fill, flash, float, keyIn, langIn, langOut, lkCardIn(R), lkPopIn, lkUp, nbIn(R), nbOut, ndIn, niIn, niOut(R), noteIn, okPop, pillIn, pkPulse, popIn, pulse, reveal, ring, rowIn, rvIn, rvPill, rvTile, shake, sheen, siPanelIn(R), spin, spinPulse, suggIn, unPop, varIn.
- **View transitions**: `html.vt-theme` circular `reveal` (.75s, CSS L67–L68); `html.vt-lang` named groups p-top/p-rail/p-dock/p-menu/p-c1..c5 with staggered delays .1–.38 s, overlay variants for lock/si/rg (CSS L70–L98).
- **JS motion constants**: desktop slide 820 ms `cubic-bezier(.72,0,.24,1)`, scale .94; menus 200/440 ms; relayout 170/500 ms; many springs `cubic-bezier(.2,1.1,.3,1)`.
- **Glass**: `backdrop-filter: blur(16–24px)` (~34 occurrences).
- **Breakpoints** (CSS): 1720, 1700(min), 1500, 1400, 1250, 980, 900, 860, 760, 640, 480, 420 px; height 760/700 px. Plus JS: `innerWidth<860` (L27215), `<=900` (NC detail, L10120).
- **Reduced motion**: JS checks `matchMedia` + lock `rm` setting via `lkRM()` used broadly (desktops, sign-in, registration); CSS only 3 targeted rules (L1594, L1681, L1737) + `.lock.rm *` (L685). No global CSS reduced-motion reset (INFERENCE: many CSS keyframes still play).

---

## 10. Accessibility observations

Positive (FACT):
- Menus use `role="menu"`, `menuitem`, `menuitemradio`, `menuitemcheckbox`, `aria-expanded`, `aria-controls`; arrow-key navigation & RTL-aware sub-view navigation (L8510, L8788, L10385). Focus moved into menus on open (L8469, L8761, L10340).
- Lock/sign-in/registration set `shell.inert=true` (L9053, L9204, L9827) — real background inertness.
- Desktop panel: `role=list/listitem`, `aria-pressed`, hidden hint `#dkHint` via `aria-describedby`, full keyboard (arrows, Home/End, F2, Delete, ContextMenu, Shift+F10). HUD `role=status aria-live=polite`.
- Live regions: toast `role=status`, `lkMsg`, `siMsg`, `rgErr`, NC detail `aria-live`, banners `role=status`, power `aria-live`.
- Segmented/tabs: sign-in `role=tablist/tab aria-selected`; wizard steps `aria-current="step"`; OTP inputs labelled "Digit n"; switches `role=switch aria-checked` (NC settings).
- Global `button:focus-visible` outline (CSS L111); 16 `:focus-visible` rules.
- Lock a11y options: larger text, high contrast, reduce motion; OSK.

Gaps / risks:
- Shortcuts dialog `aria-modal="true"` but **no focus trap** (no Tab handling) and background not inert (FACT: no trap code near L8648).
- NC `role="dialog"` without modal semantics/focus trap; palette `role=dialog` + combobox but **no `aria-activedescendant`** (0 occurrences in file) — active option only conveyed via `aria-selected` on non-focused buttons (`tabindex=-1`).
- OSK keys are `<button>` without `aria-pressed` for Shift/Ctrl (only Caps has it, L8112); key aria strings partly hard-coded English.
- Calendar out-of-month buttons are focusable=−1, but day buttons are buttons with no action (misleading semantics).
- Task checkboxes have state but no persistence; event/notes lists not announced.
- `wsMenu` starts open on desktop with `aria-expanded="true"` (markup 11) — consistent, but a menu open at load may surprise SR users.
- Colour-only status dots (statuses carry text labels in menu — OK).
- Many icon-only buttons rely on `data-i18n-aria` (good); dock buttons have `aria-label` + `title` (L7741).

---

## 11. Migration notes for Next.js (App Router, TS, React)

**Patterns to replace**
- Every view renders via `innerHTML` template strings + document-level event delegation (≥14 click, ≥10 keydown listeners incl. capture-phase interceptors L7923, L8676, L10118). Replace with React components and scoped handlers; a single `useHotkeys`/command registry for global shortcuts with explicit priority (overlay > dialog > menu > global).
- Imperative WAAPI animations (`el.animate`) and View Transitions → Motion (Framer) layout animations + `document.startViewTransition` wrapper hook; keep reduced-motion gate (`lkRM`) as a context value.
- Monkey-patching (`renderDock=function(){_old();…}` ×10, `gotoDesk`, `addDesk`…) indicates missing extension points → define an event bus / plugin hooks (`onDesktopChange`, `dockItems` registry, `actions` registry).
- Global mutable singletons (`lang`, `cur`, `desks`, `kbOpen`, `status`, `accId`, `isDark`, `NCS`) → Zustand/Context stores: `useI18n`, `useTheme`, `useDesktops`, `useWorkspaces`, `useKeyboard`, `useNotifications`, `useSession/useAccount`, `useOverlay` (lock/sign-in/register/power).

**Globals shared with other areas (must become exported APIs)** — approximate usage counts after L10448: `t` (very high), `nf` (~485), `lang`, `LANGS`, `I18N` (33, packs added), `loc` (73), `toast` (73), `toastUndo`, `esc`, `dEsc`, `norm`, `hl`, `lkRM` (52), `paint`, `sceneFor`, `scenes`, `desks`/`cur`/`deskCount`/`saveDesks` (32), `gotoDesk`, `addDesk`, `closeDesk`, `setDesks`, `renderDesks`, `renderDock` (10), `renderWs`, `selWs`, `workspaces`, `wsName`, `shell`, `wall`, `drawWall`, `ACCOUNTS`, `curAcc`, `homeOrg`, `curUnit`, `roleOf`, `pushNc` (5), `SI`, `ACTIONS`, `SC_CATS`, `setSysMenu`, `applyLang`, `prof`, `tick`. Shell depends on: `dkSwitch`, `renderAI`, `renderIcons`, `osRelabel`, `window.__aiOn`.

**Client-only**: everything (canvas, `localStorage`, `matchMedia`, Battery, AudioContext, clipboard, View Transitions, pointer events, `inert`). Server components only for static shell frame; i18n dictionaries can be server-loaded JSON.

**Suggested decomposition**
`app/(os)/layout.tsx` → `<OsShell>`: `TopBar` (`WorkspaceMenu`, `LanguageMenu`, `SearchTrigger`, `ThemeToggle`, `BellButton`, `KeyboardMenu`, `SystemMenu`, `AccountMenu`), `Rail`, `WidgetsColumn` (`WeatherClock`, `TodayEvents`, `MiniCalendar`, `QuickNotes`, `Tasks`), `Dock`, `DesktopPanel` (`DesktopThumb`, `DesktopContextMenu`, `DesktopHud`, `Tray`), `Wallpaper` (canvas), `Toaster`, `CommandPalette`, `ShortcutsDialog`, `NotificationCenter` (+`NotificationBanners`), `OnScreenKeyboard`, overlays `LockScreen` (faces as sub-components), `SignInScreen`, `RegistrationWizard` (step components + `useWizard` reducer), `PowerScreen`. Shared `SlideMenu` component (port of `showView`).

**Pure TS modules extractable as-is**: `paint()`+`rng()`+scene palettes (wallpaper.ts), `pwCheck` (password policy), `tzList/tzLabel`, `parseCombo/comboMatches/comboFromEvent/comboKeys` (hotkeys.ts), OSK layout data (`KB`, `VAR`, `NUM*`, codes) + `charFor`, suggestion ranking (`candidates`, `norm`, `fitCase`), `fmtSiret`, ID-length rules (`ID_TYPES`), validation regexes (email, phone, RPPS, invite, SIRET/SIREN), `ago/dayLabel/dayKey`, notification filtering (`ncFiltered`), `inQuiet`, `curUnit` resolution, i18n dictionaries → JSON per locale (777 keys each, already consistent).

**Security / privacy concerns (RISK)**
- Authentication is entirely simulated: any password ≥4 chars (L8916, L9161), PIN `1234` hard-coded (L8879), any 6-digit OTP (L9688), passkey/SSO/gov ID are timers. Must be replaced by real auth (NextAuth/OIDC, WebAuthn, Pro Santé Connect/FranceConnect via OIDC), server-side rate limiting instead of client lockout.
- "Switch profile" changes the displayed role (admin/therapist/reception/guest) with **no permission model** (L10355) — must map to server-side RBAC.
- Switching user on the lock screen changes identity without re-authenticating that user (L8956).
- `localStorage` holds personal data: e-mail (`remotion-si`), names, e-mail, **photo dataURL**, org (`remotion-accs-extra`) — health-sector PII on device; move to server, encrypt, or session-scope.
- Patient names in seeded notifications ("Amine Trabelsi", L9982) are sample data; real NC will carry PHI → needs server persistence, access control, and care with banners on a shared screen.
- Custom shortcuts can capture common combos (e.g. Ctrl+C) and `preventDefault` globally (L9922) — validate against reserved list.
- `innerHTML` with interpolated data: most user strings pass through `esc`/`dEsc`; `rg.photo` dataURL interpolated into `src` (L9392, L9578), account `photo` (L10230) and `a.email` in account header **unescaped** (L10306) — from localStorage → XSS vector if storage is tampered (RISK, low in demo).

**Complexity estimate**: **XL** (±1 size). ~3,270 JS lines (≈290 KB code excluding dictionaries), 1,733 CSS lines, 33 views, 4 locales, heavy bespoke motion, OSK editor engine, cross-area extension points. Suggested split: i18n+theme+toasts (S), desktop shell & widgets & dock (M), virtual desktops (M), OSK + kb menu (L), shortcuts/palette/sys menu (M), NC (M), account/units (M), lock + sign-in (L incl. real auth), registration wizard (L incl. real verification & org directory).

---

## 12. Counts summary

| Metric | Count |
|---|---|
| JS lines in scope (L7178–L10448) | 3,271 (≈405 KB; translations ≈327 lines/≈118 KB) |
| CSS lines in scope (L5–L1737) | 1,733 (≈154 KB), 48 keyframes, 26 `@media` blocks |
| Markup lines | 321 |
| Top-level views/overlays | 33 |
| Sub-views (sys 8, account 5, kb menu 4, lock faces 5, lock popovers 3, sign-in 3 tabs + 2 reset, wizard 5 steps + 2 final) | 37 |
| Dialogs/menus/popovers (ws, lang, desk ctx, kb menu, sys, account, shortcuts dlg, palette, NC, NC pops, lk pops ×3, si/rg lang pops, accent popup) | 16 |
| Named functions/builders | ~150 |
| Icon maps | 18 |
| Interactions — Functional | ~150 |
| Interactions — Simulated | ~30 |
| Interactions — Decorative/toast-only | ~45 (incl. 23 shortcut rows) |
| Interactions — Partial | 4 |
| Interactions — Present-not-verified (cross-area) | ~25 |
| Interactions — Broken | 0 hard failures (see defects) |
| Keyboard shortcuts in catalogue | 56 rows / 49 unique combos / 31 functional |
| localStorage keys | 11 |
| Timers (intervals/timeouts of note) | 12 |
| External deps | 1 CDN (Google Fonts); 0 network calls |
| Browser APIs used | ~20 |
| Languages | 4 (1 RTL), 777 keys each in scope |
| Seed data | 5 workspaces, 3 desktops, 3 accounts, 4 profiles, 5 statuses, 7 notifications, 3 events, 3 notes, 5 tasks, 3 org-directory entries, 2 orgs' units (5 sites) |

---

## 13. Defects / inconsistencies (current vs expected)

| # | Evidence | Current | Expected |
|---|---|---|---|
| 1 | L7720 | `prevYear` button bound to the same handler as `prev` (−1 month) and labelled `prevMonth` | either remove or go −12 months / distinct label |
| 2 | L7702, L7999, markup 71–73 | Event dots only for Oct 2026 (`"2026-9"`); "3 events" hard-coded; Today list static | data-driven |
| 3 | L7685, L8381 vs L9257 | Clock/notes always use `Africa/Tunis`, while info view and registration use system TZ | use the user's chosen TZ |
| 4 | L7695 | Forecast/temperature static (18°C, 20/22/21/19/20) | real weather or clearly labelled sample |
| 5 | L7598 + L11855 (INFERENCE from listener order) | Clicking dock/rail apps that open real windows also shows "X opened" toast (shell listener registered first; later `stopImmediatePropagation` can't stop it) | single feedback |
| 6 | L8711 | `sysItem(...,'class="kbm-item hl" data-act…')` produces duplicate `class` attributes, fixed by a fragile `.replace()` string hack | pass class as parameter |
| 7 | L8771 vs L8584 | System menu "Settings" → "not in preview" toast, while Ctrl+, opens the system menu itself | consistent target |
| 8 | §4.4 | 23 catalogue shortcuts only toast "not in preview"; duplicates (Ctrl+K ×4, Ctrl+Alt+A ×2, Ctrl+Shift+F ×2) listed in several categories | dedupe/implement |
| 9 | L9919–L9922 (RISK, INFERENCE) | Global handler fires on any Ctrl+Alt combo even while typing; on Windows AltGr = Ctrl+Alt, so AltGr+E (€, DE/FR), AltGr+0 (@ on FR AZERTY), AltGr+= (} FR) are swallowed by openMsgs/textReset/textBigger | ignore when target is editable or `e.getModifierState("AltGraph")` |
| 10 | L10080 | Snooze timer (1 h) is not cancelled by Undo → notification later re-appears unread with a banner | clear timer on undo |
| 11 | L10075 | Delete-undo before the 520 ms removal callback inserts, then callback splices index i (works by coincidence; ordering fragile) | idempotent ops by id |
| 12 | L9849 | `if(!(…))rg.found=null;else rg.found=null;` — both branches identical (dead condition) | simplify / intended keep-found logic |
| 13 | L9664 | Provider/gov/SSO verification pre-fills names/e-mail from `ACCOUNTS[0]` (Nassim) for any new registrant | use provider claims |
| 14 | L8916, L9161, L9688, L8879 | Any password ≥4 chars, any 6-digit code, PIN 1234 accepted | real auth (see §11) |
| 15 | L8956 | Switch user on lock screen changes the active account without that user's credentials (password field is cleared, but any ≥4-char password then unlocks) | per-user auth |
| 16 | L8151 | OSK Ctrl+V shows "paste not available" | Clipboard read with permission |
| 17 | L8152–L8153 | Undo/redo via deprecated `document.execCommand` (no-op for `setRangeText` edits in some browsers — INFERENCE) | own undo stack |
| 18 | L7933 | Tray "volume" toggles only keyboard click sound (`kbSet.sound`), labelled volume on/off | rename or real volume |
| 19 | L7634, L8378, markup 108 | New workspaces (in shell), quick notes and task checks are not persisted by the shell | persist (workspaces may be persisted by another area — UNKNOWN for names) |
| 20 | markup 11, L27215 | Workspace menu is open on first load for viewports ≥860 px | closed by default (UNKNOWN whether intentional) |
| 21 | L7507 | `t()` replaces only first occurrence of each placeholder | `replaceAll` |
| 22 | L10306 | `a.email` interpolated without `esc()` in account header (other fields escaped) | escape consistently |
| 23 | L8648–L8656 | Shortcuts dialog `aria-modal` without focus trap / background inert | trap focus |
| 24 | L8099, L8094 | Key aria labels "Backspace/Left/…/Fn/Alt" not translated | i18n |
| 25 | L9814 | Registration quote: first quote uses `rqs` subtitle while others use `q{n}s` (intentional variant — INFERENCE) | — |
| 26 | L10185 | Reminders fire for 3 hard-coded "Today" events (16:30/17:30/20:00 local) every day | data-driven |
| 27 | L7972 | `closeAll` relies on `typeof setKbMenu==="function"` (always true after hoisting); real guard against TDZ of later `const`s (`palette`, `nc`, `accMenu`) is only that it's never called before script end (RISK if order changes) | module boundaries |
