# Audit method: shared instructions used for the seven area inventories (read-only audit)

Source: source/Remotion_Desktop.html
(single 6.5MB file, 27,218 lines: CSS lines 5–6856, markup 6857–7177, one <script> 7178–27216).
Helpers: evidence/js_outline.txt (section comments + top-level decls with FILE line numbers), evidence/css_outline.txt (CSS section comments with file lines), source file lines 6857–7177.

WARNING: some lines are enormous (i18n dictionaries and base64 blobs, up to 745k chars: lines 10450, 11054, 11238, 11624, 12310, 18962, 19864 and others). NEVER print a whole huge line. Use `sed -n 'A,Bp' FILE | cut -c1-600` or awk with substr, or grep -o with bounded patterns. Check line length first (awk '{print NR, length}').

Do NOT modify the source. Write your output ONLY to the file path given in your task, in Markdown.

Output structure (use tables, cite FILE line numbers like `L12345` for every important claim; label claims FACT / INFERENCE / RISK / UNKNOWN where it matters):
1. Scope & line ranges (JS and the CSS ranges for your area, markup ids if any)
2. Screens / views / sub-pages (exhaustive: every view, tab, dialog, drawer, wizard step, panel, menu, modal reachable). For each: name, entry point (how user reaches it), purpose, states (loading/empty/error/success/permission-denied), notable content.
3. Components (reusable pieces & builders, e.g. functions that render HTML strings): name/function, responsibility, variants, line.
4. Interaction inventory: every actionable control/behaviour (buttons, menus, keyboard shortcuts, drag&drop, context menus, gestures, timers). Classify each: Functional (verified by reading code end-to-end) / Present-not-verified / Partial / Broken / Decorative / Simulated (sample data or fake backend). Give counts.
5. User journeys (3–10 most important, step by step, with failure/cancel paths).
6. State & persistence: in-memory stores, localStorage/IndexedDB keys (exact names), schema shape, versioning/migrations, cross-app event bus or storage events, timers.
7. Integrations & external dependencies: network calls, CDN libraries loaded at runtime, window.claude usage, browser APIs (clipboard, notifications, fullscreen, FileReader, print, AudioContext, crypto, window.open...), other apps it reads/writes.
8. i18n/RTL: languages, how strings are stored (I18N objects, L4("fr|en|de|ar") pattern...), RTL handling.
9. Design tokens & motion specific to this area: accent colours, CSS variables, keyframes, transitions/easings, responsive breakpoints / container sizes, dark mode handling.
10. Accessibility observations (roles, aria, keyboard, focus traps) with evidence.
11. Migration notes for Next.js (App Router, TypeScript, React): DOM-manipulation patterns (innerHTML string rendering, global listeners, document-level delegation), globals shared with other areas (functions/consts used from elsewhere — name them), what must be client-only, suggested React component/module decomposition, domain logic that can be extracted as pure TS modules unchanged, security/privacy concerns (health data in localStorage, simulated permissions, etc.), estimated complexity (S/M/L/XL) with uncertainty.
12. Counts summary table (views, dialogs, components, interactions by class, storage keys, integrations, LOC).
13. Defects / inconsistencies found (with evidence) — record current vs expected behaviour; do not "fix".

Be exhaustive and evidence-based; read the code, don't guess from names. Target length: thorough (typically 400–900 lines of markdown). When finished, reply with a 10-line summary and the counts table only.
