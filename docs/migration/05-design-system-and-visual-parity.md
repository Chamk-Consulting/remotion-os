# 05 · Design system and visual parity

Status: **complete for the source.** The values below were extracted from CSS, with file line numbers. The baseline renderings are in `evidence/screenshots/` (desktop 1440 light and dark, tablet 1024, mobile 390, and 11 standalone apps).

**Rule for the migration (brief §4.5): extract, don't approximate.** No new brand colours. No component redesign. Every value below carries over as a token.

---

## 1. Global tokens (`:root`, L7–L44; dark L45–L64)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--fg` | `#1d2420` | `#e7ece9` | text |
| `--muted` | `#6b7570` | `#9aa5a0` | secondary text |
| `--green` (brand accent) | `#22b14c` | `#34c35d` | brand, selection, active |
| `--green-soft` / `--green-line` / `--green-ink` | `#e6f6ea` / `#9fdcb0` / `#167a35` | rgba tints / `#7fe09c` | accent surfaces |
| `--red` / `--blue` / `--violet` | `#e23b3b` / `#2f8ef0` / `#c22fd6` | same | status and priority |
| `--glass` / `--glass-strong` | `rgba(255,255,255,.82)` / `.93` | `rgba(26,30,34,.78)` / `rgba(20,24,28,.9)` | translucent panels (with `backdrop-filter: blur(16–24px)`, ≈34 uses) |
| `--surface` | `#ffffff` | `#2a3035` | cards, windows |
| `--line` | `rgba(20,40,30,.09)` | `rgba(255,255,255,.08)` | borders |
| `--hover` / `--chip` | `rgba(0,0,0,.045)` | `rgba(255,255,255,.06/.07)` | hover, chips |
| `--shadow` | `0 10px 30px rgba(20,40,60,.14)` | `0 12px 34px rgba(0,0,0,.45)` | elevation |
| `--rail-bg`, `--dock-bg`, `--ring`, `--track`, `--out`, `--icon`, `--plus-hover`, `--dash`, `--cloud`, `--cloud-line`, `--scrim`, `--toast-bg/fg`, `--sky` | see L7–L44 | see L45–L64 | shell surfaces |
| `--key`, `--key-mod`, `--key-press`, `--key-edge`, `--kb-bg`, `--kb-rgb` | on-screen keyboard | dark variants | keyboard |
| `--font` | `"Inter","Noto Sans Arabic",-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif` | — | typography |
| `--spring` | `cubic-bezier(.2,1.25,.35,1)` | — | default motion (≈204 uses in the shell) |
| `--ease` | `cubic-bezier(.22,.8,.24,1)` | — | eased motion |
| `--panel-h` | `118px` | — | desktops panel height |

Theme mechanics (FACT): there are three equivalent selectors for dark mode:
- `@media (prefers-color-scheme:dark) :root:not([data-theme="light"]):not(.light)`
- `:root[data-theme="dark"]:not(.light)`
- `:root.dark`

JS sets `html.dark` or `html.light` (L10415, L10422), and a missing `remotion-theme` means auto. **The target must keep all three selectors**, because app CSS uses both `:root.dark .X-win` and `[data-theme=dark]` forms.

In total, 162 custom properties are defined across the CSS.

## 2. Per-app token sets (scoped on the window class)

| App | Scope | Accent | Other tokens | Dock glyph gradient | Evidence |
|---|---|---|---|---|---|
| Remotion AI | `.ai` | brand green `#22b14c`; links `#2f6fe0` / `#6aa8ff` | `--ai-r:16px`, `--ai-avail` (JS) | white tile with green spark | inv. 02 §9 |
| Forms | `.fe-win` | `--fe-acc #5a64e0`, `--fe-acc2 #4450cf` (dark `#a9b2ff`) | `--fe-bg #f5f7f6/#1f2428`, `--fe-soft`, `--fe-inl`, `--fe-track`; respondent `--pc` with 12 presets | `#7c8cff → #4b5bdc` | L2605, L11741 |
| Documents | `.dc-win` | `--dc-acc #2f6bf0`, `--dc-acc2 #1f56d6` | `--dc-bg #eef1f4`, `--dc-bsoft #e8f0fe`, `--dc-ink #1d3557`; 10 document themes, 5 chart palettes | blue | L3776 |
| Calculator | `.ca-win` | `--ca-g #16954c` (dark `#2fbf66`); amber `--ca-b #a65d00` | `--ca-bg #f4f7f5/#1b2024`, display gradient, chart `--ca-s0..s3` | `#2fc768 → #14864a` | L5155–L5158 |
| Billing | `.bi-win` | `--bi-a #d9480f` | tones ok/info/warn/bad; charts `--bi-s0 #2f6bf0` (invoiced), `--bi-s1 #d0600b` (collected) | orange | L5587–L5589 |
| HR (+ shared kit) | `.hr-win` | `--hr-g #15803d`; interaction blue `--hr-b #2563eb` | `--hr-bg #f4f6f9`, tones, avatar palette (10) | `#2fc768 → #11904a` | L5850–L5852 |
| Patients | `.hr-win.pa-win` | inherits `hr` | `--pa-chart0/1`, `--pa-hl` | violet tile | L6060 |
| Calendrier | `.cl-win` | inherits `hr` | — | `#3fd27a → #16a352` | inv. 07 §9 |
| Cabinet | `.cbapp` | inherits `hr` | stage colours `--cb-exp/arr/wait/call/cons/done/off` | `#34c3a0 → #0f8f74` | L26668 |
| Planning | `.plapp` | indigo `--pa #4f5bea` (overrides `--hr-b*`) | `--pl-bg/card/line/mut/r/sh` | `#7c8cff → #4f46e5` | L27195 |

INFERENCE: the user's earlier statement that "app accent colour must match the app icon (violet/purple)" for Forms is consistent with `#5a64e0` and the `#7c8cff → #4b5bdc` glyph.

## 3. Typography

| Item | Value | Evidence |
|---|---|---|
| UI fonts | Inter 400/500/600/700; Noto Sans Arabic 400/500/600/700 under `[dir="rtl"] body` | L3, CSS L113 |
| Document fonts (Documents "as is" mode) | Arimo, Tinos, Cousine, Carlito, Caladea (metric-compatible fallbacks) from Google Fonts | L20255 |
| Base | `14px` system stack in the wrapper; the shell uses `--font` | L1 |
| Most-used sizes | 12px (241), 12.5px (234), 11px (165), 13px (162), 11.5px (151), 14px (94), 13.5px (90), 10.5px (64), 15px (50) | CSS count |
| Display sizes | 18–22px (titles); the top-bar clock and lock clock are large display text | screenshots |
| Monospace | `--ca-mono`, `--bi-mono`, `--hr-mono` stacks | per app |

RISK: the audit sandbox could not load Google Fonts, so the baseline screenshots use fallback fonts. **The visual baseline must be recaptured with the real fonts** before visual diffing (doc 13 T-VIS-00).

## 4. Shape, spacing and elevation

| Item | Values (most used first) |
|---|---|
| Radii | 10px (141), 8px (136), 12px (126), 9px (118), 7px (77), 99px pills (73), 6px (71), 14px (49), 11px (48), 4px (47); AI `16px`; windows ≈12–14px |
| Spacing | No spacing scale in the CSS. Values are literal px, mostly 4/6/8/10/12/14/16/20/24 (INFERENCE from sampling) |
| Elevation | `--shadow`, per-app `--*-sh`, glass blur 16–24px |
| Layout widths | top bar with progressive compaction classes `c1…c10` (`fitTop`, L7649); windows `w=min(1640, innerWidth-16)`, `minW 340`, `minH 420` (business apps); desktop grid cells; dock centred |

## 5. Breakpoints and responsive mechanisms

| Mechanism | Values | Where |
|---|---|---|
| `@media` widths | 1720, 1700 (min), 1500, 1400, 1250, 1200, 1150, 980, 900, 860 (11×), 760 (6×), 640 (5×), 600, 560, 520, 480, 420 px; heights 760 / 700 px | global |
| Phone mode | `<860px`: shell phone layout (icon grid, stacked widgets), windows full width, no edge handles or snap, AI narrow | L27215, L2592, L5130 |
| Container queries | 22 `@container` rules (Forms: 1280/1080/820/600 px, preview 640/460, 780; Documents: 1600/1320/1100/880/620) | Forms, Documents, healthcare |
| JS size classes | `data-sz` `s` (<760), `m` (<1180 / <1240 for Planning), `l` via `ResizeObserver` on each business-app root (99 `[data-sz="s"]` rules) | Calculator, Billing, HR, healthcare |
| Input type | `@media (hover:none)` shows row actions | Calculator |
| Print | 3 `@media print` blocks; print iframes for Billing, HR, Patients; Documents print-only DOM | — |

**REC (parity-critical):** the business apps respond to **window** size, not viewport size. React ports must keep the `ResizeObserver → data-sz` mechanism, or swap it for container queries with identical thresholds, so that a narrow window on a wide screen renders like the source.

## 6. Iconography

Inline SVG strings with Lucide-style strokes (1.7–2.2 px) in ≈30 maps: 18 in the shell, plus `AIX`, `OIC`, `OSA_IC`, `FEI`, Documents icons, `hri`/`HRI`, and 40 Calculator icons. The app glyphs are gradient tiles in `DK_APPS`. REC: port each map as one React icon module and keep the exact SVG paths. Do not swap them for a library set, because the stroke metrics differ.

## 7. Motion

| Item | Values | Evidence |
|---|---|---|
| Keyframes | 136 in total: shell 48, AI/OS 24, Forms 9, Documents 13, Calculator 4, Billing 7, HR 13, healthcare 16 | inventories §9 |
| Web Animations API | 329 `el.animate` calls; common easings `cubic-bezier(.2,1,.3,1)` (17 in CSS), `(.2,.9,.3,1)`, overshoot `(.2,1.2–1.4,.3,1)`, exit `(.4,0,1,1)`, shake `(.36,.07,.19,.97)` | — |
| Signature motions | genie open (520 ms) and minimise (420 ms) to dock; desktop "spaces" slide 820 ms `cubic-bezier(.72,0,.24,1)` with scale .94; theme **circular reveal** via View Transitions (.75 s); language switch with **staggered named view transitions** (`p-top`, `p-rail`, `p-dock`, `p-menu`, `p-c1…c5`, delays .1–.38 s); palette clip-path grow from the search bar; FLIP list reordering (notifications, Forms, Documents); tab ink underlines; staggered card entrances; keyboard theme "wave" | inv. 01 §9, 02 §9 |
| Reduced motion | JS: every `animate` call is gated by `lkRM()` (OS setting or the user's lock-screen setting) or the app wrappers (`feRM`, `dcRM`, `caRM`, `hrRM`). CSS: 22 `prefers-reduced-motion` blocks, but **the shell CSS has no global reset**, so many keyframes still play (inv. 01 §9) | — |
| View Transitions | 17 `view-transition-name`; fallbacks: WAAPI blur/crossfade | CSS L66–L98 |

## 8. Component states to reproduce

Hover (`--hover`), focus (`button:focus-visible` outline, 16 `:focus-visible` rules in the shell), active/pressed (scale/press keyframes), disabled, loading (spinners, skeleton shimmer `hrShim`/`paShim`, 380 ms skeleton in Patients), selected (sliding ring on desktop thumbnails, tab ink), error (shake ±5 px over 240 ms), success (check-draw keyframes), live/running (dock running dot `os-run`, minimised `os-minz`).

## 9. Visual parity risks

| ID | Risk | Why | Mitigation |
|---|---|---|---|
| VP-01 | **Global cascade and order** | One global stylesheet with ≈8,960 rules; later rules override earlier ones, and apps rely on that (e.g. Planning overriding `--hr-b`) | Port CSS **as-is** in source order into `@layer` global stylesheets per area first (doc 10 ADR-06), then refactor |
| VP-02 | **Class-name collisions** | `.dc-h`, `.dc-sep`, `.dc-sw` are shared by the desktop context menu and Documents (L1659–L1679); today's look depends on the collision | Reproduce first; fix only as an approved deviation |
| VP-03 | Fonts | Google Fonts blocked in the audit; the target will use `next/font` (self-hosted) | Recapture the baseline with fonts; compare after |
| VP-04 | Canvas wallpaper | Procedural, seeded painter (`paint` + `rng`), DPR ≤2 | Port the painter unchanged; compare pixels at DPR 1 |
| VP-05 | Stacking contexts | Windows, menus, dock, overlays, toasts and notification banners rely on DOM order + z-index; React portals change the DOM order | Single `OverlayRoot` with the same z-index values |
| VP-06 | Backdrop blur and glass | GPU-dependent rendering differences | Compare with a tolerance threshold |
| VP-07 | Container/window-size responsiveness | `data-sz` set by JS | Keep the mechanism |
| VP-08 | RTL | 128 `[dir=rtl]` selectors + JS mirroring maths | RTL screenshot set per area |
| VP-09 | View Transitions | Only Chromium-family browsers fully support them; fallbacks exist | Test both paths |
| VP-10 | Inline styles from JS (`--i`, `--w`, `--p`, page geometry `--pw/--ph`) | Values computed at render | Port as `style` props |
| VP-11 | Print output | Billing, HR and Patients print iframes; Documents print DOM and vector PDF writer | Compare PDFs and print previews |
| VP-12 | Wrapper reset (L1) | Safe-area padding on `:root`; `img{max-width:100%}`; `[hidden]` rule | Reproduce in the root layout |
