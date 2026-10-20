# 04 — Documents (clinical document editor) — inventory

Source: `source/Remotion_Desktop.html` (read-only). Every `Lnnnnn` is a line in that file.
Labels: **FACT** = read in code · **INFERENCE** = deduced from code, not run · **RISK** = likely problem · **UNKNOWN** = not settled.

---

## 1. Scope and line ranges

### 1.1 JS (one `<script>`, Documents part)

| Range | Section (code comment) | Notes |
|---|---|---|
| L14341–L14407 | `DCI` icon set (extends Forms `FEI`) | SVG strings; `lotus` brand mark |
| L14409–L14424 | Block registry `DC_T`, `DC_LIB`, `DC_DOMS`, `DC_ST`, `DC_FIELDS`, `DC_THEMES`, `DC_FONTS`, `DC_SIZES` | registry is extended 6 more times (§3) |
| L14426–L14459 | Runtime `DC`, store `dcS`, `DC_KEY="remotion-docs"`, i18n-aware value helpers, merge fields | |
| L14461–L14523 | Seed doc (physio evaluation, 5 pages) + 8 list docs, `dcLoad`/`dcSave` | |
| L14524–L14540 | Walking, numbering, outline, word stats | |
| L14541–L14573 | 16 "essential" templates `DC_TPL` + `dcFromTpl` | |
| L14574–L14586 | Page geometry (`DC_PS`, `DC_MG`, `dcGeo`), conditional display, scale colours | |
| L14588–L14635 | Block rendering (`dcBlockInner`, `dcChartSVG`, `dcBlockHTML`, `dcPageHTML`) | |
| L14637–L14772 | Shell, nav, header, ribbon, left pane, canvas, ruler, status bar, right panel (Document / Styles / Components / Properties) | |
| L14773–L14898 | Render orchestration, zoom, thumbnails, mutations/undo, selection, toolbar state, block CRUD | |
| L14899–L14928 | Drag & drop, width resize, ruler margins | |
| L14929–L15174 | Popovers, toast, events (`dcWire`, `dcClick`, `dcKey`), commands, dropdowns, menus | |
| L15175–L15266 | Library views (overview, lists, templates), modals (new, preview, share, stats, reusable block) | |
| L15267–L15340 | Signature pad, images, drawers (comments / history / assistant), local rule-based assistant | |
| L15341–L15404 | v1 export/print and v1 import (superseded later, still reachable through patches) | |
| L15405–L15420 | Window + OS integration (`dcOpen`, `OS_OPEN.documents`, dock hook) | |
| L15421–L15493 | v42 blue accent, Pages / Plan pane, page actions, thumbnail reorder | |
| L15494–L16144 | `RD` = copy of the "remotion-documents" engine (blocks, templates, formula engine, PHQ-9/GAD-7, unzip, importers DOCX/ODT/HTML/EPUB/PPTX/DOC/PPT/RTF/ODS/JSONL, Markdown, NIR/NISS) | IIFE, exports at L16143 |
| L16145–L16362 | v43 converter old⇄new blocks, form fields, questionnaires, VAS, validation, table formulas, NIR in Document tab | |
| L16363–L16448 | v44 real pagination (continuation sheets) | |
| L16449–L16611 | `RDX` = copied export core (PDF writer with vector text, ZIP, CRC32) | |
| L16612–L17063 | v44 export: off-screen paginated host, flow model, writers DOCX/ODT/RTF/HTML/DOC/EPUB/PPTX/XLSX/ODS/JSONL/TXT/MD/PDF, export dialog | |
| L17064–L17156 | v45 Pages panel = real pages, Plan by page, two-way sync | |
| L17157–L17290 | `RDT` = 20 health-document families × 4 variants (French) | |
| L17291–L17411 | v46 templates: 80 health + RD practice templates, gallery | |
| L17412–L17480 | v46 Find & replace (Ctrl+F / Ctrl+H) | |
| L17481–L17575 | v46 Quality checker | |
| L17576–L17984 | v47 Import v2 readers (DOCX, HTML/EPUB, ODT, RTF, PPTX, spreadsheets, PDF) | |
| L17985–L18063 | v47 Import dialog | |
| L18064–L18239 | v48 Charts (12 kinds), clinical bands, ready-made charts | |
| L18240–L18452 | v49 Multi-person signing | |
| L18453–L18525 | v50 Ribbon fade/wheel, context menus | |
| L18526–L18631 | v51 Charts: more kinds, height resize, layout, legend, sort | |
| L18632–L18720 | v51 New elements (coloured sections, checklist, toggle, field presets, ready tables) | |
| L18721–L18777 | v52 Themes + chart palettes | |
| L18778–L18866 | v53 Tables (cell selection, merge/split, paste from spreadsheet, column resize) | |
| L18867–L18960 | v53 Columns layout, pagination flags, "My themes" with logo | |
| **L18962** | `const DC_OFF_PDF={…}` — **745,846 chars**, base64 blob | keys below |
| L18963–L19169 | v54 Exact forms (official PDFs filled on the page, pdf-lib) | |
| L19170–L19506 | v68 Word-exact renderer `wxConvert`, layout pass, Word pagination `wxPaginate` | |
| L19507–L19581 | v54 Print centre | |
| L19582–L19675 | v54 Entities, shared directory, optional API source | |
| L19676–L19862 | v54 Generic building blocks (lists, quote, spacer, QR, cover, letter header, place & date, stamp, attachments, key figures, steps, rating) + exact-form ribbon | |
| **L19864** | `const DC_WX_DOCX={…}` — **332,104 chars**, base64 blob | keys below |
| L19865–L20022 | v68 Word-exact documents in the editor (official Word forms, editing, fill progress, PDF, gallery, DOCX import "Word exact") + strings | |
| L20023–L20232 | v70 Import review (Markdown/text, .doc, heading levels, slides, PDF → editable exact pages) | |
| L20233–L20398 | v71 "Open as is": IndexedDB, engines registry, import mode, side panel, page tools | |
| L20399–L20560 | v71 Flow engine (web, EPUB, Markdown, text, RTF, .doc, ODT) | |
| L20561–L20688 | v71 Spreadsheet engine (XLSX, ODS, CSV, JSONL) + live recalc | |
| L20689–L20785 | v71 Slide engine (PPTX, PPT) | |
| L20786–L20842 | v71 Save back to Word (patches the original `.docx`) | |

Size (FACT): 6,502 lines; 2,230,766 chars, of which 1,077,950 are the two base64 blobs.

**Embedded blobs (FACT, sizes measured):**

| Const | Key | base64 chars | ≈ bytes | Content |
|---|---|---|---|---|
| `DC_OFF_PDF` L18962 | `vph-eval` | 216,656 | 162 KB | `Fiche-evaluation-des-besoins-VPH-2026.pdf` (L18964) |
| | `vph-preco` | 324,228 | 243 KB | `Fiche-de-preconisation-VPH.pdf` |
| | `vph-trial` | 93,168 | 70 KB | `Certificat-essai-en-conditions-reelles-VPH.pdf` |
| | `vph-engage` | 111,708 | 84 KB | `Formulaire-engagement-usagers-VPH.pdf` |
| `DC_WX_DOCX` L19864 | `vph-eval` | 70,500 | 53 KB | official Word form (DOCX) |
| | `vph-preco` | 178,716 | 134 KB | official Word form |
| | `vph-trial` | 82,820 | 62 KB | official Word form |

There is no DOCX for `vph-engage` (the PDF only, L19868 `DC_WX_ID`).

### 1.2 CSS

| Range | Content |
|---|---|
| L3775–L4352 | Base Documents styles: tokens `.dc-win`, nav, main, workspace, left pane, canvas, page, selection decor, blocks, web/read modes, right panel, status bar, drawer, popovers, modals, views, toast, print, responsive |
| L4353–L5107 | v43…v54 additions: form fields, pagination, export dialog, Pages/Plan, template gallery, find bar, quality check, import dialog, charts v2, signatures, ribbon/menus, v51 blocks, themes, tables/columns/my themes, exact forms, print centre, entities, generic blocks |
| L6672–L6807 | v68 Word-exact (`.wx-*`) and v71 "open as is" (`.dc-lv*`, spreadsheets, slides) |
| L6808–L6856 | Shared top-bar/narrow rules after v71 (INFERENCE: OS-wide, not Documents only) |
| **L1657–L1679** | **Not Documents**: desktop context menu `.dctx` plus `.dc-h`, `.dc-sep`, `.dc-wp`, `.dc-l`, `.dc-sw`. These class names **collide** with Documents classes (§13 D1) |

Class prefixes: `dc-` (editor), `wx-` (Word/"as is" renderer), `fd-` (RDT template HTML, converted before render), `dc-lv*` (v71).

### 1.3 Markup
No static markup. The window body is built by `dcBody()` (L14638) and mounted with `osWinOpen("documents",{cls:"dc-win",…})` (L15411). Print uses a temporary `#dc-print` element and a `#dc-print-style` `<style>` (L15367, L17059, L19567).

---

## 2. Screens, views, sub-pages

### 2.1 Library views (left nav `DC_NAV` L14641, titles `DC_VT` L15180)

| View | Entry | Purpose / content | States |
|---|---|---|---|
| Overview | nav `data-dgo="overview"` | 4 KPI tiles (documents, to review, published, this week), "Resume" 4 recent cards with live mini-pages, "To review" panel, quick templates, sample note (L15188–L15195) | empty review panel; KPI tiles link to lists |
| My documents / Shared / Favourites / Clinical / Recent / To review / Published / Archive / Trash | nav `data-dgo` | Table list: name, domain, status pill, updated; search `data-lq`, domain filter `data-ldom`, sort `data-lsort` (upd/name/dom); row menu `data-lmenu` (L15196–L15222) | empty list; Trash has a note (L15199); Trash rows open in read mode (L15182) |
| By domain (8: gen, health, psy, physio, rehab, letters, reports, cr) | nav `data-dtpl` | Opens Templates filtered by domain | |
| Templates | nav `templates` / "See all" | Collections tabs `data-tcol`: **Recommended** (8 ids `DC_RECO` L17373), **Professional** (`RD.BUILTIN_TPL`, 16), **Library** (`RDT` 20 families × 4 variants = 80, filters by category and profession), **Essentials** (`DC_TPL` 16, domain chips), **Official forms** (`off`: 4 VPH PDFs + 3 Word forms, L19149, L19997); search `data-tq` (debounced); cards with mini preview, flags, language, fills-by, minutes, signature, legal source | "no template" empty state (L17396); official thumbnails load async (L19154) |

### 2.2 Editor (DC.view = "editor")

| Area | Entry / function | Content |
|---|---|---|
| Header `dcHeadHTML` L14652 | – | burger (narrow), doc icon, title (click/double-click to rename L15109), star, status pill, ribbon tabs, collaborator avatars (simulated), Share split button, Comments (badge), History, Export split button, right-panel toggle |
| Ribbon `dcRibbonHTML` L14674 | tabs `data-rib`: File (opens menu), Home, Insert, Layout, References, Review, View, AI (L14658) | patched 9 times (find/replace, sign, import, print centre, generic blocks, exact/Word/as-is variants) |
| Left pane `dcLeftHTML` (redefined L15436, L17075) | toggle `data-dcmd="lp"` | Tabs **Pages** (real paginated thumbnails, grid/list, per-page actions up/down/dup/delete, drag to reorder) and **Plan** (outline grouped by page, search `data-olq`, filter chips `data-olc` head/text/clin…, condition/comment badges) |
| Canvas `dcCanvasHTML` L14691 | – | ruler with draggable margin markers, pages (`.dc-page`), view modes page / web / read (`data-dvm`), zoom 25–200 %, watermark, footer "page n of m" |
| Right panel `dcRightHTML` L14711 | tabs `data-rt` doc / styles / comps | **Document**: info, patient (+NIR/NISS check), practitioner, entities (v54), layout, statistics. **Styles**: theme gallery (8 themes), My themes + logo, colour, typography, quick styles, chart palette. **Components**: library (search, chips, groups, reusable blocks) → **Properties** of the selected block, sub-tabs General / Display / Condition (L14731) |
| Status bar `dcStatusHTML` L14698 | – | go-to page menu, word count (→ stats modal), document language menu, save state ("Saving…/All saved"), checker badge (v46), signing badge (v49), view mode, zoom slider, full screen |
| Find bar `dcFindHTML` L17423 | Ctrl+F / Ctrl+H, ribbon | query, match case, whole word, prev/next, replace one/all; uses CSS Custom Highlight API when present (L17422) |
| Drawers (`.dc-drawer`) | `data-ddraw` | **Comments** (open/resolved/all filters, new, reply, resolve, go to block) L15286 · **History** (versions, save, rename, restore) L15292 · **Assistant** (quick actions + local chat) L15334 · **Quality check** (v46) L17528 · **Signatures** (v49) L18358 |
| Exact form panel `dcExPanel` L19113 | doc kind `exact` | official-source banner, filled ring, Fill/Layout toggle, re-detect, clear, field list by page, field properties (label, type, merge source, comb), entities (v54) |
| Word panel `dcWxPanel` L19945 | doc kind `word` | fill progress, places to fill by page, files (save PDF / DOCX) |
| "As is" panel (v71) L20323 | `ex.live` | engine + fidelity box, notes, tools (text / mask / move), original file, convert, save to Word |

### 2.3 Dialogs (all via `dcModal` L15228, `role="dialog" aria-modal="true"`)

| # | Dialog | Entry | Notes / states |
|---|---|---|---|
| 1 | New document (cards: blank, template, import, AI) | `data-dcnew`, File ▸ New | "AI" tab = domain + brief → template marked `ai:true` (simulated, L15237) |
| 2 | Template preview | `data-tprev` | all pages as mini pages, Use button |
| 3 | Official form preview | `data-offprev` | renders PDF pages with pdf.js; loading state (L19160) |
| 4 | Share | `data-dshare` | invite by e-mail (regex check), roles, link access radio, copy link; banner "demo" (`dc_shareDemo`) — **Simulated** |
| 5 | Statistics | status bar words | pages, words, characters, blocks, reading time |
| 6 | Save reusable block | block menu / `data-bsave` | name required |
| 7 | Signature pad (simple sign block) | `data-sigpad` | canvas, clear, OK |
| 8 | Signing flow (multi-person) | signer pad / drawer | document preview, full name, Draw/Type tabs, consent checkbox, identity check (patient/guardian), decline with reason |
| 9 | Reset signatures | drawer | confirm |
| 10 | Assistant preview (before/after) | AI actions | Apply / cancel |
| 11 | Export | header Export, File ▸ Export | 15 formats in 5 groups, live preview (pages, text, web iframe sandboxed, EPUB reader, slides, sheet grid), file name, copy, download; progress bar; checker reminder; states preparing / ready / saved / zipped / declined / rate-limited / unavailable (L17037–L17038) |
| 12 | Import | New ▸ Import, Insert ▸ From a file, drop files on window | multi-file list with status (busy/ok/err), preview with stats, options: destination new/add, position, style exact/clean, PDF text/exact/form, Word editable/exact, fields detection, merge, mode Convert / Open as is (v71) |
| 13 | Print centre | Ctrl+P, File/View/Layout ribbon | destination print/PDF, pages all/current/range (click pages to toggle), size (5), orientation, margins (+custom mm), theme, watermark, footer, greyscale, backgrounds, certificate; preview 1/2/4 per row |
| 14 | Entity picker | `data-entpick` | directory search, optional API search with result count/error |
| 15 | API source settings | `data-entapicfg` | URL (https only), bearer token, test, delete |
| 16 | Exact-form signature pad | `data-exsg` | canvas, clear, delete, OK |

### 2.4 Menus (shared `osMenu`)
File menu (L15174), block menu (L18475, replaces L15167), locked-document menu (L18488), text menu (L18491), page menu (L18502), thumbnail menu (L18505), table-cell menu (L15171 + block actions L18524), list-row menu (L15219), share menu, export menu, plus 17 dropdowns in `dcDD` (para, font, size, color, hl, list, field, mg, or, psize, wm, theme, lh, zoom, goto, dlang/trlang, libf; L15136–L15155). The field menu is grouped by entity (L19598).

### 2.5 Document kinds (`d.kind`)
- *(none)* — block document (main editor).
- `exact` — PDF page images + positioned fields (L18971).
- `word` — Word-exact HTML pages from `wxConvert` (L19866).
- `word` + `ex.live` — "Open as is" (flow / fixed / grid / slides engines) (L20262).

---

## 3. Components and builders (HTML-string functions)

| Function | Line | Responsibility |
|---|---|---|
| `dcBody` / `dcRender` / `dcRefresh(part)` / `dcRefreshBlock` | L14638 / L14776 / L14787 / L14797 | shell, full render, partial re-render by area (`canvas/right/left/head/rib/status/all`) via `outerHTML` swaps |
| `dcNavHTML`, `dcHeadHTML`, `dcRibbonHTML`, `dcLeftHTML`, `dcThumbsHTML`, `dcPlanHTML`, `dcCanvasHTML`, `dcRulerH`, `dcStatusHTML`, `dcRightHTML` | L14643–L14711 | chrome |
| `dcBlockInner` / `dcBlockHTML` / `dcPageHTML` | L14593 / L14625 / L14630 | block and page renderers (patched 9 / 2 / 5 times) |
| `dcTitleHTML`, `dcEdA`, `dcRich`, `dcChip` | L14589–L14592, L14457 | editable attributes, rich text with merge-field chips |
| `dcChartSVG` (later redefined), `dcCSer`, chart kinds | L14617, L18090… | SVG charts |
| `dcFieldHTML`, `dcFieldCtl`, `dcQuestHTML`, `dcVasHTML` | L16256–L16277 | form fields, PHQ-9/GAD-7, VAS |
| `dcPropsHTML`, `dcPropsGen`, `dcPropsDisp`, `dcPropsCond` | L14730–L14757 | properties panel (Gen patched 6×) |
| `dcDocTabHTML`, `dcStylesHTML`, `dcCompsTabHTML`, `dcEntsHTML` | L14760, L14768, L14722, L19634 | right-panel tabs |
| `dcRow`, `dcRow2`, `dcInp`, `dcTg`, `dcSegH`, `dcSelH`, `dcBig`, `dcTb`, `dcDd`, `dcPill`, `dcMini`, `dcMHead`, `dcSetSeg`, `dcItemsEd` | L14670–L14717, L15183–L15184, L15233, L19793 | form/ribbon primitives |
| `dcModal`/`dcModalClose`, `dcPop`/`dcPopClose`, `dcMenuAt`, `dcToast(msg, undo)` | L15228, L14931, L14930, L14945 | overlays (toast has an Undo action) |
| `dcViewHTML`, `dcOverviewHTML`, `dcListHTML`, `dcTplHTML`, `dcTplCard` | L15185–L15206, L17376 | library |
| `dcCmtsHTML`, `dcHistHTML`, `dcAiHTML`, `dcCheckHTML`, `dcSigHTML` | L15286, L15292, L15334, L17528, L18358 | drawers |
| `dcXpHTML`, `dcImpPaint`, `dcPrintCenter`/`dcPrSettingsHTML`, `dcExPanel`, `dcWxPanel` | L16992, L18013, L19512, L19113, L19945 | big dialogs/panels |
| `dcPaginate`, `dcPgSplit`, `dcPgSplitTable`, `dcPagNow` | L16407, L16388, L16383, L16417 | DOM-measured pagination |
| `wxConvert`, `wxLayout`, `wxPaginate`, `wxPagesHTML`, `wxJoin` | L19191, L19394, L19452, L19506, L19496 | DOCX → exact HTML pages |
| Writers `dcMakeDOCX/ODT/RTF/HTML/DOC/EPUB/PPTX/XLSX/ODS/JSONL/TXT/MD/PDF` | L16683–L16952 | export |
| `RDX.makePDF`, `RDX.makeZip`, `crc32` | L16484, L16596, L16595 | file building without libraries |
| `RD.*` (engine copy) | L15498–L16144 | templates, formula engine, importers, NIR/NISS |
| `DC_QR` | L19678 | QR encoder (ISO/IEC 18004, byte mode, ECC M) |
| `dcSha256` | L18251 | pure-JS SHA-256 |
| `DCDB` | L20238 | IndexedDB wrapper (put/get/del/keys) |

**Block types (FACT, count of registry entries):** 18 base (L14411) + 17 form/questionnaire (L16206) + 4 charts (L18235) + 9 charts (L18619) + 27 v51 elements/presets (L18647) + 2 column layouts (L18922) + 13 generic blocks (L19728) = **90 library entries**. Many entries are presets that create an underlying type (`f_*` → `field`, `quest_*` → `quest`, `ps_*` coloured sections, `tb_*` ready tables, `chart_*` → `chart`).

**Templates (FACT):** 16 essentials `DC_TPL` (L14542) · 80 health templates `RDT` (20 families × 4, L17186–L17287) · 16 professional `RD.BUILTIN_TPL` (5 at L15780 + 11 at L15882) · 4 official PDFs (L18964) · 3 official Word forms (L19868). The brief says "17 practice templates": **UNKNOWN** — 16 found.

**Themes:** 8 document themes `DC_DTHM` (L18727), 5 chart palettes `DC_PALS` (L18723), 10 accent colours, user "My themes" with logo.

---

## 4. Interaction inventory

Delegation: one root listener set from `dcWire` (L14947) plus **~70 `document.addEventListener` handlers** in the range (16 keydown, 9 input, 9 change, 8 pointerdown, 5 pointermove, 5 pointerup, 3 click, 2 contextmenu, 2 scroll, 2 focusout, and others), 4 window `resize`, 1 `setInterval` (30 s status tick, L15416). `dcClick` is wrapped **26 times**. 228 distinct `data-*` action attributes are matched in handlers (320 `[data-…]` selectors in total).

### 4.1 Main controls

| Control | Where | Class |
|---|---|---|
| New document modal, blank, from template, duplicate, rename (inline), star, archive, trash, restore, purge | nav, File menu, row menu | Functional (L15223–L15225, L15219) |
| Ribbon Home: undo/redo, paragraph style, font, size, bold/italic/underline, colour, highlight, alignment, lists, indent, link (popover, URL validated), insert merge field | `dcCmd`, `dcDD`, `dcExec` | Functional, but uses deprecated `document.execCommand` (L14860) |
| Insert: add page, page break, all block types, from file | `data-dins`, `data-dcmd` | Functional |
| Layout: margins, orientation, paper size (A4/Letter only here), watermark, theme colour, line height, print centre | `dcDD` | Functional |
| References: table of contents, numbering on/off, insert field | | Functional |
| Review: new comment, comments drawer, spell check toggle (browser `spellcheck` attr), statistics, ask review / approve (status), find & replace, quality check, signatures | | Functional; "ask review"/"approve" only flip `status` (no workflow) |
| View: page / web / read, ruler, outline, panels, zoom, full screen (`osMax`) | | Functional |
| AI: assistant drawer, fix, improve, shorten, summary, conclusion draft | `dcAi` L15319 | Functional rule-based, local (regex dictionaries `DC_FILL`, `DC_IMP`; L15312–L15316); chat parses intent by keywords (L15337) — **Simulated "AI"** (no model) |
| Library: click to insert, drag to page, `+` button, search, chips, show descriptions/compact | | Functional |
| Block: select, grip drag-move (FLIP animation), side handles width resize with snaps, duplicate, delete, move up/down, more menu, save as reusable | L14900–L14923 | Functional |
| Ruler margin drag | L14925 | Functional |
| Scale dots (radio), VAS slider, form fields, questionnaires (scores, bands, item-9 flag) | | Functional |
| Body map zones toggle (uses Forms `feBodySVG`) | `data-dcan` | Functional |
| Table: Tab/Enter navigation, add/delete rows/cols, cell menu, cell range selection, merge/split, paste from spreadsheet, column resize, formulas `=SUM(A2:A5)` with cross-table refs | L15095, L18790–L18866, L16282 | Functional (formula edge case §13 D3) |
| Columns layout: gap drag, line toggle | L18911–L18918 | Present-not-verified |
| Chart: data editing in properties, kinds, height drag/keyboard, legend, sort, palette | L18189–L18631 | Present-not-verified (large) |
| Conditional display (source block/field, operator, value) | L14755–L14757, L16237 | Functional |
| Comments: add/reply/resolve/filter/go to | L15295–L15303 | Functional, authors fixed (seed names) |
| Versions: save (Ctrl+S), rename, restore (saves "before restore" first) | L15294, L15305 | Functional |
| Find & replace | L17435–L17459 | Functional |
| Quality checker: filters, go to, fix, fix all safe, ignore, group cycling | L17485–L17562 | Functional |
| Signing: setup, order seq/any, add/remove/move signers, role/name, sign (draw/type), decline, verify hash, reset, certificate toggle | L18240–L18452 | Functional on one device; legal value **Simulated** (`dc_sg_legal`) |
| Export: 15 formats, preview, copy, download via `window.claude.use("downloads")` else `<a download>` | L16955–L17063 | Functional (INFERENCE for byte-level correctness of each writer) |
| Import: 25 extensions (L17986), 3+ modes | L17985–L18063, v70, v71 | Present-not-verified per format (large parsers) |
| Exact forms: fill, check, radio/multi widgets, sign, layout mode (draw, move, resize, arrow keys, delete), re-detect, clear, export PDF with pdf-lib | L19066–L19145 | Present-not-verified (logic read, not run) |
| Word-exact: type in place, fill places (Enter/Tab next), tick boxes, save PDF, save DOCX | L19901–L19983, L20786 | Present-not-verified |
| "Open as is" tools: add text, mask area, move/delete added items; spreadsheet Enter/Tab + recalc | L20342–L20359, L20669–L20684 | Present-not-verified |
| Print centre | L19507–L19581 | Functional (uses `window.print`) |
| Entities: add/remove/edit, pick from directory, save to directory, API search/test | L19604–L19655 | Functional; API is real `fetch` to a user-set URL |
| Share / invite / roles / link access / copy link | L15256–L15262 | **Simulated** (local list; link domain `docs.remotion.health` is fake) |
| Collaborator avatars | L14653 | **Decorative** (seed people) |
| Drop files on window → import | L18061–L18063 | Functional |
| Drop image on canvas / image placeholder | L14989–L14990 | Functional |
| Paste in editable: sanitized HTML (`dcPasteClean`) | L14987, L14995 | Functional |

### 4.2 Keyboard shortcuts (FACT)

| Keys | Action | Line |
|---|---|---|
| Ctrl/⌘ Z, Ctrl Y / Ctrl Shift Z | undo / redo (blocked when signed-locked, L18292) | L15089–L15090 |
| Ctrl S | save a version | L15091 |
| Ctrl P | print centre (capture-phase global, L19576); older binding opens export | L15092 |
| Ctrl K (in text) | link | L15093 |
| Ctrl F / Ctrl H | find / replace; Enter next, Shift+Enter prev, Ctrl+Enter replace all, Esc close | L17462–L17467 |
| Tab / Enter in table cell | next cell / cell below (merge-aware L18863) | L15095–L15096 |
| Enter in heading/single-line | new paragraph after; Backspace in empty rich block deletes it | L15097–L15098 |
| Delete/Backspace (block selected) | delete block | L15103 |
| Ctrl D | duplicate block | L15104 |
| Alt ↑/↓ | move block | L15105 |
| Enter (block selected) | edit text | L15106 |
| Esc | close popover → modal → drawer → deselect | L15101 |
| Enter/Space on `.dc [role=button][tabindex]` | click | L15210 |
| ↑/↓ in export format list | change format | L17052 |
| Arrow keys / Shift (exact layout mode) | nudge field 1/5 pt; Delete removes | L19106–L19108 |
| Enter in checklist / attachment / step | new item; Backspace on empty removes | L18698, L19788 |
| ↑/↓ on chart height handle | resize | L18591 |

### 4.3 Counts by class (INFERENCE: grouped by control family, not by single button)

| Class | Count (families) |
|---|---|
| Functional (read end-to-end) | 34 |
| Present-not-verified | 9 |
| Partial | 2 (ask review/approve = status flip only; spell check = browser attribute only) |
| Simulated | 4 (share/invite/access, AI assistant "AI" naming, AI draft in New modal, legal e-signature value) |
| Decorative | 1 (collaborator avatars) |
| Broken | 1 (File ▸ Print opens export at last format, §13 D5) |

---

## 5. User journeys

1. **Open app → edit the sample report.** Dock/launcher → `dcOpen` (L15406) loads `remotion-docs` or seeds 9 docs (L14510) → editor on `d1`, EVA scale pre-selected (L15412). Type in a block → `dcOnEdit` (L14832) pushes one undo snapshot per typing burst (1.2 s), sanitizes rich HTML (`dcClean`), saves after 500 ms, refreshes thumbnails/pagination/checker. Cancel: Ctrl+Z.
2. **Create from template.** Templates view → collection/filters → Preview (modal) → Use → `dcCreateFromTpl` → `dcAddDoc` (L15223) opens it. Failure: unknown id falls back to blank (L14549, L17361).
3. **Import a file.** New ▸ Import or drop files → import dialog → each file parsed (`dcImpParse`, busy/ok/err per file) → choose destination (new / add into current at end/page/selection), style, PDF mode, Word mode, fields, merge, or v71 "Open as is" → Import. Errors shown per file; signed-locked documents refuse "add" (L18035). Files > 8 MB (exact PDF/Word) or > 60 MB (as is) are refused (L19164, L20011, L20312).
4. **Fill and export an official VPH form.** Templates ▸ Official forms → Use (PDF: `dcExOpenOfficial` L19042; Word: `dcWxOpenOfficial` L19883) → fields auto-detected and bound to patient/practitioner/entities → fill, tick, sign → export PDF (answers drawn on the original with pdf-lib, L19127–L19145) or save filled DOCX (L20839).
5. **Multi-person signing.** Review ▸ Signatures → Set up (practitioner + patient, sign blocks placed) → add witness/guardian, order → Sign now → modal (review doc, name, draw/type, consent, ID check) → first action freezes content (SHA-256 hash, undo cleared, edits reverted by `dcSave` guard L18289) → next signer → all done → certificate page added on export (L18438). Decline path records reason; Reset unlocks (L18354).
6. **Check before sharing.** Status-bar badge or Review ▸ Check → issues by severity → Go / Fix / Fix all safe / Ignore; export dialog shows a reminder (L17573).
7. **Print.** Ctrl+P → print centre → pages/range, layout, theme → Print (`window.print` on a print-only DOM) or Save as PDF (vector writer; exact forms via pdf-lib).
8. **Find and replace.** Ctrl+H → query/replacement → Replace all → toast with Undo.
9. **Entities from an API.** Document tab ▸ Entities ▸ API settings → URL + token → Test → pick entity → Search API (8 s timeout) → result fills the document.
10. **Open as is & save back to Word.** Import, mode "Open as is", DOCX → live doc (IndexedDB holds images/fonts/original) → edit paragraphs → Save as DOCX: only edited paragraphs rewritten in `word/document.xml`, rest of the ZIP kept (L20817–L20837).

---

## 6. State and persistence

### 6.1 Storage keys (FACT)

| Store | Key | Content | Line |
|---|---|---|---|
| localStorage | `remotion-docs` (`DC_KEY`) | whole store `dcS` as JSON | L14429, L14521, L14523 |
| localStorage | `remotion-docs-xp` | last export format | L16990–L16991 |
| localStorage | `remotion-dc-lvmode` | import mode `convert`/`live` | L20307–L20308 |
| IndexedDB | DB `remotion-docs-live` v1, object store `b` | per live doc key `lv…`: `{imgs, fonts, orig (ArrayBuffer < 25 MB), name, mime, at}` | L20238, L20265 |

Cross-window sync: a `storage` listener **outside this range** (L21041) reloads `dcS` when another window writes `remotion-docs`, but only when not in the editor.

### 6.2 `dcS` shape (FACT, assembled from code)
```
{ v:1, m2:1 (v42 migration flag), cur:"d1", order:[ids], docs:{id:Doc},
  reusable:[{id,name,blocks}], people:[[name, initials, colour, role, email?]],
  spell:false?, dir:[Entity] (v54 directory), api:{url, token}|null, myThemes:[Theme+logo] }
```
Doc: `id,title,dom,status(draft|review|pub|arch|trash),prev,star,owner(me|shared),by,upd,lang,clinic,tag,prat,date,country?,ref?,sample,tpl,imported`,
`pt{nom,prenom,dob,dossier,sexe,tel,email,adr,nir,mut,poids,taille}`, `pract{spec,rpps,addr,city,tel,mail,fee}`,
`set{size,or,mg,mgx,mgy,ftr,num,wm,font,fs,lh,acc,hcol,theme,pal,sec,tbl,rad,hfont,logo,cols{gid:{w,line}}}`,
`pages[{id,blocks[Block]}]`, `cmts[{id,b,txt,by,ini,at,res,rep[]}]`, `vers[{id,at,by,lbl,auto,snap(JSON)}]`, `chkIgn[]`, `acc` (link access),
`sig{mode,list[{id,role,name,st,at,img,how,idv,reason}],audit[],lock,lockAt,hash,doneAt,cert}`, `ents[{id,type,data}]`,
`kind:"exact"|"word"`, `ex{…}`, `exb64` (imported PDF bytes as base64).
Block common fields: `id,type,w,mt,al,cond{src,op,val},ai,cg,ci,keep,pgb,kn,nofit` + type-specific fields.

**Content values** can be i18n keys (`dc_…`) that render in the document language until edited (L14436–L14437). Merge fields: `{pt.nom}` references or `.dc-dyn` chips with `data-k`.

**Migrations:** only `v:1` accepted (L14521; anything else → reseed, i.e. silent data reset). `m2` flag turns old green accent into blue (L15425).

### 6.3 In-memory state
`DC` (view state, undo/redo arrays of JSON snapshots max 100, L14825), `DC.vp`/`vpOf` (visual pages), `DC.fd` (find), `DC.xp` (export job), `DC.imp` (import job), `DC.pr` (print job), `DC.exBg` (PDF page images cache), `DC.wxSrc`, `DC.wxIm`, `DC.wxPg`, `DC.wxThumb`, `DC.offThumb`, `DC.sigSnap`, `DC.lvW0`, `DC.clip` (block clipboard), `DC_TPLC` (template doc cache), `DC.aiMsgs`.

### 6.4 Timers
save debounce 500 ms (L14523), typing burst 1.2 s (L14833), thumbnails 380/900 ms, pagination 420 ms (L16416), checker 450 ms (L17567), find 120/300 ms, entity typing 600 ms, status tick 30 s interval (L15416), IndexedDB clean-up 6 s after open, deletes unused keys older than 1 h (L20273–L20274).

---

## 7. Integrations and external dependencies

| Item | How | Line |
|---|---|---|
| **pdf.js 3.11.174** | `feLoadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js")`, worker `pdf.worker.min.js` from the same CDN, `isEvalSupported:false` | L15379, L16354, L17935 (`dcPdfLib`), L18979 |
| **mammoth 1.6.0** | `feLoadScript(…/mammoth/1.6.0/mammoth.browser.min.js)` in the v1 DOCX import (later imports use the in-house DOCX reader) | L15378 |
| **pdf-lib 1.17.1** | `dcPdfLibW()` loads `…/pdf-lib/1.17.1/pdf-lib.min.js` when `window.PDFLib` is missing | L18976 |
| `feLoadScript` | defined in the **Forms** area (L14082): injects `<script src>` once | — |
| Google Fonts | `<link>` to `fonts.googleapis.com/css2` for Arimo, Tinos, Cousine, Carlito, Caladea (metric fallbacks) | L20255–L20256 |
| Entities API | `fetch(url/{type}?q=…, {Authorization: "Bearer "+token})`, 8 s `AbortController`, up to 50 results, fields whitelisted | L19624–L19625 |
| `window.claude.use("downloads")` | `dl.save({filename,data})`; formats not in `DC_DLOK` are zipped first; fallback `<a download>` | L16972–L16986 |
| Browser APIs | `navigator.clipboard` (read/write), `execCommand` (copy fallback, editing), `window.print`, `FileReader`, `Blob`/`URL.createObjectURL`, `CompressionStream`/`DecompressionStream` (ZIP), `FontFace`, `CSS.highlights`/`Highlight`, `ResizeObserver`, `crypto.randomUUID`, canvas 2D, `DOMParser`/`XMLSerializer`, `CSSStyleSheet.replaceSync`, IndexedDB, Web Animations API | various |
| Other apps | Forms: `FEI` icons, `feBodySVG`, `feBmLabel`, `feLoadScript`. OS: `OSW`, `osWinOpen`, `osMenu`, `osMax`, `osRestore`, `osFocus`, `osRelabel`, `dkOpenX`, `dkPop`, `dkGlyph`, `OS_OPEN`, `OS_DOCK`, `alStore`/`alSave`/`alTouch`, `lkRM` (reduced motion), `DKE` (escape), `I18N`, `LANGS`, `lang`, `t`, `nf`, `loc`, `toast`, `shell`. `OS_SOLO.documents` (L20980) for separate-window mode | |
| No backend | No server persistence, no collaboration transport. Comments, sharing and people are local | — |

---

## 8. i18n and RTL

- UI languages: **fr, en, de, ar** (FACT). About **1,839 `dc_*` keys**, each present in all 4 languages, in the shared dictionary line **L12310** (542,186 chars, shared with Forms). 8 more `(()=>{const D={fr,en,de,ar}…Object.assign(I18N[l],D[l])})()` blocks in range: L20018, L20152, L20229, L20362, L20557, L20685, L20782, L20842.
- Lookup: `t(key, vars)` for UI; `dcTx(v, L)` / `dcTv` render **content** in the **document language** `d.lang` (independent of UI language; status-bar menu `dlang`, L15153).
- Dates: `toLocaleDateString(LANGS[L].locale)`; numbers via `nf`.
- RTL: each page gets `dir="rtl"` when the document language is `ar` (L14630); exports set `dir`/`rtl` (DOCX `w:bidi`, HTML `dir`, PPTX). CSS uses logical properties (`border-inline-*`, `inset-inline`) and 9 `[dir=rtl]` rules. Width resize inverts dx in RTL (L14921). Note: PDF export warns about non-Latin text (`dc_xpPdfAr`, L17012) — standard PDF fonts cannot show Arabic (INFERENCE).
- Hard-coded languages: `RD` professional templates in English/French, `RDT` 80 templates in French, VPH catalogue French, PHQ-9/GAD-7 EN/FR only (L15685). Size units "o/Ko/Mo" are French for every UI language (L17041); paper labels use comma decimals (L15147, L19509).

---

## 9. Design tokens and motion

- Tokens on `.dc-win` (L3776): `--dc-acc #2f6bf0`, `--dc-acc2 #1f56d6`, `--dc-soft`, `--dc-blue`, `--dc-bsoft #e8f0fe`, `--dc-bg #eef1f4`, `--dc-chip`, `--dc-sh`, `--dc-ink #1d3557`. Dark mode: `:root.dark .dc-win` (L3777) + 9 `:root.dark` rules in range.
- Page variables set inline by `dcPageHTML`: `--pw --ph --mx --my --dfs --dlh --dff --dc-pacc --dc-hc`; canvas `--z`; minis `--k`; print `--pz`, `--prk`.
- Geometry: 100 % zoom ≈ 0.81 × real A4 (A4 = 640×905 px, L14575); margins narrow/normal/wide (L14578); points scaled ×1.075 (L14580).
- Accent palette `DC_THEMES` (10), chart palettes `DC_CPAL` + 5 named (colour-blind checked per comments L18065, L18722), clinical status colours `DC_CST`.
- Keyframes: `dcDraw dcFade dcGrow dcGrowX dcIn dcPgIn dcPop dcPulse dcShake dcSpin wxblink wxsecIn wxthIn`.
- JS motion via Web Animations: easings `cubic-bezier(.2,1,.3,1)` and spring `cubic-bezier(.2,1.3,.3,1)`, 200–380 ms; FLIP for block/page moves; tab "ink" underline. All guarded by `dcRM()` → `lkRM()`; CSS has 6 `prefers-reduced-motion` blocks.
- Responsive: container query `container: dc / inline-size` (L3778) with breakpoints 1600/1320/1100/880/620 px; `@media` 760/600/560/520; JS `narrow` class < 1100 px (L15414), `dcNarrow()` (L15069) turns panels into overlays (`o-nav`, `o-rp`, scrim).

---

## 10. Accessibility

| Observation | Evidence |
|---|---|
| Modals have `role="dialog" aria-modal="true" aria-label`, autofocus | L15228, L15231 |
| **No focus trap, no focus return** after close; Esc handled globally | L15232, L15101 |
| Tabs use `role="tablist/tab"` + `aria-selected` (ribbon, right panel, panes); no arrow-key roving | L14658, L14711 |
| Toggle buttons use `aria-pressed` (55 uses); scale = `radiogroup`/`radio` with `aria-checked` | L14600–L14602 |
| Toast `role="status" aria-live="polite"`; 8 `aria-live` regions (find count, export notes, API messages) | L14639, L17425 |
| 147 `aria-label`s; icons `aria-hidden` | grep |
| Mini previews/thumbnails strip `contenteditable`, `data-*`, `tabindex` | L14815–L14816 |
| Placeholders for empty editables via CSS `data-ph` (not announced) | L14589, L4001 |
| Signature: draw on canvas; the multi-person flow also offers "Type" (keyboard path); simple pad and exact-form pad are draw-only | L18320, L15268, L19085 |
| Charts `role="img"` with label; data table exported | L14623, L18238 |
| Context menus: custom (shared `osMenu`); right-click only, plus "⋯" button for blocks | L18509 |
| Drag-only operations: thumbnail reorder has buttons; block move has Alt+↑/↓; column/chart resize: chart height has keyboard, column gap and table column resize are pointer-only | L18591, L18846, L18914 |

---

## 11. Migration notes (Next.js App Router, TypeScript, React)

### 11.1 Patterns to replace
- **String rendering + `innerHTML`/`outerHTML` swaps** everywhere (`dcRefresh`, L14787). Move to React components with keyed lists.
- **Monkey-patching**: 191 `{const _x=fn;fn=function(){…_x()…}}` wrappers and ~25 full redefinitions (e.g. `dcClick` ×26, `dcRibbonHTML` ×9, `dcBlockInner` ×9, `dcRefresh` ×7, `dcImpParse` ×7). Many patches modify HTML with `String.replace` on markup (e.g. L17478, L19645, L20327). Behaviour depends on load order. Flatten into explicit modules: block-type plugins, ribbon config, drawer registry, importer/exporter registries.
- **~70 document-level listeners** and capture-phase handlers (Ctrl+P L19576, contextmenu L18509, drop L18062). Scope them to the app root or use a keyboard-shortcut hook bound to the focused window.
- **`contenteditable` + `document.execCommand`** (deprecated) for rich text, with a custom range save/restore (L14856–L14860). Use a real editor (TipTap/ProseMirror or Lexical) with custom nodes for merge-field chips.
- Pagination measures the live DOM after render (L16407, L19452) — must stay client-side (`useLayoutEffect`), and needs fonts loaded.
- Global mutable singletons `DC`, `dcS`, `RD`, `RDX`, `RDT` → a store (Zustand/Redux) + pure modules.

### 11.2 Client-only
Everything editor-related: canvas signature pads, pdf.js/pdf-lib, `FontFace`, `CSS.highlights`, IndexedDB, clipboard, `window.print`, `ResizeObserver`, DOM measurement. Template catalogue and pure engines can be shared/server-safe.

### 11.3 Pure TS candidates (extract almost unchanged)
`RD.tableCompute` formula engine (L15580), `parseNum/parseDate/fmtCell/totalRow`, `luhnOK/nirOK/nissOK` (L15941–L15943), `QUEST` PHQ-9/GAD-7 data + scoring (`dcQScore` L16232), `dcCondOk`, `dcNumbers`/`dcOutline`/`dcStats`, `dcCheck` rules (needs DOM part split out L17520), `DC_QR`, `dcSha256` (or WebCrypto), `unzip`/`makeZip`/`crc32`, `RDX.makePDF`, all writers (`dcMakeDOCX…`) operating on the `dcFlow` model (L16644), DOCX/ODT/RTF/EPUB/PPTX/DOC/PPT/ODS/XLSX/CSV readers, `wxConvert` (DOCX → HTML model), `dcLvSaveDocx` paragraph patcher, signing state machine (`dcSig*`), entity model, template definitions (`DC_TPL`, `RDT`, `RD.BUILTIN_TPL`, `VPH_CAT`), themes/palettes, chart data helpers.

### 11.4 Suggested decomposition
`app/(os)/documents/` → `DocumentsApp` (layout) · `LibraryNav` · `Overview` · `DocList` · `TemplateGallery` (collections, cards, preview) · `Editor` { `EditorHeader`, `Ribbon` (tab config), `PagesPane` / `PlanPane`, `Canvas` (`Page`, `BlockRenderer` registry by type, `Ruler`, `SelectionDecor`), `RightPanel` { `DocumentTab`, `EntitiesSection`, `StylesTab`, `ComponentLibrary`, `PropertiesPanel` (General/Display/Condition, per-type editors) }, `StatusBar`, `FindBar`, drawers `Comments`/`History`/`Assistant`/`QualityCheck`/`Signatures` } · dialogs `NewDocument`, `ExportDialog`, `ImportDialog`, `PrintCenter`, `SigningFlow`, `SignaturePad`, `EntityPicker`, `ApiSourceSettings`, `ShareDialog` · alternate canvases `ExactFormCanvas`, `WordExactCanvas`, `LiveDocCanvas` (flow/fixed/grid/slides). Libraries: `lib/documents/{model,store,engine,formula,pagination,export/*,import/*,word/*,signing,qr,checker,templates/*}`.

### 11.5 Security and privacy
- **Health data in localStorage, unencrypted** (patient identity, NIR, signatures as PNG data URLs, imported PDFs as base64) — `remotion-docs` (L14523). Seed data is clearly sample (L14467, `dc_samplePt`).
- **API bearer token stored in plaintext** in `dcS.api.token` in localStorage (L19630). Only `https://` URLs accepted (L19630).
- Sanitising: `dcClean` removes script/style/iframe/object/embed/link/meta, `on*` attributes and `javascript:` URLs (L14439–L14444); paste whitelist (L14995). Imported style sheets are scoped and drop `@import`, but `url(…)` inside them is kept (L20404) → remote fetch from imported HTML/EPUB CSS (**RISK**, privacy). Export preview iframes use `sandbox=""` (L17024).
- Simulated sharing/permissions; e-signature is "in person on this device", no identity proof beyond a checkbox (L18324). Must not be presented as legally binding in production.
- CDN scripts loaded at runtime without SRI (`feLoadScript`) — **RISK**; bundle them.

### 11.6 Complexity
**XL** (high confidence). ~5,400 lines of dense logic (excluding blobs), 90 block entries, 15 export formats, 25 import extensions × 3 modes, 3 alternate document kinds with their own renderers, DOM-measured pagination, signing, print centre. Uncertainty: the import/export engines and `wxConvert` were read only at the outline level; fidelity of each format is UNKNOWN until tested with real files.

---

## 12. Counts summary

| Item | Count |
|---|---|
| JS lines (range) | 6,502 (2.23 M chars; 1.08 M in 2 blobs) |
| CSS lines (Documents) | ≈1,469 (L3775–L5107, L6672–L6807) + 21 colliding lines L1659–L1679 |
| Library views | 11 lists/overview + template gallery with 5 collections |
| Editor areas | header, ribbon (8 tabs), left pane (2 tabs), canvas (3 view modes), right panel (3 tabs + properties 3 sub-tabs), status bar, find bar |
| Drawers | 5 |
| Dialogs | 16 |
| Menus | 10 context/button menus + 17 dropdowns |
| Document kinds | 4 (blocks, exact PDF, Word-exact, live "as is") |
| Block library entries | 90 |
| Templates | 16 essentials + 80 health + 16 professional + 4 official PDF + 3 official Word |
| Themes / palettes | 8 / 5 (+ user themes) |
| Chart kinds | 12 (v48) + more in v51 (hbar, pie, donut, pct, stacked, scatter, range, pair) |
| Export formats | 15 (+ print) |
| Import extensions | 25 |
| Wrapper patches / redefinitions | 191 / ~25 |
| Document-level listeners | ~70 |
| Distinct `data-*` actions | 228 |
| Keyboard shortcuts | 17 groups |
| Storage keys | 3 localStorage + 1 IndexedDB DB |
| External libs | pdf.js 3.11.174, mammoth 1.6.0, pdf-lib 1.17.1, Google Fonts (5 families) |
| Network calls | CDN scripts, Google Fonts CSS, optional entities API |
| Interaction families by class | Functional 34 · Present-not-verified 9 · Partial 2 · Simulated 4 · Decorative 1 · Broken 1 |
| i18n | 4 languages, ≈1,839 `dc_*` keys + 8 in-range supplements |

---

## 13. Defects and inconsistencies (record only)

| # | Current behaviour | Expected | Evidence |
|---|---|---|---|
| D1 | **CSS class collision.** The desktop context menu defines `.dc-h{padding:6px 10px 8px;display:flex;align-items:baseline;justify-content:space-between}`, `.dc-sep{height:1px;background:var(--line);margin:6px 4px}`, `.dc-sw button{aspect-ratio…}`. Documents uses the same names for headings, separators and swatches and does not reset `padding`/`justify-content`/`background`. Document headings get extra padding; dotted/line separators get an extra 1 px solid band (INFERENCE on visuals) | Unique prefixes | L1659–L1679 vs L3998–L4001 and `.dc-sep` rules |
| D2 | `dcSave` swallows `localStorage` errors and still shows "All saved". Exact-PDF import allows 8 MB files, stored as base64 (`exb64`) in the same key → quota exceeded → silent loss | Report failure; store binaries in IndexedDB | L14523, L19164, L19041 |
| D3 | Formula engine `tableByName` uses an undefined global `S` (`tablesIn(S.doc)`) → a reference to an unknown table name gives a JS `ReferenceError` message in the cell instead of `#REF!` (INFERENCE) | `#REF!` | L15579 |
| D4 | Ctrl+P handler is global, capture phase, with `stopImmediatePropagation`; it fires whenever the Documents window exists and is not minimised, even if another app window has focus | Only when Documents is focused | L19576 |
| D5 | File ▸ Print (labelled "Ctrl P") calls `dcExport("pdf")`, which opens the **export dialog at the last-used format** (e.g. DOCX) instead of printing | Open print centre | L15174, L17056 |
| D6 | Paper size in the Layout ribbon and Document tab offers only A4/Letter, the print centre offers A4/A5/Letter/Legal/A3 | One list | L15147, L14765, L19509 |
| D7 | Store version: any `v` other than 1 → whole store replaced by seed data (no migration path) | Versioned migrations | L14521 |
| D8 | Multi-window: other windows reload only list views; an open editor keeps its copy and its next save overwrites changes from the other window | Conflict detection | L21041 (outside range), L14523 |
| D9 | Signature pad click handler has a dead condition `if(DC.vm!=="read"||true)` → pad opens in read mode too | Intended rule unclear | L15061 |
| D10 | Size units "o/Ko/Mo" and comma-decimal paper labels shown in every UI language | Localised | L17041, L15147, L19509 |
| D11 | First `dcChartSVG` writes two `style` attributes on line points (second ignored); function is later redefined, so likely dead code | — | L14621 |
| D12 | "17 practice templates" in brief vs 16 `RD.BUILTIN_TPL` in code | UNKNOWN | L15780–L15893 |
| D13 | Imported style sheets keep `url(...)` → remote requests from imported web pages/EPUB CSS | Strip or proxy | L20404 |
| D14 | Undo stack holds up to 100 full-document JSON snapshots including data-URL images/signatures → memory growth on large docs (RISK) | Patches/diffs | L14825 |
| D15 | Collaboration indicators (avatars, invite, roles, link access) are local only; share link domain is fictional | Label as demo or implement | L14653, L15256–L15262 |
