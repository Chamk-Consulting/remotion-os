# Remotion OS: Next.js migration of `Remotion_Desktop.html`

This is the Next.js 16 (App Router) target of the migration planned in `../plans/migration/html-to-nextjs/`. Doc 15 there tracks progress.

## Run

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build && ./tools/serve.sh   # production server on :3100 (used by tests)
```

| Route | What it shows |
|---|---|
| `/` | The full OS. Until the React shell reaches parity, it runs the original file through the **legacy bridge** (same origin, same storage) |
| `/apps/<key>` | One app in standalone app mode (11 keys: documents, forms, files, terminal, calcsci, billing, hrPeople, patients, calendar, cabinet, planning) |
| `/#app=<key>` | Old pop-out links redirect to `/apps/<key>` |
| `/?shell=react` | **Preview** of the React shell (Phase B, in progress) |

## Tests

```bash
pnpm test                              # unit + golden (Vitest)
pnpm exec playwright test tests/e2e    # routes + dual-run parity tests (source file = oracle)
pnpm exec playwright test tests/visual/compare.visual.ts      # target vs source baseline (≤0.1 % pixels)
CAPTURE=1 pnpm exec playwright test tests/visual/capture-baseline.visual.ts   # recapture baseline from the source
```

## Rules

- **The source visuals win:** `src/styles/legacy/*` are verbatim slices of the source CSS (a byte-identity test checks this). Don't edit them.
- **Same storage keys and shapes** as the source (`src/lib/storage/keys.ts`: 40 keys + 1 IndexedDB). Don't add keys.
- **Generated markup:** `src/os/shell/generated/*` comes from `node tools/markup-to-jsx.mjs --gen`. Don't edit it by hand.
- **Defects:** source defects are reproduced unless they are in the approved fix set (doc 09 §4). Every reproduction is commented with its `D-xx` id.
- **Regenerating data:** i18n and registry data are extracted from the source (`pnpm extract:i18n`, `pnpm extract:registry`). Never retype them.
