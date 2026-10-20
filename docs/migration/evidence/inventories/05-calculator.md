# 05 · Calculator & scientific tools (v58) — inventory

App key `calcsci` (alias `calculator`). Window title from I18N key `calcsci` ("Calculatrice & outils scientifiques" / "Calculator & scientific tools" / "Rechner & wissenschaftliche Werkzeuge" / Arabic), L12310.
Read-only audit of `Remotion_Desktop.html`. All `Lnnnnn` refer to FILE lines. Runtime claims marked **(verified-run)** were checked by loading L21068–L22563 in a Node `vm` sandbox with stubbed DOM/OS globals (harness in `evidence/calc-harness/harness.js`). Every generic tool was run with its default inputs.

---

## 1. Scope & line ranges

| Part | Lines | Notes |
|---|---|---|
| Engine: `CaErr`, settings store, tokenizer, Pratt parser, numerics, evaluator, formatting | L21068–L21267 | header comment: "engine (no eval, no Function)" (L21068) |
| Units registry, quantities, constants library | L21268–L21372 | `CA_UD` 34 categories (L21270–L21318), `CA_FUEL` L21320, `CA_CONSTS` 30 rows L21352–L21363 |
| App shell: L4, strings, errors, icons, registry, render, nav, home, generic tool renderer, history, dialogs, global events | L21373–L21610 | `CAW` L21375, `CA_ERR` L21397, `CAI` L21423, `caDef` L21437, `CA_SECS` L21438 |
| Math tools (hist/saved pages + section C) | L21701–L21822 | 19 math tools + 2 history pages |
| Scientific tools (section D) | L21823–L21958 | 13 generic sci tools |
| Interactive pages: standard, scientific, graph, editor, converters (34), constants, unit-aware expressions, programmer | L21959–L22247 | |
| Engineering, finance, dates, programmer utilities, specialised, custom formulas, settings, library, extra error strings | L22248–L22563 | |
| OS integration (dock, launcher, desktop shortcut, relabel, storage sync) | L22564–L22598 | |
| **Total JS** | **L21068–L22598 = 1,531 lines, ≈405 KB** (longest line 2,328 chars, L21328) | no giant base64/i18n lines in this range |
| Out-of-range hooks | L20979–L20981 (`OS_SOLO.calcsci`, `osSoloKey` maps `calculator`→`calcsci`, app mode / separate window), L11857 dock key map, L12310 I18N `calcsci` |
| **CSS** | **L5154–L5585** (432 lines, ≈40 KB, 117 distinct `.ca-*` classes) | sections (css_outline): nav L5172, main L5200, cards/forms L5225, results L5270, charts L5313, home L5326, history L5350, standard L5375, scientific L5412, graph L5426, editor L5448, converters L5481, programmer L5509, settings L5515, dialogs/toast/scrim L5526, responsive L5541, app mode L5577, LTR keypads L5582 |
| Class prefix | `ca-` (window class `ca-win`, root `.ca`) | keyframes `caFade`, `caPop`, `caHit`, `caRip` |
| Markup ids | none in static markup; window body created at runtime (`caBody()` L21447); only runtime id `ca-qx` (quick calc) and `ca-cvv` (converter input), plus `ca-<tool>-<field>` field ids (L21493) |

FACT: no `eval(`, `new Function`, `Function(` or string `setTimeout` exists in L21068–L22598 (grep count 0). Expressions are tokenized (L21080), parsed by a hand-written Pratt parser into an AST (L21096–L21130) and interpreted by a `switch` over node kinds (L21196–L21225). Custom formulas, graph functions, solver/integral inputs, editor lines and numeric fields all go through `caParse`/`caEvalAst`.

---

## 2. Screens / views / sub-pages

### 2.1 Shell layout (always present)
Rendered by `caRender` (L21448): `nav.ca-nav` + `main.ca-main` (header + `.ca-pg` page) + `aside.ca-hp` (history panel) + `.ca-scrim` + `.ca-toast`.
Responsive size class set by JS, not by media query: `caSize()` L21451 sets `data-sz` = `s` (<700 px), `m` (<1080 px), `l`. ResizeObserver in `caOpen` L22586.

| View / panel | Entry point | Purpose / content | States |
|---|---|---|---|
| Navigation sidebar (`.ca-nav`) | always (l/m); drawer via ☰ `[data-canav]` on `s` | search box `[data-caq]`, Home item, 10 collapsible sections (`[data-catog]`), tool items with favourite star, sliding ink marker `.ca-ink` (L21470) | search results (max 60) / "No tool matches." (L21455) |
| Header (`.ca-hd`) | always | menu button (s only), section label + tool title, favourite toggle `[data-cafav]` (tools without `nofav`), angle chip DEG/RAD/GRAD `[data-caang]`, history toggle `[data-cahist]`, settings `[data-cago=settings]` (L21460–L21466) | |
| History panel (`aside.ca-hp`) | header history button; Esc/scrim closes on s/m | search `[data-cahq]`, last 80 entries, "See all" → `hist`, Clear (keeps starred) (L21547) | empty "Nothing yet"; side column on `l`, overlay drawer on `m`/`s` (CSS L5542–L5544) |
| Scrim | nav or history open on `s` | click closes both (L21585) | |
| Toast (`.ca-toast`, role=status) | copy, keep, settings change, delete-with-undo (4 s, L21596) | | |
| Home (`view="home"`) | initial view; nav Home; `caGo("home")` | Quick calculation input `[data-caquick]` with live result; Favourites tiles; Recent tiles (8); 10 section cards with first 8 tools + "See all (n)" `[data-casec]` (L21484–L21489) | fav/recent sections hidden when empty; live error text in `.ca-qr.bad` |

### 2.2 Tool pages
126 registry entries (full table in §2.4): 80 generic form tools + 46 custom pages. Sections (`CA_SECS` L21438–L21439): `calc` Calculators (6), `conv` Converters (34), `math` Mathematics (19), `sci` Scientific tools (15), `eng` Engineering (16), `fin` Finance (15), `date` Dates and time (8), `prog` Programmer (4), `spec` Specialised calculators (7), `lib` Settings and library (2).

Generic tool page (`caToolHTML` L21507–L21511): optional description, optional `warnTop` warning (only `health`), example chips (only `frac` has `ex`), Inputs card (fields, Reset, "Add to history"), Result card `[data-cares]` (aria-live polite). Result card (`caResHTML` L21526–L21534): main value + unit + copy button + badge (Exact / Numerical approximation / Closed form…), rows (`dl`), warnings, table (first 600 rows + CSV export), SVG figure, Formula, Method, Assumptions, extra HTML.
States: idle (`run` returns null → "Fill in the inputs to see the result." L21523), error (`.ca-err` with localized message L21522), success. Rendering exceptions in `page()` are caught and shown as error card (L21467).

### 2.3 Custom pages (non-generic)
| Page id | Builder / mount | Content | Lines |
|---|---|---|---|
| `hist` History | `caHistPageHTML(false)` | search, section filter segment (first 8 sections only), CSV/JSON export (selected rows or all filtered), Clear; full rows with checkbox, reopen, star, copy, duplicate, rename, note, delete | L21702–L21708 |
| `saved` Saved calculations | `caHistPageHTML(true)` | same list filtered to `fav` entries, no Clear button | L21703 |
| `std` Standard | `caStdHTML`/`caStdPaint` | display (previous expr, current, live preview, memory indicator), memory row MC/MR/M+/M−/MS, ( ), copy, tape toggle; 24-key keypad (`CA_SK` L21966); calculation tape aside (60 entries, click to reuse) | L21965–L22000 |
| `sci` Scientific | `caSciHTML`/`caSciPaint` | free-text expression input with live preview and column-positioned error; variable chips (STO'd vars); 30 function keys with 2nd/hyp toggles (`CA_SCIK` L22004–L22010) + 19 numeric keys | L22002–L22033 |
| `graph` Advanced: function plots | `caGrHTML`/`caGrMount` | 4 function inputs (`f1..f4`), x/y window fields, Zoom +/−, Fit y, Reset; SVG plot with grid, wheel zoom, drag pan, hover tooltip + cursor line; zeros list per function (≤6) | L22035–L22064 |
| `editor` Expression editor | `caEdHTML`/`caEdPaint` | toolbar (Language reference toggle, Examples, Copy results, TXT, CSV, Save (named, starred), Clear w/ confirm); line gutter; syntax-highlighted overlay `<pre>` under transparent `<textarea>`; per-line results column (click to copy); autocomplete listbox; collapsible language reference card | L22071–L22108 |
| `cv_<cat>` ×34 Converters | `caCvHTML(cat)`/`caCvPaint(cat)` | From value + searchable unit picker (listbox), swap button, To output + picker; exact/approximate badge + formula + copy; precision select (3–15 s.f.); Clear, Favourite conversion, Add to history; shortcut chips (`CA_CV_PRE` L22110 + user favourites); "In every unit" table | L22109–L22138 |
| `consts` Constants and reference tables | `caConstHTML`/`caConstPaint` | search, kind filter (All/Exact/Measured/Mathematical/Conventional/Custom), table (symbol, @id, name, value, unit, uncertainty, kind+source badge, copy, insert-into-editor, delete for custom); "Add a custom constant" form | L22190–L22202 |
| `uexpr` Unit-aware expressions | inline page + `caUxPaint` | single big input, live result, 8 example chips, `<details>` list of all units per category | L22203–L22207 |
| `prog` Programmer calculator | `caPgHTML`/`caPgPaint` | value + base select (BIN/OCT/DEC/HEX, converts value on change), width 8–128/unbounded, signed/unsigned segment, bitwise op (16 ops), operand B; result DEC/HEX/OCT/BIN/unsigned/signed/range, operation result, overflow warnings, clickable bit grid | L22217–L22247 |
| `custom` Custom formulas | `caCfHTML`/`caCfPaint` | name, expression, note; variables auto-detected → input fields; live result; New / Delete (confirm) / Save; "My formulas" tiles | L22497–L22521 |
| `settings` Settings | `caSetHTML` | display precision, notation, fixed decimals, angle mode, decimal & thousands separators, money rounding, default currency, history size, live preview; Custom units (add/delete); Keyboard shortcuts reference; Import/Export JSON; Reset everything (confirm) | L22522–L22541 |
| `library` Library | inline page | stored variables (delete), shortcut tiles to consts/custom/saved/hist/settings | L22542–L22543 |

### 2.4 Dialogs, drawers, popovers
| Element | Builder | Used by | A11y |
|---|---|---|---|
| Prompt dialog `.ca-dlg > form.bx` | `caPrompt` L21559 | history rename / note, STO variable name, editor Save name | no role/aria-modal, no focus trap; Esc closes; focus not restored |
| Confirm dialog `.ca-dlg > .bx[role=alertdialog][aria-modal]` | `caConfirm` L21561 | clear history, clear editor, delete formula, reset everything | focus on OK (danger) button; Esc closes; no trap |
| Nav drawer (size s) | CSS L5547–L5549 | ☰ / section "See all" | |
| History drawer (sizes s, m) | CSS L5542–L5544 | header history button | |
| Unit picker dropdown `.ca-upd` (listbox) | `caUnitPick` L22113 | converters | arrow/Enter/Esc keyboard (L22180–L22181) |
| Editor autocomplete `ul.ca-ac[role=listbox]` | `caEdAc` L22101 | editor | arrow/Enter/Tab/Esc (L22182) |
| Editor language reference card | `caEdRefHTML` L22077 | editor | `aria-expanded` on toggle |
| Graph tooltip `.ca-grtip` | L22058 | graph hover | pointer only |
| Toast with Undo | `caToastUndo` L21596 | history delete | |

### 2.5 Complete tool / page registry (`CA_T`, 126 entries)

`caDef(id, sec, opts)` L21437. Opts used: `n` (4-language name), `ic` icon, `kw` search keywords, `d` description, `f` fields, `run(c)`, `page()`, `mount()`, `reopen(h)`, `onAng()`, `ex` examples, `warnTop`, `nofav`, `idle`, `cat`. No entry is `hidden`. Order below = registration order (also the order used for page-transition direction, `CA_ORDER` L21474). "default run" = result of `run()` with default field values **(verified-run)**, angle mode DEG, language EN.

| # | id | section | English name | kind | defined | fields / default result |
|---|---|---|---|---|---|---|
| 1 | `hist` | calc | History | custom page | L21702 |  |
| 2 | `saved` | calc | Saved calculations | custom page | L21703 |  |
| 3 | `frac` | math | Fractions | generic form | L21711 | fields: mode:seg,a:text,op:sel,b:text,x:num,md:int; modes: mode=op/dec ; op=+/-/*//; default run → Result = 19/12 |
| 4 | `pct` | math | Percentages | generic form | L21719 | fields: mode:sel,x:num,y:num,a:num,b:num; modes: mode=of/what/chg/inc/dec/rev; default run → Result = 12 |
| 5 | `ratio` | math | Ratios and proportions | generic form | L21729 | fields: mode:seg,a:num,b:num,c:num,tot:num; modes: mode=solve/simp/split; default run → x = 12 |
| 6 | `powroot` | math | Powers and roots | generic form | L21736 | fields: x:num,y:num; default run → xⁿ = 1,024 |
| 7 | `logs` | math | Logarithms | generic form | L21738 | fields: x:num,b:num; default run → log_b(x) = 3 |
| 8 | `fact` | math | Factorials | generic form | L21740 | fields: n:int; default run → n! = 15,511,210,043,330,985,984,000,000 |
| 9 | `prime` | math | Prime numbers | generic form | L21743 | fields: n:text,lim:int; default run → Is n prime? = No |
| 10 | `gcd` | math | GCD and LCM | generic form | L21751 | fields: l:text; default run → GCD = 42 |
| 11 | `seq` | math | Sequences and series | generic form | L21755 | fields: t:seg,a1:num,r:num,n:int,ex:text,lo:int,hi:int,pr:chk; modes: t=ar/ge/sum; default run → uₙ = 29 |
| 12 | `cplx` | math | Complex numbers | generic form | L21763 | fields: a:text,op:sel,b:text,n:num; modes: op=+/-/*///pow/sqrt/exp/ln/one; default run → z = 11 − 2i |
| 13 | `mat` | math | Matrices and vectors | generic form | L21770 | fields: op:sel,A:area,B:area,n:int; modes: op=det/inv/tr/rank/trace/mul/add/sub/pow; default run → det(A) = 18 |
| 14 | `sys` | math | Systems of equations | generic form | L21781 | fields: M:area; default run → Unique solution = x₁ = 2   x₂ = 3   x₃ = −1 |
| 15 | `poly` | math | Polynomials | generic form | L21789 | fields: c:text,x:num; default run → Roots (3) = 1 ;  2 ;  3 |
| 16 | `solve` | math | Equation solver | generic form | L21795 | fields: eq:text,a:num,b:num; default run → x = −1 ;  −0.61803398875 ;  1.61803398875 |
| 17 | `ineq` | math | Inequality solver | generic form | L21799 | fields: f:text,rel:sel,a:num,b:num; modes: rel=>/>=/</<=; default run → x ∈ = [−10 ; −2[ ∪ ]2 ; 10] |
| 18 | `integ` | math | Numerical integration | generic form | L21806 | fields: f:text,a:num,b:num; default run → ∫ₐᵇ f(x) dx = 0.746824132812 |
| 19 | `deriv` | math | Numerical differentiation | generic form | L21808 | fields: f:text,x:num,o:seg; modes: o=1/2; default run → f′(1) = 0.05235544717 |
| 20 | `limit` | math | Limits | generic form | L21811 | fields: f:text,to:sel,a:num,side:seg; modes: to=a/inf/minf ; side=both/l/r; default run → ≈ lim = 0.0174532925 |
| 21 | `symb` | math | Symbolic simplification (polynomials) | generic form | L21818 | fields: e:text; default run → Result = x³ + 2x² + 5x + 1 |
| 22 | `trig` | sci | Trigonometry and triangles | generic form | L21829 | fields: m:sel,t:num,a:num,b:num,c:num,C:num,A:num,B:num; modes: m=val/sss/sas/asa/ssa; default run → Area = 14.6969384567 |
| 23 | `geo` | sci | Geometry: areas and volumes | generic form | L21844 | fields: sh:sel,r:num,t:num,w:num,h:num,d:num,n:num,s:num,a:num,b:num; modes: sh=circle/sector/rect/poly/ellipse/trap/sphere/cyl/cone/box/pyr; default run → Volume = 141.371669412 |
| 24 | `pyth` | sci | Pythagorean theorem | generic form | L21859 | fields: find:seg,a:num,b:num,c:num; modes: find=c/a/b; default run → c = 5 |
| 25 | `coord` | sci | Coordinate geometry | generic form | L21861 | fields: x1:num,y1:num,z1:num,x2:num,y2:num,z2:num; default run → Distance = 5 |
| 26 | `vec` | sci | 2D and 3D vectors | generic form | L21866 | fields: u:text,v:text; default run → u · v = 12 |
| 27 | `stats` | sci | Descriptive statistics | generic form | L21872 | fields: x:area,w:area,pop:seg,cl:sel,p:num; modes: pop=s/p ; cl=/0.9/0.95/0.99; default run → Mean = 15 |
| 28 | `regr` | sci | Regression and curve fitting | generic form | L21888 | fields: d:area,m:sel,x0:num; modes: m=lin/exp/pow/log/quad; default run → Fitted model = y = −0.02 + 2.02·x |
| 29 | `dist` | sci | Probability distributions | generic form | L21904 | fields: d:sel,mu:num,sg:num,n:int,p:num,lam:num,df:num,a:num,b:num,x:num,x2:num,q:num; modes: d=norm/binom/pois/t/expo/unif; default run → f(x) = 0.0584409443335 |
| 30 | `comb` | sci | Combinatorics | generic form | L21921 | fields: n:int,k:int,g:text; default run → C(n, k) = n! / (k!(n−k)!) = 2,598,960 |
| 31 | `scinot` | sci | Scientific notation and significant figures | generic form | L21926 | fields: x:text,sf:int; default run → Significant figures = 4 |
| 32 | `errprop` | sci | Error propagation | generic form | L21934 | fields: f:text,a:num,ua:num,b:num,ub:num,c:num,uc:num; default run → f ± u(f) = 28.044 ± 1.5 |
| 33 | `dim` | sci | Dimensional analysis | generic form | L21948 | fields: u:text,v:text; default run → SI dimension = m²·kg / s² |
| 34 | `prec` | sci | Numerical precision (IEEE 754) | generic form | L21953 | fields: x:text; default run → Exact stored value = 0.1000000000000000055511151231257827021181583404541015625 |
| 35 | `std` | calc | Standard | custom page | L22000 |  |
| 36 | `sci` | calc | Scientific | custom page | L22033 |  |
| 37 | `graph` | calc | Advanced: function plots | custom page | L22064 |  |
| 38 | `editor` | calc | Expression editor | custom page | L22107 |  |
| 39 | `cv_length` | conv | Length | custom page | L22138 (loop) |  |
| 40 | `cv_area` | conv | Area | custom page | L22138 (loop) |  |
| 41 | `cv_volume` | conv | Volume | custom page | L22138 (loop) |  |
| 42 | `cv_mass` | conv | Mass | custom page | L22138 (loop) |  |
| 43 | `cv_temp` | conv | Temperature | custom page | L22138 (loop) |  |
| 44 | `cv_dtemp` | conv | Temperature differences | custom page | L22138 (loop) |  |
| 45 | `cv_time` | conv | Time and duration | custom page | L22138 (loop) |  |
| 46 | `cv_speed` | conv | Speed | custom page | L22138 (loop) |  |
| 47 | `cv_accel` | conv | Acceleration | custom page | L22138 (loop) |  |
| 48 | `cv_force` | conv | Force | custom page | L22138 (loop) |  |
| 49 | `cv_pressure` | conv | Pressure | custom page | L22138 (loop) |  |
| 50 | `cv_energy` | conv | Energy | custom page | L22138 (loop) |  |
| 51 | `cv_power` | conv | Power | custom page | L22138 (loop) |  |
| 52 | `cv_torque` | conv | Work and torque | custom page | L22138 (loop) |  |
| 53 | `cv_freq` | conv | Frequency | custom page | L22138 (loop) |  |
| 54 | `cv_angle` | conv | Angle | custom page | L22138 (loop) |  |
| 55 | `cv_data` | conv | Data storage | custom page | L22138 (loop) |  |
| 56 | `cv_rate` | conv | Data transfer rate | custom page | L22138 (loop) |  |
| 57 | `cv_fuel` | conv | Fuel consumption | custom page | L22138 (loop) |  |
| 58 | `cv_density` | conv | Density | custom page | L22138 (loop) |  |
| 59 | `cv_flow` | conv | Flow rate | custom page | L22138 (loop) |  |
| 60 | `cv_current` | conv | Electric current | custom page | L22138 (loop) |  |
| 61 | `cv_voltage` | conv | Voltage | custom page | L22138 (loop) |  |
| 62 | `cv_resist` | conv | Resistance | custom page | L22138 (loop) |  |
| 63 | `cv_capac` | conv | Capacitance | custom page | L22138 (loop) |  |
| 64 | `cv_induct` | conv | Inductance | custom page | L22138 (loop) |  |
| 65 | `cv_magnet` | conv | Magnetic field | custom page | L22138 (loop) |  |
| 66 | `cv_dose` | conv | Absorbed dose (health-adjacent) | custom page | L22138 (loop) |  |
| 67 | `cv_eqdose` | conv | Equivalent dose (health-adjacent) | custom page | L22138 (loop) |  |
| 68 | `cv_activity` | conv | Radioactivity (health-adjacent) | custom page | L22138 (loop) |  |
| 69 | `cv_molconc` | conv | Molar concentration (health-adjacent) | custom page | L22138 (loop) |  |
| 70 | `cv_massconc` | conv | Mass concentration (health-adjacent) | custom page | L22138 (loop) |  |
| 71 | `cv_amount` | conv | Amount of substance | custom page | L22138 (loop) |  |
| 72 | `cv_molmass` | conv | Molar mass | custom page | L22138 (loop) |  |
| 73 | `consts` | sci | Constants and reference tables | custom page | L22202 |  |
| 74 | `uexpr` | sci | Unit-aware expressions | custom page | L22203 |  |
| 75 | `prog` | prog | Programmer calculator | custom page | L22243 |  |
| 76 | `ohm` | eng | Ohm’s law and power | generic form | L22255 | fields: V:num[voltage],I:num[current],R:num[resist],P:num[power]; default run → U · I · R · P = 12 V · 25.5319148936 mA |
| 77 | `rcomb` | eng | Series and parallel circuits | generic form | L22260 | fields: t:seg,m:seg,l:text; modes: t=R/C/L ; m=s/p; default run → Equivalent = 59.9768 × 10⁰ Ω |
| 78 | `react` | eng | Reactance and impedance (series RLC) | generic form | L22265 | fields: f:num[freq],R:num[resist],L:num[induct],C:num[capac]; default run → Z = 10.0086101199 Ω |
| 79 | `wave` | eng | Frequency and wavelength | generic form | L22270 | fields: v:num[speed],f:num[freq],l:num[length]; default run → λ = 12.4913524167 cm |
| 80 | `p3` | eng | Three-phase power | generic form | L22274 | fields: m:seg,V:num[voltage],I:num[current],P:num[power],pf:num,conn:seg; modes: m=P/I ; conn=Y/D; default run → P = 9.42235639317 kW |
| 81 | `mech` | eng | Force, work and power | generic form | L22279 | fields: m:num[mass],a:num[accel],d:num[length],t:num[time],th:num; default run → F = m·a = 3,000 N |
| 82 | `energyk` | eng | Kinetic and potential energy | generic form | L22284 | fields: m:num[mass],v:num[speed],h:num[length],g:num[accel]; default run → Eₘ = Eₖ + Eₚ = 11,104.9875 J |
| 83 | `torque` | eng | Torque and rotational power | generic form | L22286 | fields: F:num[force],r:num[length],th:num,n:num[freq]; default run → τ = F·r·sin θ = 60 N·m |
| 84 | `press` | eng | Pressure and hydrostatics | generic form | L22288 | fields: m:seg,F:num[force],A:num[area],rho:num[density],h:num[length],p0:num[pressure]; modes: m=fa/hy; default run → p = 199,391.5 Pa |
| 85 | `densm` | eng | Density and materials | generic form | L22293 | fields: m:num[mass],V:num[volume],rho:num[density]; default run → ρ = 7,850 kg/m³ |
| 86 | `flowc` | eng | Flow rate and velocity | generic form | L22296 | fields: d:num[length],v:num[speed],rho:num[density]; default run → Q = A·v = 0.00294524311274 m³/s |
| 87 | `eff` | eng | Efficiency | generic form | L22298 | fields: pin:num[power],pout:num[power]; default run → η = 85 % |
| 88 | `therm` | eng | Thermal: heat and expansion | generic form | L22300 | fields: m:seg,mass:num[mass],cp:num,dT:num[dtemp],a:num,L0:num[length],k:num,A:num[area],e:num[length]; modes: m=q/lin/cond; default run → Q = 502,320 J |
| 89 | `struct` | eng | Structural formulas | generic form | L22307 | fields: m:sel,F:num[force],A:num[area],L:num[length],dL:num[length],w:num,E:num,I:num; modes: m=stress/beam/cant; default run → M_max = wL²/8 = 10 kN·m |
| 90 | `signal` | eng | Signal and decibels | generic form | L22315 | fields: m:sel,r:num,kind:seg; modes: m=db/inv/dbm/nyq ; kind=p/a; default run → dB = 3.01029995664 |
| 91 | `elec` | eng | Electronics | generic form | L22322 | fields: m:sel,vin:num[voltage],r1:num[resist],r2:num[resist],vf:num[voltage],if:num[current],r:num[resist],cc:num[capac],cap:num,ld:num[current]; modes: m=div/led/rc/bat; default run → V_out = 1.59863945578 V |
| 92 | `vat` | fin | VAT and tax | generic form | L22337 | fields: m:seg,x:num,r:num,cur:sel; modes: m=ht/ttc ; cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Gross = €120.00 |
| 93 | `disc` | fin | Discounts | generic form | L22340 | fields: p:num,d1:num,d2:num,cur:sel; modes: cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Final price = €174.93 |
| 94 | `pchg` | fin | Percentage increase and decrease | generic form | L22342 | fields: a:num,b:num,pp:chk; default run → Relative change = 15 % |
| 95 | `margin` | fin | Margins and markups | generic form | L22344 | fields: m:sel,cost:num,price:num,pct:num,cur:sel; modes: m=cp/cm/ck ; cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Selling price = €100.00 |
| 96 | `bep` | fin | Break-even point | generic form | L22347 | fields: fc:num,p:num,vc:num,cur:sel; modes: cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Break-even quantity = 1,800 |
| 97 | `loan` | fin | Loan and amortisation schedule | generic form | L22352 | fields: P:num,r:num,y:num,f:sel,kind:seg,cur:sel; modes: f=12/4/2/1/52 ; kind=ann/lin ; cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Payment = €1,159.92 |
| 98 | `sint` | fin | Simple interest | generic form | L22358 | fields: P:num,r:num,t:num,cur:sel; modes: cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Final amount = €5,600.00 |
| 99 | `cint` | fin | Compound interest | generic form | L22360 | fields: P:num,r:num,n:sel,t:num,cur:sel; modes: n=12/4/2/1/52/365/c ; cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Final amount = €7,454.16 |
| 100 | `pvfv` | fin | Present and future value | generic form | L22363 | fields: m:seg,x:num,pmt:num,r:num,n:int,due:seg,cur:sel; modes: m=fv/pv ; due=end/beg ; cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Future value = €13,488.50 |
| 101 | `save` | fin | Savings growth | generic form | L22367 | fields: P:num,c:num,r:num,y:int,cur:sel; modes: cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Final balance = €46,961.97 |
| 102 | `roi` | fin | Return on investment (ROI) | generic form | L22370 | fields: c:num,v:num,y:num; default run → ROI = 35 % |
| 103 | `depr` | fin | Depreciation | generic form | L22372 | fields: c:num,s:num,n:int,m:seg,k:num; modes: m=sl/db; default run → Year-1 charge = 2,000.00 |
| 104 | `pl` | fin | Profit and loss | generic form | L22376 | fields: rev:num,cogs:num,opex:num,cur:sel; modes: cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Result (profit) = €12,000.00 |
| 105 | `recur` | fin | Recurring payments | generic form | L22378 | fields: a:num,f:sel,y:num,g:num,cur:sel; modes: f=12/4/2/1/52 ; cur=EUR/USD/GBP/CHF/CAD/MAD/DZD/TND/XOF/SAR/AED/NGN/JPY; default run → Total paid = €1,796.40 |
| 106 | `cur` | fin | Currency conversion | generic form | L22381 | fields: x:num,from:text,to:text,rate:num,date:date,src:text,save:chk; default run → idle (null) |
| 107 | `ddiff` | date | Date difference | generic form | L22398 | fields: a:date,b:date,inc:chk; default run → Days = 92 |
| 108 | `dur` | date | Duration between timestamps | generic form | L22400 | fields: a:dt,b:dt; default run → Result = 2 j 12 h 0 min 0 s |
| 109 | `work` | date | Working days | generic form | L22403 | fields: m:seg,a:date,b:date,n:int,we:sel,hol:area; modes: m=count/add ; we=60/56/0/5; default run → Working days = 23 |
| 110 | `tz` | date | Time-zone conversion | generic form | L22413 | fields: t:dt,a:sel,b:sel; modes: a=<IANA zones from Intl.supportedValuesOf> ; b=<same>; default run → UTC = Wednesday, 14 October 2026 at 18:08:00 UTC |
| 111 | `age` | date | Age and elapsed time | generic form | L22417 | fields: b:date,r:date; default run → Result = 36 years, 6 months, 2 days |
| 112 | `tarith` | date | Time arithmetic | generic form | L22420 | fields: m:seg,t:time,op:seg,d:text,l:area; modes: m=add/sum ; op=+/-; default run → Result = 18:15 |
| 113 | `unix` | date | Unix timestamp | generic form | L22425 | fields: m:seg,x:text,t:dt; modes: m=ts/dt; default run → UTC = 2026-10-14T18:08:41.000Z |
| 114 | `cal` | date | Calendar calculations | generic form | L22429 | fields: d:date,n:int,u:seg; modes: u=d/w/m/y; default run → Day = Wednesday, 14 October 2026 |
| 115 | `bases` | prog | Base conversion (2 to 36) | generic form | L22436 | fields: x:text,a:int,b:int; default run → base 2 = 11111111 |
| 116 | `color` | prog | Hex colour conversion | generic form | L22441 | fields: x:text; default run → HEX = #22B14C |
| 117 | `uni` | prog | ASCII and Unicode code points | generic form | L22446 | fields: m:seg,x:text,c:text; modes: m=txt/cp; default run → Characters = 6 |
| 118 | `chem` | spec | Chemistry: molar mass and moles (health-adjacent) | generic form | L22456 | fields: f:text,m:num[mass]; default run → M = 180.156 g/mol |
| 119 | `phys` | spec | Physics: kinematics | generic form | L22461 | fields: m:seg,u:num[speed],a:num[accel],t:num[time],ang:num,g:num[accel]; modes: m=uva/proj; default run → d = v₀t + ½at² = 25 m |
| 120 | `bio` | spec | Biology: growth and genetics (health-adjacent) | generic form | L22465 | fields: m:seg,n0:num,td:num[time],t:num[time],q2:num; modes: m=grow/hw; default run → N(t) = 64,000 |
| 121 | `lab` | spec | Laboratory: dilutions and solutions (health-adjacent) | generic form | L22468 | fields: m:sel,c1:num[molconc],v1:num[volume],c2:num[molconc],v2:num[volume],c:num[molconc],v:num[volume],mw:num,x:num,dir:seg,f:num,n:int; modes: m=dil/prep/conv/ser ; dir=m2n/n2m; default run → V1 = 10 mL |
| 122 | `health` | spec | **Healthcare maths utilities (informational) (HEALTH — see §2.6)** | generic form | L22481 | fields: ack:chk,m:sel,w:num[mass],h:num[length],vol:num[volume],dur:num[time],df:num; modes: m=bmi/bsa/rate; default run → idle (null) |
| 123 | `edu` | spec | Education: grades and exams | generic form | L22490 | fields: m:seg,l:area,x:num,a:num,b:num,target:num,wn:num; modes: m=avg/conv/need; default run → Average (out of 20) = 13.7 |
| 124 | `custom` | spec | Custom formulas | custom page | L22514 |  |
| 125 | `settings` | lib | Settings | custom page | L22541 |  |
| 126 | `library` | lib | Library: variables and formulas | custom page | L22542 |  |

Counts by section **(verified-run)**: conv 34 · math 19 · sci 15 · eng 16 · fin 15 · date 8 · prog 4 · spec 7 · calc 6 · lib 2 = **126**. Generic form tools: 80 (all 80 run without exception on defaults; `cur` and `health` intentionally return idle `null`).

Converter categories (34, `CA_UD` L21270–L21318) with unit count: length 16, area 11, volume 22, mass 14, temp 4 (affine K/°C/°F/°R), dtemp 4, time 11, speed 6, accel 4, force 6, pressure 12, energy 12, power 8, torque 6, freq 7, angle 7, data 14, rate 9, fuel 4 (reciprocal, `CA_FUEL` L21320), density 7, flow 9, current 4, voltage 5, resist 4, capac 5, induct 4, magnet 5, dose 4, eqdose 5, activity 7, molconc 6, massconc 8, amount 5, molmass 3 = **291 built-in units**, each flagged exact (1) or conventional/approximate (0) and named in fr|en|de|ar.

### 2.6 Health-related calculators (healthcare relevance — flag for clinical/regulatory review)

| Item | Where | What it computes | Safeguards in code |
|---|---|---|---|
| `health` "Healthcare maths utilities (informational)" | L22481–L22489 | BMI = kg/m² (value only); BSA Mosteller √(cm·kg/3600); infusion rate mL/h and mL/min from entered volume ÷ duration, optional drops/min with drop factor | `warnTop` banner "not validated for clinical use"; mandatory acknowledgement checkbox `ack` — all other fields hidden (`on:v=>v.ack`) until ticked; ack persisted as setting `lab` (default `false`, L21071) and toggled inside `run()` (L22486); "no interpretation, no clinical thresholds, no dosing recommendation" description; every result carries the assumption "neither a diagnosis nor a treatment recommendation". Golden **(verified-run)**: 70 kg/175 cm → BMI 22.86, BSA 1.845 m²; 1000 mL/8 h → 125 mL/h, 2.0833 mL/min, df 20 → 41.67 drops/min |
| `lab` Laboratory: dilutions and solutions | L22468–L22480 | C₁V₁=C₂V₂ (leave exactly one empty), solution preparation (mass to weigh from mol/L, volume, g/mol), mass↔molar concentration, serial dilutions (≤30 steps) | assumptions text; unit-aware fields (`molconc`, `volume`) |
| `chem` Chemistry: molar mass | L22451–L22460 | formula parser (brackets, hydrates `·5H2O`), IUPAC 2021 abridged atomic weights (common elements only, `CA_AW` L22452), moles from mass | `ca_eElem` for missing elements |
| `bio` Biology | L22465–L22467 | exponential growth by doubling time; Hardy–Weinberg | assumptions text |
| Converters `cv_massconc` (g/L, mg/dL, µg/mL…), `cv_molconc` (mmol/L…), `cv_dose` (Gy, rad), `cv_eqdose` (Sv, rem), `cv_activity` (Bq, Ci) | L21270–L21318, desc L22124–L22128 | lab/clinical unit conversions | descriptions warn mg/dL↔mmol/L needs molar mass; Gy ≠ Sv without weighting factor |
| `dist`, `stats` (confidence intervals), `errprop` | L21872–L21938 | general statistics (could be used for clinical data) | CI assumption note (normality/independence) |

INFERENCE: the app deliberately avoids clinical interpretation (no BMI categories, no dosing). Formula strings in `health` are French-only (`"IMC = masse (kg) / taille (m)²"`, `"débit = volume / durée …"`, L22487–L22489) — see §13.

---

## 3. Components (reusable builders)

| Function / object | Responsibility | Variants / notes | Line |
|---|---|---|---|
| `CaErr(k,pos,x)` | typed error: i18n key, 0-based source column, interpolation value | 84 message keys in `CA_ERR` (L21397 + L22554–L22562) | L21069 |
| `caSt()` / `caSet()` / `caSave(now)` | lazy load + defaults merge of the whole store; settings accessor; debounced (250 ms) or immediate save | | L21073–L21076 |
| `caTok`, `caParse`, `caEvalAst`, `caEval` | expression language | AST node kinds: num, grp, neg, var, set, post, ang, unit, to, bin, call | L21080–L21226 |
| `caNumIn(str)` | numeric field parser: locale-aware decimal/grouping heuristics, falls back to full expression evaluation with stored vars | returns number or quantity | L21228–L21235 |
| `caFmt(x,o)` | number/bigint/quantity formatting: sig digits, auto/fix/sci/eng, decimal & grouping separators, Unicode superscript exponent, `plain:true` machine form | | L21242–L21254 |
| `caGroupBig`, `caRoundMoney`, `caMoney`, `caLocale` | BigInt grouping; half-up / half-even money rounding; `Intl.NumberFormat` currency | | L21255–L21259 |
| `caMkFn(src,xn)`, `caMkFnN(src,names)` | compile expression to `x=>number` (NaN on domain errors, probes 3 points for hard errors) / multi-var function | | L21264–L21267 |
| Numerics: `caGamma`, `caLnGamma` (Lanczos g=7), `caFact`, `caFactBig`, `caErf`/`caErfc` (series + Lentz CF), `caPhi`/`caPhiInv` (bisection), `caBetacf`/`caIbeta`, `caTcdf`/`caTinv`, `caCombBig`/`caPermBig`, `caGcdB`/`caGcdN`, `caIntegrate` (adaptive Simpson, depth 48), `caDeriv` (central diff + Richardson 8 levels), `caRoots` (scan + bisection, pole rejection) | pure | | L21132–L21164 |
| Units: `caUnitsBuild`, `caUnitsOf`, `caUName`, `caCatName`, `caUnitFind` (`cat:id` → id/symbol by `CA_UPRI` priority → case-insensitive), `caToBase`/`caFromBase`/`caConvert`, quantities `caQ`, `caQScale`, `caQBin`, `caQVal`, `caFmtQ` | canonical-unit conversion, affine temperature, reciprocal fuel | | L21321–L21348 |
| Constants: `CA_CONSTS` (30), `CA_CSRC`, `caConstGet`, `caCName`, `caDimStr` | SI 2019 exact, CODATA 2018 measured with uncertainty, IAU, conventional; σ derived from exact constants (L21365) | | L21350–L21372 |
| `L4(s)` | pick fr/en/de/ar from `"fr|en|de|ar"` string by global `lang` | **global, reused by later apps (1,367 lines after L22598 call `L4(`)** | L21374 |
| `caW`, `caWf`, `CAW` | shell strings | 48 keys | L21375–L21395 |
| `caE` | HTML escaping | | L21418 |
| `caRM` | reduced motion (OS `lkRM` setting or media query) | | L21419 |
| `caI`, `CAI`, `cai` | inline Lucide-style SVG icons | 40 icons | L21422–L21433 |
| `caDef`, `CA_SECS`, `caToolsOf`, `caToolName`, `caSecName` | registry | | L21436–L21442 |
| `caRender`, `caNavHTML`, `caHeadHTML`, `caPageHTML`, `caMount`, `caInk`, `caEnter`, `caGo` | full render, nav, header, page swap with exit/enter animation, recent list update, auto-focus first input | | L21448–L21482 |
| `caHomeHTML` | home | | L21484 |
| `caVals`, `caFieldHTML`, `caFormHTML`, `caToolHTML` | generic form: field types num/int/text/area/sel/seg/chk/date/dt/time, unit select for `cat` fields, suffix, hints, optional marker, conditional `on(v)` | | L21492–L21511 |
| `caReq`, `caCtx(d,v)` | run context: `num(k,{opt,pos,nn})`, `base(k)` (value converted to canonical unit), `uOf`, `F`, `M`, `L` | | L21513–L21520 |
| `caCompute`, `caResHTML`, `caCsv`, `caDownload`, `caToast`, `caCopy` | run & paint result card; CSV (`;` separator, CRLF, BOM); download via OS `dcSaveFile` or `<a download>`; clipboard with `execCommand` fallback | | L21521–L21540 |
| History: `caHistAdd` (dedupe consecutive identical, cap `hmax`), `caHistKeep`, `caHistHTML`, `caHistItems`, `caHistRow`, `caHistList`, `caHistPaint`, `caHistOpen` (restores inputs or calls `reopen`), `caHistExport` (JSON `{remotionCalc:1,…}` or CSV) | | | L21542–L21558 |
| `caPrompt`, `caConfirm`, `caToggleHist`, `caToastUndo` | dialogs/panels | | L21559–L21596 |
| Rationals: `caRat`, `caRatParse` (int, a/b, mixed "1 1/2", decimal), `caRatOp`, `caRatStr`, `caRatMixed`, `caRatDec` (repeating part in parentheses), `caBestFrac` (continued fractions) | BigInt exact | | L21615–L21627 |
| Primes: `caModPow`, `CA_MRB`, `caIsPrime` (deterministic MR < 3.3e24), `caRho` (Pollard), `caFactor`, `caBig` | BigInt | | L21629–L21636 |
| Complex: `CN`, `caCParse` (a+bi, polar `r∠θ`), `cAdd…cLn`, `cStr` | | | L21638–L21653 |
| Matrices: `caMatParse`, `caMatLU`, `caDet`, `caRref`, `caInv`, `caMatMul`, `caMatTbl` | | | L21655–L21667 |
| Polynomials: `caPolyStr`, `caPolyTrim`, `caPolyFromAst` (symbolic expand from AST), `caPolyEval`, `caPolyD`, `caPolyI`, `caPolyRoots` (closed form ≤2, Durand–Kerner) | | | L21669–L21688 |
| Stats: `caData`, `caQuant`, `caMean`, `caVar`; `caSvgPlot` (bars/lines/dots SVG) | | | L21690–L21700 |
| Geometry: `caTriSvg`, `CA_SHAPES` | | | L21825–L21843 |
| Dimensional analysis: `CA_DIMU`, `CA_PFX`, `CA_DERIVED`, `caDimParse` | | | L21940–L21947 |
| Interactive helpers: `caPlain`, `caExprShow`, `caKeyFx` (press + ripple), `caRoll` (value roll animation) | | | L21960–L21963 |
| Standard calc engine: `caStdOpen`, `caStdTok`, `caStdVal`, `caStdOperand`, `caStdKey` (state machine on `CA.std`), `caStdHTML`, `caStdPaint` | | | L21966–L22000 |
| Scientific: `CA_SCIK`, `caSciHTML`, `caSciPaint`, `caSciIns`, `caSciEval`, `caSciKey` | | | L22004–L22032 |
| Graph: `caGrState`, `caGrHTML`, `caGrFns`, `caGrDraw`, `caGrFit`, `caGrMount`, `caGrSyncW` | | | L22037–L22063 |
| Editor: `caEdSample`, `caEdText`, `caEdHTML`, `caEdRefHTML`, `caEdLines`, `caEdEval`, `caEdHl` (tokenizing highlighter + error caret + paren match), `caEdParen`, `caEdPaint`, `caEdSoon` (90 ms debounce), `caEdSync`, `caEdAcItems`, `caEdAc`, `caEdCharW`, `caEdAcPick` | | | L22072–L22106 |
| Converters: `CA_CV_PRE`, `caCvState`, `caUnitPick`, `caCvHTML`, `CA_CV_DESC`, `caCvPaint` | | | L22110–L22137 |
| Constants page: `caConstHTML`, `caConstPaint`; unit expressions `caUxPaint` | | | L22192–L22207 |
| Programmer: `caPgMask`, `caPgParse` (base 2–36, prefixes), `caPgFit` (two's complement wrap + overflow flag), `caPgSigned`, `caPgHTML`, `caPgPaint` | BigInt | | L22219–L22242 |
| Eng helpers `caU`, `caFB`, `caQs`, `CA_ENG_LIM`; finance `CA_FIN_NOTE`, `caRoundNote`, `caCur` (13 currencies), `CA_FREQ`, `caAmort` (integer-cent schedule) | | | L22249–L22350 |
| Dates: `caToday`, `caDParse`, `caDFmt`, `caLeap`, `caYMD`, `caTzList` (`Intl.supportedValuesOf`), `caTzOffset`, `caTzToUtc` (3-pass fixed point), `caOffStr` | | | L22393–L22412 |
| Colour: `caRgb2Hsl`, `caHsl2Rgb`, `caLum` (WCAG relative luminance) | | | L22438–L22440 |
| Chemistry: `CA_AW`, `caFormula` | | | L22452–L22455 |
| Custom formulas: `caCfVars` (walk AST for free variables), `caCfHTML`, `caCfPaint` | | | L22499–L22513 |
| Settings: `caSetHTML` | | | L22523 |
| OS: `caDockBtn`, `caOpen` | | | L22568–L22587 |

---

## 4. Interaction inventory

Event wiring: 18 `document.addEventListener` capture-phase handlers (click ×7, input ×6, change ×3, keydown ×3 — each first checks `caRoot().contains(e.target)`), 1 `window` `storage` listener (L22598), per-mount listeners on graph SVG (wheel/pointer, L22055–L22062) and editor textarea (scroll/click/keyup, L22107), 2 ResizeObservers. 81 distinct `data-*` action hooks.

| # | Control / behaviour | Hook | Class | Evidence |
|---|---|---|---|---|
| 1 | Navigate to tool/home (nav items, tiles, section lists, settings button, library tiles) | `[data-cago]` | Functional | L21568 → `caGo` L21475 |
| 2 | Expand/collapse nav section (animated height) | `[data-catog]` | Functional | L21569–L21570 |
| 3 | "See all (n)" on home → opens nav at section | `[data-casec]` | Functional | L21571 |
| 4 | Menu / close nav drawer | `[data-canav]` | Functional | L21572 |
| 5 | Scrim click closes drawers | `[data-cascrim]` | Functional | L21573 |
| 6 | Toggle history panel | `[data-cahist]`,`[data-cahx]` | Functional | L21574, L21564 |
| 7 | Cycle angle mode DEG→RAD→GRAD, recompute current tool (`onAng`) | `[data-caang]` | Functional | L21575 |
| 8 | Favourite current tool | `[data-cafav]` | Functional | L21576 |
| 9 | Copy result / converter / constant value | `[data-cacopy]` | Functional | L21577, `caCopy` L21538 |
| 10 | Segmented field (radio buttons) | `[data-caseg]` | Functional | L21578 |
| 11 | Reset tool inputs | `[data-careset]` | Functional | L21579 |
| 12 | Add result to history (button; Ctrl/⌘+Enter) | `[data-cakeep]` | Functional | L21580, L21607 |
| 13 | Example chips (generic tools; only `frac` defines them) | `[data-caex]` | Functional | L21581 |
| 14 | Export result table as CSV | `[data-cacsv]` | Functional | L21582 |
| 15 | History row: reopen (restores inputs, `reopen` for custom pages) | `[data-hopen]` | Functional | L21585, `caHistOpen` L21557 |
| 16 | History row: copy | `[data-hcopy]` | Functional | L21586 |
| 17 | History row: star (→ saved) | `[data-hfav]` | Functional | L21587 |
| 18 | History row: duplicate | `[data-hdup]` | Functional (id collision possible, §13) | L21588 |
| 19 | History row: rename (prompt; non-empty name also stars) | `[data-hren]` | Functional | L21589 |
| 20 | History row: note (prompt) | `[data-hnote]` | Functional | L21590 |
| 21 | History row: delete (animated) + Undo toast | `[data-hdel]` | Functional | L21591, L21596 |
| 22 | Clear history (confirm; starred kept) | `[data-cahclear]` | Functional | L21592 |
| 23 | Export history CSV/JSON (checked rows or filtered list) → `remotion-calculs.csv/json` | `[data-hexp]` | Functional | L21593 |
| 24 | History section filter | `[data-hfilt]` | Partial (no filter for `spec`/`lib`, §13) | L21594, L21706 |
| 25 | Tool search (nav) | `[data-caq]` input | Functional | L21598 |
| 26 | History search | `[data-cahq]` | Functional | L21599 |
| 27 | Home quick calculation (live) + Enter (adds to history as `sci`, replaces with plain result) | `[data-caquick]` | Functional | L21600, L21608 |
| 28 | Generic field input → debounced (90 ms) recompute; re-render when field visibility changes | `[data-caf]` | Functional | L21601–L21603 |
| 29 | Field unit select | `[data-cafu]` | Functional | L21604–L21605 |
| 30 | Esc closes nav / history (s,m) | keydown | Functional | L21609 |
| 31 | ↑/↓ moves through nav items | keydown | Functional | L21610 |
| 32 | Standard keypad (24 keys) incl. %, CE, C, ⌫, 1/x, x², √x, ±, = (repeat-last-op) | `[data-sk]` | Functional | L22141, `caStdKey` L21973–L21990 |
| 33 | Memory MC/MR/M+/M−/MS | `[data-sk]` | Functional | L21989–L21990 |
| 34 | Standard copy value | `[data-scopy]` | Functional | L22142 |
| 35 | Toggle tape (persisted setting `tape`) | `[data-stape]` | Functional | L22143 |
| 36 | Clear tape | `[data-stclear]` | Functional (tape not persisted) | L22144 |
| 37 | Reuse tape entry | `[data-stuse]` | Functional | L22145 |
| 38 | Standard keyboard: digits . , + − * / ( ) x Enter = Backspace Esc Delete % F9 r @ q; Ctrl+L/R/P/Q/M memory; Ctrl+C copy | keydown | Functional (overrides browser Ctrl+P/R/L, §13) | L22186–L22189 |
| 39 | Scientific keys (30 fn + 19 numeric), 2nd / hyp toggles relabel keys | `[data-xk]` | Functional | L22147, `caSciKey` L22022 |
| 40 | STO → named variable (prompt, validated, reserved names rejected) | `[data-xk=sto]` | Functional | L22029 |
| 41 | Insert variable chip | `[data-xins]` | Functional | L22148 |
| 42 | Scientific input live preview; Enter = evaluate (error selects column); Esc = clear | `[data-xin]` | Functional | L22068, L22184 |
| 43 | Graph function inputs (debounced 140 ms) | `[data-grf]` | Functional | L22066 |
| 44 | Graph window fields (validated x1>x0, y1>y0) | `[data-grw]` | Functional | L22067 |
| 45 | Graph Zoom in/out, Fit y, Reset | `[data-grz]` | Functional | L22150 |
| 46 | Graph wheel zoom at cursor, drag to pan (pointer capture), hover tooltip | SVG listeners | Functional (no keyboard equivalent for hover values) | L22055–L22062 |
| 47 | Editor typing → debounced eval, highlight, autocomplete | `[data-caed]` | Functional | L22069, L22096 |
| 48 | Editor toolbar: ref / ex / copy / txt / csv / save / clear | `[data-edx]` | Functional | L22152–L22161 |
| 49 | Copy a line result | `[data-edcp]` | Functional | L22162 |
| 50 | Pick autocomplete item (click; ↑↓ Enter/Tab Esc) | `[data-aci]` | Functional | L22163, L22182 |
| 51 | Editor Tab inserts two spaces | keydown | Functional (traps Tab — keyboard focus cannot leave textarea with Tab, §10) | L22183 |
| 52 | Converter value input (70 ms debounce) | `[data-cvv]` | Functional | L22174 |
| 53 | Open unit picker / select unit / search units / keyboard nav | `[data-upopen]`,`[data-upv]`,`[data-upq]` | Functional | L22166–L22167, L22176, L22180 |
| 54 | Swap units (rotating animation) | `[data-cvswap]` | Functional | L22168 |
| 55 | Shortcut / favourite chips | `[data-cvpre]` | Functional | L22169 |
| 56 | Clear value | `[data-cvclear]` | Functional | L22170 |
| 57 | Toggle favourite conversion (persisted `convFav`) | `[data-cvfav]` | Functional | L22171 |
| 58 | Converter add to history | `[data-cvkeep]` | Functional | L22172 |
| 59 | Converter precision select | `[data-cvsig]` | Functional | L22175, L22177 |
| 60 | Click outside closes unit pickers | click | Functional | L22172 |
| 61 | Constants search / kind filter | `[data-cq]`,`[data-ck]` | Functional | L22208, L22211 |
| 62 | Insert constant into editor (appends line, navigates) | `[data-cuse]` | Functional | L22212 |
| 63 | Add / delete custom constant | `[data-cadd]`,`[data-cdel]` | Functional | L22213–L22215 |
| 64 | Unit-expression input / example chips | `[data-uxi]`,`[data-uxe]` | Functional (one built-in example fails, §13) | L22208, L22210 |
| 65 | Programmer value / base (re-encodes value & B) / width / op / B | `[data-pgv]`,`[data-pgk]` | Functional | L22244 |
| 66 | Signed/unsigned | `[data-pgsg]` | Functional | L22246 |
| 67 | Toggle bit | `[data-pgbit]` | Functional | L22247 |
| 68 | Delete saved currency rate | `[data-ratedel]` | Functional | L22390 |
| 69 | Custom formula fields / variable inputs | `[data-cfk]`,`[data-cfv]` | Functional | L22515 |
| 70 | Custom formula Save / New / Open / Delete (confirm) | `[data-cfsave]`,`[data-cfnew]`,`[data-cfopen]`,`[data-cfdel]` | Functional | L22517–L22520 |
| 71 | Settings selects (re-render page + header) | `[data-cset]` | Functional | L22545 |
| 72 | Import JSON (`remotionCalcData:1`) | `[data-cimp]` | Functional (no schema validation, §11) | L22546 |
| 73 | Export JSON `remotion-calculatrice.json` | `[data-cexp]` | Functional | L22548 |
| 74 | Reset everything (confirm) | `[data-creset]` | Functional | L22549 |
| 75 | Add / delete custom unit | `[data-cuadd]`,`[data-cudel]` | Functional | L22550–L22551 |
| 76 | Delete stored variable | `[data-vdel]` | Functional | L22552 |
| 77 | Prompt / confirm dialogs (OK, Cancel, Esc) | `.ca-dlg` | Functional | L21559–L21562 |
| 78 | Window resize → size class, ink, graph redraw | ResizeObserver | Functional | L22586, L22062 |
| 79 | Dock button open/focus/minimise; desktop icon; launcher; app mode / separate window | OS hooks | Present-not-verified (OS code outside area) | L22564–L22590, L20980 |
| 80 | Cross-tab sync on `storage` event | window listener | Partial (history repainted only, §6) | L22598 |
| 81 | Key press visual (scale + ripple), nav ink glide, page slide, result roll, error shake, bit pop, favourite pop | animations | Decorative | L21962–L21963, L21470–L21473, L21998, L22020 |

Counts: **81 interaction items** — Functional 74 · Partial 3 (#24, #80, #64 example) · Present-not-verified 1 (#79) · Decorative 1 group (#81) · Broken 0 · Simulated 0 (currency has *no* live provider by design; rates are user-entered, L22381).
Additionally every generic tool's `run` (80) was executed **(verified-run)**: 78 return results, 2 return idle by design, 0 throw.

---

## 5. User journeys

1. **Quick calculation from Home** — open app (dock/desktop/launcher → `caOpen` L22575) → Home focuses `#ca-qx` → type `2^10/3` → live `= 341.333333333` (L21600) → Enter: result stored as `ans`, added to history as tool `sci`, input replaced by plain result (L21608). Failure: invalid expression shows localized message in `.ca-qr.bad`; Enter with error does nothing (silent catch).
2. **Standard calculator with memory and tape** — nav → Standard → keys/keyboard → `=` evaluates via `caEval`, pushes tape (≤60) and history (L21986–L21987); `=` again repeats last op (`S.last`); MS/M+ store live value. Failure: division by zero → shake + message under display (L21996–L21997). Cancel: Esc = C, Delete = CE.
3. **Scientific with variables** — type `sin(30 deg) + 2^3` → Enter → result + history; STO → prompt name → var chip; later `ans`, var names usable in all tools/editor (stored `vars`). Failure: error message with column, caret selected at error position (L22021). Reserved name → toast `ca_eReserved`.
4. **Generic tool (e.g. Loan)** — nav Finance → Loan → edit fields (numbers or small expressions such as `200*1000`, or unit quantities on unit fields) → result card updates after 90 ms → CSV export of schedule → Ctrl+Enter / "Add to history" → later reopen from history restores inputs (L21557). Failure: missing required field → "Required field: X"; out-of-range → `ca_eTerm`.
5. **Unit conversion** — Converters → Length → type `5.5` or an expression (quantities with units are rejected here with `ca_eNum`, L22130) → pick units via searchable listbox → result with exact/approx badge, factor formula, "in every unit" table → star as favourite conversion → Add to history. Failure: fuel ≤0 → `ca_ePos`; below absolute zero → `ca_eAbsZero`.
6. **Expression editor worksheet** — Calculators → Expression editor (sample loaded) → write `a = 12`, `area = a*b`, `150[cm] to [m]`, `@c*2` → per-line results, syntax colouring, error caret per line, autocomplete → Save (named, starred history entry storing full text) / TXT / CSV / Copy. Cancel: Clear asks confirmation. Text persisted continuously in `editor` (L22085).
7. **Custom formula calculator** — Specialised → Custom formulas → name + `pi*(d/2)^2*v` → variables `d`, `v` become inputs → result live → Save → appears in "My formulas" tiles. Failure: invalid expression → parser error; missing variable value → "Required field: d".
8. **Health utility (informational)** — Specialised → Healthcare maths → warning banner → tick "I understand" (persists `lab:true`) → choose BMI/BSA/infusion → enter mass/height (unit-selectable) → value only, with assumptions. Untick → fields hidden, setting reset (L22486).
9. **Backup / restore** — Settings → Export → `remotion-calculatrice.json` `{remotionCalcData:1, exported, data:<whole store>}` (L22548) → on another browser Import → keys merged/replaced, units rebuilt, full re-render, toast. Failure: wrong file → "File not recognised". Reset everything → confirm → localStorage key removed → defaults.
10. **Currency conversion with manual rate** — Finance → Currency → enter EUR→USD rate, date, source, tick "Save this rate" → stored in `rates` (cache) → next time leave rate empty → cached rate used with its date; >7 days old → warning (L22387). No network.

---

## 6. State & persistence

### 6.1 localStorage keys
| Key | Owner | Shape | Written by |
|---|---|---|---|
| `remotion-calc` | this app | JSON object (below) | `caSave` (debounced 250 ms, immediate on close/import) L21076; removed by Reset L22549 |
| `remotion-dk-calc1` | this app (one-time flag) | `"1"` | first-run desktop-shortcut installer L22592–L22595 |
| `remotion-apps` | OS launcher (`alStore`) | `inst.calcsci = 1` | `caOpen` L22576, installer L22593 (via `alSave` L11750) |
| desktop items (`desks`/`saveDesks`) | OS desktop | `{id,type:"app",app:"calcsci",c,r}` appended to desktop 1 | L22594 |

### 6.2 `remotion-calc` schema (defaults L21074)
```
{
  set:     { sig:12, nt:"auto"|"fix"|"sci"|"eng", dp:2, dec:"auto"|"."|",", grp:"auto"|"none"|"space"|","|"."|"'",
             ang:"deg"|"rad"|"grad", round:"halfup"|"halfeven", cur:"EUR", hmax:500, lab:false, tape:true },
  hist:    [ { id:"h…", ts, set:{ang,sig,nt}, tool, expr, res, raw, inputs?, fav?, name?, note? } ],   // newest first, capped at set.hmax
  saved:   [],              // declared + imported but never read/written elsewhere (dead field)
  fav:     [toolId],        // favourite tools
  recent:  [toolId],        // ≤12 (L21476)
  vars:    { name: number | quantity },   // STO / library
  consts:  [ { id, sym, v, unit, unc, name } ],
  units:   [ { id, cat, sym, name, f } ],  // custom units, factor to canonical unit
  rates:   [ { a, b, r, d, s, t } ],       // currency cache
  convFav: [ { c:cat, a, b } ],
  editor:  "multi-line text",
  graph:   { f:[4 strings], x0, x1, y0, y1, auto } | null,
  formulas:[ { id:"f…", name, expr, note } ]   // added lazily (L22500), not in defaults
}
```
Versioning/migrations: none (no version field in store). Missing keys are filled by `Object.assign` with defaults on load; settings merged over `CA_DEF`. Import format marker `remotionCalcData:1` (L22546); history export marker `remotionCalc:1` (L21558) — the two markers differ and the history JSON export cannot be imported (INFERENCE from code: import requires `remotionCalcData`).

### 6.3 In-memory state (`CA` object, L21072, L21443)
`view`, `prev`, `vals` (per-tool field values — not persisted; lost on close), `q`, `navOpen`, `histOpen`, `open` (section expansion), `hq`, `hf`, `dir`, `last` (last result for keep/CSV), `ans` (not persisted), `std` (expression, memory, tape — not persisted), `sci` (expr, shift, hyp), `gr` (graph, persisted via `graph`), `edRef`, `edOut`, `edAc`, `edT`, `cw`, `cv` (converter state per category — not persisted), `cvLast`, `cq`, `ck`, `ux`, `pg` (programmer — not persisted), `cf` (selected formula + values), timers `ct`, `gt`, `cvt`, `edT`.

### 6.4 Cross-app / events / timers
- `storage` event on `remotion-calc` → reload store, rebuild units, repaint history only (L22598). Open page, settings, vars chips are not refreshed (Partial).
- No custom event bus. OS function wrapping: `dkOpenX`, `renderDock`, `osRelabel` monkey-patched (L22588–L22590).
- Timers: save debounce 250 ms; field compute 90 ms; graph redraw 140 ms; converter 70 ms; editor 90 ms; toast 1.8 s / 4 s undo; copy-button check 1.1 s; history panel hide 260 ms.

---

## 7. Integrations & external dependencies

| Kind | Usage | Line |
|---|---|---|
| Network | **none** (no fetch/XHR/WebSocket). Currency explicitly has "no live rate provider" | L22381 |
| CDN libraries | none | — |
| `window.claude` | none | — |
| Clipboard | `navigator.clipboard.writeText`, fallback hidden textarea + `document.execCommand("copy")` | L21538–L21539 |
| File download | `Blob` + `URL.createObjectURL` + `<a download>`, or OS `dcSaveFile(name, blob)` if defined (Files app integration) | L21536 |
| File import | `<input type=file accept=.json>` + `File.text()` | L22546 |
| `Intl` | `NumberFormat` (currency), `DateTimeFormat` (time zones, offsets), `supportedValuesOf("timeZone")` with fallback list | L21258, L22409–L22411 |
| Web Animations API | `el.animate` for all motion | many |
| `ResizeObserver` | window body + graph SVG | L22062, L22586 |
| Pointer capture / wheel | graph | L22055–L22057 |
| `TextEncoder` | `uni` tool (UTF-8 bytes) | L22446–L22449 |
| `DataView`/`ArrayBuffer` | IEEE-754 inspection (`prec`) | L21953–L21957 |
| `CSS.escape`, `getComputedStyle` | focus restore, editor char width | L21603, L22105 |
| OS globals consumed | `OSW`, `osWinOpen`, `osRestore`, `osFocus`, `osRunMark`, `DK_APPS`, `AL_APPS`, `OS_DOCK`, `OS_OPEN`, `alStore`, `alSave`, `alTouch`, `dkGlyph`, `dkOpenX`, `dkPop`, `dkId`, `renderDock`, `osRelabel`, `desks`, `saveDesks`, `lang`, `t`, `nf`, `toast`, `lkRM`, `dcSaveFile`, I18N key `calcsci` | L22564–L22598 et al. |
| Globals exported to others | `L4` (used by ≥1,367 later lines: billing etc.), `CA`, `caOpen` via `OS_OPEN.calcsci` / `OS_OPEN.calculator` | L21374, L22587 |
| Other apps read/written | launcher store `remotion-apps`, desktop items; app mode `OS_SOLO.calcsci` (L20980) | |

---

## 8. i18n / RTL

- Languages: fr, en, de, ar. Strings embedded inline as `"fr|en|de|ar"` and resolved by `L4` (L21374) using global `lang`; fallback English then first part. Shell strings in `CAW` (48 keys), errors in `CA_ERR` (84 keys), unit names, category names `CA_CATN` (L21328), constants names, tool names/fields/assumptions all inline. Only the app title uses the global I18N `t("calcsci")` (L12310). `caErrMsg` is redefined (L21417) to use `CA_ERR` instead of `t()`.
- German and Arabic strings are frequently abridged versions of fr/en (e.g. assumptions) — INFERENCE from content.
- Numbers: decimal separator auto (fr/de → `,`), grouping auto (fr thin space, de `.`, en `,`), currency via `Intl` with locales fr-FR/en-GB/de-DE/ar (L21259). Arabic uses Western digits through `caFmt` but `Intl` "ar" for currency (may emit Arabic-Indic digits — UNKNOWN, browser-dependent).
- Language change: `osRelabel` wrapper re-renders the whole app (L22590).
- RTL: root `.ca` gets `dir` from `document.documentElement.dir` (L21448); drawers flip via `[dir=rtl]` CSS (L5543, L5548); page slide direction inverted for RTL (L21472, L21481); numeric/code content forced `dir="ltr"` on outputs and inputs; keypads, editor, displays, graph window fields forced `direction:ltr` (L5583–L5584). Graph SVG `direction="ltr"`.
- Not localized (FACT): result `formula` strings (mostly symbolic, some French words e.g. "produit en croix", "si début", "débit = volume / durée"), duration unit `j` in `dur` (L22401), CSV headers "Date"/"Expression"/"Note" partially, editor sample variable names, keyboard-shortcut labels partially.

---

## 9. Design tokens & motion

- Scoped tokens on `.ca-win` (L5155–L5158), dark overrides for `:root.dark` / `[data-theme=dark]:not(.light)` (L5157): `--ca-g` green accent #16954c (dark #2fbf66), `--ca-g2`, `--ca-gs`, `--ca-gi`; amber secondary `--ca-b` #a65d00 (dark #f2a93b), `--ca-b2`, `--ca-bs`; `--ca-bg` #f4f7f5 / #1b2024; `--ca-in`, `--ca-disp` gradient, `--ca-key`, `--ca-fn`, `--ca-amb`, `--ca-ambs`, `--ca-reds`, `--ca-sh`, `--ca-mono` font stack; chart series `--ca-s0..s3` (blue, orange, violet, green — "validated categorical order" L5313).
- Shared OS tokens consumed: `--fg`, `--muted`, `--line`, `--surface`, `--shadow`, `--font`, `--spring` (18 uses).
- Dock glyph gradient `linear-gradient(145deg,#2fc768,#14864a)` (L22565).
- Layout: CSS grid `236px / 1fr / auto` (l), `208px / 1fr` (m), single column (s) (L5160–L5164); `container:ca/inline-size` declared on `.ca-win .os-wb` (L5159) but no `@container` rules — size switching is JS (`data-sz`).
- Keyframes: `caFade`, `caPop` (dialogs), `caHit` (key press), `caRip` (ripple). JS animations with easing `cubic-bezier(.2,.9,.3,1)` (enter/slide/roll, 220–380 ms), `cubic-bezier(.2,1.6,.4,1)` (star/bit pop), `cubic-bezier(.2,1.3,.3,1)` (dock button in), staggered card entrance (40 ms + 35 ms·i).
- Reduced motion: `caRM()` checks OS `lkRM()` setting or media query and skips all JS animations; CSS forces 0.01 ms durations under `prefers-reduced-motion` (L5579).
- `@media (hover:none)` shows history row actions (L5576).

---

## 10. Accessibility observations

Positive (FACT): nav `aria-label`, `aria-current="page"`, sections `aria-expanded`; icon buttons have `aria-label` + `title` (49 aria-labels); toggles `aria-pressed` (17); segments `role=radiogroup/radio` + `aria-checked`; result regions `aria-live="polite"`; toast `role=status`; confirm `role=alertdialog aria-modal`; unit picker and autocomplete `role=listbox/option` + `aria-selected` with full keyboard support; nav arrow-key traversal; global `:focus-visible` outline (L5166); auto-focus first input on page change (L21481); plots have `role=img` + label; reduced motion honoured.

Issues:
- `caPrompt` dialog has no `role="dialog"`/`aria-modal`/label association, no focus trap, focus not returned to invoker (L21559). `caConfirm` also lacks focus trap/return.
- Segmented controls use `role=radio` but no arrow-key handling (only click) (L21495).
- Editor captures Tab (inserts spaces) with no escape key binding → keyboard trap for the textarea (L22183) unless autocomplete is open.
- Graph hover values available only by pointer; no keyboard/screen-reader access to sampled values beyond zero list.
- Standard calculator display updates are in an `aria-live=polite` container that re-announces on every key (L21991) — potentially noisy.
- Bit grid buttons labelled only by `title` (`bit n`) — no `aria-label` (L22233).
- Main `<main aria-live="off">` fine; history `aside` uses `hidden` correctly.
- Colour contrast not measured (UNKNOWN).
- `.ca-sin:focus` removes outline and border (L5580) — the scientific input's focus indication relies on container styling (INFERENCE: possible visible-focus gap).

---

## 11. Migration notes for Next.js (App Router, TypeScript, React)

### 11.1 Current DOM patterns to replace
- Whole-app string rendering via `innerHTML` (`caRender` L21449, page swap L21478, ~40 partial `innerHTML`/`outerHTML` repaints e.g. nav L21598, form L21602, history L21555, editor L22093–L22095, converter L22134–L22136). Every user string goes through `caE`, but several attribute interpolations are unescaped (see 11.5).
- 18 document-level capture listeners keyed on `data-*` hooks (L21567, L21597, L21605, L21606, L22065, L22139, L22173, L22177, L22179, L22208, L22209, L22244, L22245, L22390, L22515, L22516, L22544, L22547). In React these become component handlers; the keyboard handler for the standard calculator must remain a scoped listener on the calculator container (not `window`) to keep the "only when inside this window" behaviour (L22179).
- Imperative Web Animations (`el.animate`) everywhere → Motion (Framer Motion) `AnimatePresence`/`layout` or CSS transitions; honour `useReducedMotion` + OS setting (`lkRM`).
- Module-level mutable singletons `CA`, `CA_U` (rebuilt from user units), `CA_TZ` cache.

### 11.2 Client-only parts
Everything that touches `localStorage`, clipboard, `File`, `Blob` download, `ResizeObserver`, pointer/wheel on SVG, `Intl.supportedValuesOf`, `getComputedStyle` (editor char width) and the OS window manager must be `"use client"`. The engine itself is isomorphic and can run on the server or in a Web Worker (useful for heavy loops: factorisation up to 10³⁰, sieve ≤10⁶, Durand–Kerner, 4,000-step root scans).

### 11.3 Suggested decomposition
```
packages/calc-engine/          (pure TS, no DOM — see 11.4)
  errors.ts  tokenizer.ts  parser.ts  evaluate.ts  functions.ts  format.ts  numerics/*.ts
  units/registry.ts  units/convert.ts  units/quantity.ts  constants.ts
  math/{rational,primes,complex,matrix,polynomial,stats,dimension,ieee754}.ts
  domain/{finance,dates,timezone,color,chemistry,programmer,geometry,engineering}.ts
  tools/<id>.ts   (80 tool definitions: fields schema + run(ctx) → ResultModel)
apps/web/app/(os)/calculator/
  layout.tsx (CalcShell: Nav, Header, HistoryPanel, Toast, Scrim)   page.tsx (Home)
  [toolId]/page.tsx → <GenericTool def=…/> or custom page component
  components/ Nav, ToolSearch, AngleChip, FavButton, ResultCard, ResultTable(CSV), FieldRenderer
              (num/int/text/area/sel/seg/chk/date/dt/time + UnitSelect), ExampleChips,
              StandardCalc, ScientificCalc, Keypad, GraphPlot (SVG + pan/zoom hook), ExpressionEditor
              (overlay highlighter + autocomplete), Converter + UnitPicker (combobox), ConstantsTable,
              UnitExpression, ProgrammerCalc + BitGrid, CustomFormulas, Settings, Library,
              PromptDialog / ConfirmDialog (Radix/shadcn Dialog/AlertDialog)
  state/ calcStore.ts (Zustand + persist middleware on key "remotion-calc", version + migrate)
```
Routing: tool ids are stable slugs (`frac`, `cv_length`, …) — map 1:1 to `/calculator/[toolId]`; history `reopen` becomes navigation with serialized inputs (search params or store).

### 11.4 Pure-logic modules portable as-is to TypeScript (and how to test them)

| Module | Source lines | DOM/global deps to inject | Test strategy |
|---|---|---|---|
| Tokenizer + Pratt parser (`caTok`, `caParse`) | L21079–L21130 | `CA_RESERVED` | **Golden**: table of input → AST/`CaErr(k,pos)` (precedence: `-2^2=-4`, `2^3^2=512`, `2(3+4)=14`, `2 3`→`ca_eTwoNum@2`, `sin`→`ca_eFnParen`, `(`→`ca_eEnd`). **Property** (fast-check): random AST → pretty-print → parse → structurally equal; parser never throws non-`CaErr`. |
| Evaluator + function table (`caEvalAst`, `CA_FN`, `CA_FN_ARITY`, `CA_CONST`, `caTrig`) | L21166–L21226 | settings `ang` (pass as ctx instead of `caSet()`), `caConstGet` (inject constants + user consts) | Golden values **(verified-run)**: `sin(90)=1`, `cos(90)=0` exact in DEG, `tan(90)`→`ca_eUndef`, `-7 mod 3=2`, `round(-2.5)=-3`, `round(1.005,2)=1.01`, `0^0=1`, `(-8)^(1/3)`→`ca_eNegPow`, `root(-8,3)=-2`, `log(8,2)=3`, `nCr(52,5)=2598960`, `fact(171)`→`ca_eOverflow`. Property: results finite or `CaErr` (never NaN/∞ escape); `sin²+cos²≈1` in all angle modes. |
| Numerics (`caGamma`, `caLnGamma`, `caErf(c)`, `caPhi(Inv)`, `caIbeta`, `caTcdf/inv`, `caIntegrate`, `caDeriv`, `caRoots`, BigInt comb/perm) | L21132–L21164 | none | Compare against reference tables (Abramowitz–Stegun / scipy-generated JSON): Γ(n)=(n−1)!, Φ(1.96)=0.975002…, t-quantiles; integration of polynomials exact, ∫₀¹e^(−x²)=0.746824132812 **(verified-run)**; property: `caPhi(caPhiInv(p))≈p`. |
| Formatting (`caFmt`, `caGroupInt`, `caGroupBig`, `caRoundMoney`, `caMoney`) | L21237–L21259 | settings + `lang` → explicit options object | Golden per locale/notation: EN `123456.789`→`123,456.789`, FR `1234567.891`→`1 234 567,891` (thin space) **(verified-run)**, `1e20`→`1 × 10²⁰`; property: `parse(caFmt(x,{plain:true,sig:17}))===x`; money rounding table (half-up vs half-even, `2.675→2.68`). |
| `caNumIn` (locale-aware input) | L21228–L21235 | settings, vars | Golden: `1,5`(fr)=1.5, `1,234`(en)=1234, `1.234,5`=1234.5. |
| Units registry & conversion (`CA_UD`, `CA_FUEL`, `caUnitsBuild`, `caUnitFind`, `caConvert`, quantities) | L21269–L21348 | user units list, `L4` for names | Property: `convert(convert(v,a,b),b,a)≈v` for all unit pairs per category; exact-flag pairs reproduce known factors; temp golden (`98.6°F=37°C`, `-40°C=-40°F` — currently **fails in expressions**, §13); fuel reciprocity. |
| Constants (`CA_CONSTS`, σ derivation, `caDimStr`) | L21351–L21372 | | Golden vs CODATA/SI JSON. |
| Rationals (BigInt) | L21615–L21627 | `caGroupBig` (formatting) | Property: result normalized (`gcd(n,d)=1`, `d>0`), field laws (assoc./distrib.), `caRatDec(1/7)="0.(142857)"`, `caBestFrac(π,1000)=355/113` **(verified-run)**. |
| Primes / factorisation | L21629–L21636 | | Property: `caIsPrime` agrees with sieve ≤10⁶; product of `caFactor(n)` = n and all factors prime; golden `600851475143 = 71·839·1471·6857`, `2⁶¹−1` prime **(verified-run)**. |
| Complex | L21638–L21653 | `caFmt` | Property: `exp(ln z)≈z`, `|z1 z2|=|z1||z2|`. |
| Matrices / systems | L21655–L21667, sys L21781–L21788 | | Property: `A·inv(A)≈I`, `det(AB)≈det A det B`, rank invariants; golden 3×3 system → (2,3,−1). |
| Polynomials + symbolic expand | L21669–L21688 | `caParse` AST | Property: `p(root)≈0`; expand(`(x+1)^3 - x*(x-2)`) = `x³+2x²+5x+1` **(verified-run)**; derivative/antiderivative consistency. |
| Stats / regression / distributions | L21690–L21693, L21872–L21920 | | Golden vs scipy/numpy fixtures (quantile type-7 linear interpolation, sample/pop variance, CI with t). |
| Dimensional analysis (`caDimParse`) | L21940–L21947 | | Golden: `kg*m^2/s^2` → `m²·kg / s²` **(verified-run)**, prefixes. |
| IEEE-754 inspection (`prec`) | L21953–L21957 | | Golden: 0.1 → `0.1000000000000000055511151231257827021181583404541015625`. |
| Programmer (`caPgParse/Fit/Signed`, ops) | L22219–L22243 | | Property: `fit(v,w).u ≡ v mod 2^w`; signed↔unsigned round-trip; ROL∘ROR = id; golden `255` in 8-bit signed → −1 with overflow flag. |
| Finance (`caAmort` integer cents, PV/FV, depreciation, VAT, margin, BEP) | L22336–L22379 | `caMoney`/settings rounding | Golden: loan 200,000 @3.5 %/20 y monthly → payment €1,159.92, total interest €78,380.66, last payment €1,159.78 **(verified-run)**; property: schedule principal sums to P exactly (cents). |
| Dates / time zones (`caYMD`, working days, `caTzOffset`, `caTzToUtc`, unix, calendar) | L22393–L22434 | `Intl`, "today" → inject clock | Golden fixtures incl. DST transitions (Europe/Paris), leap years, month-end clamping; run tests with fixed TZ (`TZ=UTC` and `TZ=Europe/Paris`). |
| Colour (`caRgb2Hsl`, `caHsl2Rgb`, `caLum`, contrast) | L22438–L22445 | | Property: rgb→hsl→rgb round-trip ±1; WCAG contrast golden (#000/#fff = 21). |
| Chemistry (`caFormula`, `CA_AW`) | L22452–L22460 | | Golden: C6H12O6 = 180.156 g/mol **(verified-run)**, `CuSO4·5H2O`, nested brackets. |
| Health (`health` run) | L22481–L22489 | | Golden: BMI 22.86, BSA 1.845, 125 mL/h, 41.67 drops/min **(verified-run)**; must keep the ack gating + disclaimers; consider clinical validation sign-off before shipping. |
| Each of the 80 generic tool `run` functions | L21711–L22490 | `caCtx` (`num`, `base`, `uOf`), `L4`, `caFmt` | **Snapshot/golden harness**: for every tool, run defaults + curated cases and snapshot `ResultModel` (main/rows/table/warn). The Node vm harness used for this audit already does this for all 80 (`w/h/q3.js`) and can generate the baseline fixtures before porting. Recommend returning raw numbers + format hints from `run` in the TS port so formatting can be tested separately. |

Recommended: separate the *numeric result* from *presentation* (today `run` returns already formatted strings via `caF`, which couples logic to settings/locale); keep error keys (`ca_e*`) as a typed union.

### 11.5 Security / privacy concerns
- FACT: no `eval`/`Function`; expression language is a closed interpreter → safe to keep.
- RISK (XSS via import): imported JSON is merged without schema validation (L22546). Several fields are interpolated into HTML **without `caE`**: history `data-hid="${h.id}"` (L21552), favourite conversion `data-cvpre="${f.a}|${f.b}"` (L22122), saved rates `1 ${r.a} = … ${r.b}` (L22388), `data-cago="${id}"` from favourites/recent is guarded by `CA_T[id]` existence (safe). A crafted `remotion-calculatrice.json` could inject markup. Use zod validation + React escaping in the port.
- RISK: `vars` from import are not type-checked; non-number values flow into the evaluator (strings would concatenate in `+`). Validate as `number | Quantity`.
- Privacy: health inputs are **not** persisted unless the user adds them to history (history stores `inputs` incl. mass/height, L21545) — then stored in plain localStorage `remotion-calc` and exported in JSON. The `lab` acknowledgement is persisted. Mark health history entries as sensitive (or exclude from export) in the port.
- Keyboard: Ctrl+P / Ctrl+R / Ctrl+L / Ctrl+Q / Ctrl+M are `preventDefault`ed on the standard calculator page when focus is not in a field (L22186–L22189) — overrides print/reload/address bar.

### 11.6 Estimated complexity
**XL** (uncertainty: medium). Engine + 34 converters + 80 generic tools are mechanical to port (largely pure functions, schema-driven forms) — L for that part alone. The custom interactive pages (standard/scientific calculators with keyboard semantics, graph pan/zoom, overlay-highlighted editor with autocomplete, unit picker combobox, programmer bit grid) plus history/import/export and i18n (4 languages, RTL) push it to XL. Clinical review of the health tool is an external dependency.

---

## 12. Counts summary

| Metric | Count |
|---|---|
| JS lines (L21068–L22598) | 1,531 (≈405 KB) |
| CSS lines (L5154–L5585) | 432 (≈40 KB), 117 `.ca-*` classes, 4 keyframes |
| Registry entries (tools/pages) | 126 (80 generic form tools, 46 custom pages) + Home |
| Sections | 10 |
| Converter categories / built-in units | 34 / 291 |
| Constants | 30 built-in (+ user) |
| Expression functions | 46 (`CA_FN`) + constants pi/π/e/phi/φ/tau/τ, `@` constants, `ans`, units, `to`, `deg/rad/grad` |
| Error message keys | 84 |
| Icons | 40 |
| Views/screens (distinct page types) | Home + 12 custom page types (hist, saved, std, sci, graph, editor, converter×34, consts, uexpr, prog, custom, settings, library) + generic tool page |
| Dialogs / drawers / popovers | 2 dialogs (prompt, confirm) + 2 drawers (nav, history) + unit picker, autocomplete, editor reference, graph tooltip, undo toast |
| Interaction items | 81 — Functional 74 · Partial 3 · Present-not-verified 1 · Decorative 1 group · Broken 0 · Simulated 0 |
| Generic tool runs verified | 80/80 (78 results, 2 idle by design) |
| `data-*` action hooks | 81 |
| Document-level listeners | 18 (+1 window `storage`) |
| localStorage keys (own) | 2 (`remotion-calc`, `remotion-dk-calc1`) + writes to OS `remotion-apps` and desktop items |
| Export files | `remotion-calculatrice.json` (full backup), `remotion-calculs.csv/json` (history), `<toolId>.csv` (tables), `expressions.txt/csv` |
| Network integrations | 0 |
| Health-related tools | 1 explicit (`health`) + 3 adjacent (`lab`, `chem`, `bio`) + 5 clinical-unit converters |

---

## 13. Defects / inconsistencies (current vs expected)

| # | Defect | Evidence | Current | Expected | Severity |
|---|---|---|---|---|---|
| D1 | Negating an absolute temperature quantity negates the Kelvin base value | `neg` case L21202 (`v:-a.v`) on affine quantity; **(verified-run)** | `-5 [C]` → `−551.3 °C`; `-40[°C] to [°F]` → `−1,023.34 °F`; `-273.15[°C]` → `−819.45 °C` (no absolute-zero error) | `−5 °C`; `−40 °F`; absolute-zero check | High (wrong result, silent) |
| D2 | Built-in example on "Unit-aware expressions" fails | example list L22203; `caUnitFind` priority `CA_UPRI` resolves `g/L` to density (L21331–L21334) **(verified-run)** | `500[mg/dL] to [g/L]` → "Incompatible dimensions (Mass concentration → Density)" | 5 g/L (or example uses `[massconc:gL]`) | Medium |
| D3 | Engineering notation always prints an exponent, even ×10⁰ | `caFmt` eng branch L21246–L21247; `rcomb` uses `nt:"eng"` L22264 **(verified-run)** | "59.9768 × 10⁰ Ω" | "59.9768 Ω" | Low |
| D4 | Duration tool uses French "j" for days in every language | L22401 | "2 j 12 h 0 min 0 s" in EN/DE/AR | localized day unit | Low |
| D5 | Default angle mode DEG makes calculus tool defaults misleading | `CA_DEF.ang="deg"` L21071; `limit` default `sin(x)/x` L21811; `deriv` default `sin(x)*x^2` **(verified-run)** | limit shows `≈ 0.0174532925` (π/180) by default; `f′(1)=0.0523…` | 1 / 2.2232… (radians), or force radians in calculus tools / warn | Medium (UX/accuracy perception) |
| D6 | FR/DE comma-to-dot rewrite breaks function arguments in scientific input | `caSciPaint`/`caSciEval` replace `(\d),(\d)` → `$1.$2` when decimal is "," (L22015, L22018) | in FR, `max(1,2)` is evaluated as `max(1.2)` | argument separator preserved (e.g. `;` as list separator in comma locales) | Medium |
| D7 | Formula/method strings and some labels not localized | `health` formulas French only (L22487–L22489), `ratio` "(produit en croix / cross-multiplication)", pvfv "si début", fractions "(simplifié par le PGCD / reduced by the GCD)" | mixed-language text | localized | Low |
| D8 | History section filter omits `spec` and `lib` | `CA_SECS.slice(0,8)` L21706 | cannot filter specialised (incl. health) entries | all sections | Low |
| D9 | Duplicate history entry id lacks random suffix | L21588 (`"h"+Date.now().toString(36)`) vs `caHistAdd` L21542 | two quick duplicates can collide → wrong row targeted | unique ids | Low |
| D10 | `saved` store field is dead | default L21074, import L22546; saved list is actually `hist.filter(fav)` | unused data in backups | remove or use | Low |
| D11 | History JSON export cannot be re-imported | export marker `remotionCalc:1` L21558 vs import requires `remotionCalcData:1` L22546 | "File not recognised" | either accept or document | Low |
| D12 | Cross-tab sync partial | `storage` handler only repaints history L22598 | settings/vars/editor in open view stale until navigation | re-render current view | Low |
| D13 | Import has no schema validation; some fields rendered unescaped | L22546; L21552, L22122, L22388 | potential HTML injection from crafted backup | validate + escape | Medium (security) |
| D14 | Browser shortcuts hijacked on standard calculator | L22186–L22189 | Ctrl+P/R/L/Q/M do memory ops instead of print/reload/etc. | document or use non-conflicting chords | Low–Medium |
| D15 | Lowering "History size" does not trim existing history until next addition | `hmax` applied only in `caHistAdd` L21543 | history exceeds new cap | trim on change | Low |
| D16 | Editor Tab key trap | L22183 | keyboard users cannot Tab out of the editor | Esc-then-Tab or Ctrl+M toggle | Low (a11y) |
| D17 | Prompt dialog lacks dialog semantics/focus management | L21559 | no role, no trap, no focus return | accessible dialog | Low (a11y) |
| D18 | `caMkFn` computes `ok`/`last` but never uses them | L21264–L21265 | if all probe points fail with domain errors the function is still returned (plots silently empty) | surface error | Very low |
| D19 | `CA.pg.sh` default unused | L22218 | dead state | — | Very low |
| D20 | Custom-formula variables include names of stored global variables as required inputs | `caCfVars` excludes only constants/`@`/`ans` (L22499) | a global `x` must be retyped | optional: prefill from `vars` | Very low |
| D21 | Expression `%` is plain ÷100 while the standard keypad `%` is contextual (a+b% = a+a·b/100) | L21211 vs L21982–L21983 | `10%+5` = 5.1 in expression mode | consistent semantics or documented | Low (UX) |
| D22 | `container:ca/inline-size` declared but no `@container` rules | L5159 | dead CSS | — | Very low |
