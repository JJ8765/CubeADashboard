# CubeA — Warehouse Capacity & Utilization

Interactive warehouse capacity and utilization tool for **Building A** (Michael
Kors DC), rebuilt from the `CubeA_MasterCopy.xlsx` capacity workbook. This
repository currently contains the **non-visual foundation**: the data model,
parsers, and a fully unit-tested calculation engine. The interactive SVG map and
dashboards mount on top of this same model (see the roadmap in
[`PROJECT_NOTES.md`](./PROJECT_NOTES.md)).

> **Status:** Foundation milestone. `npm run dev` shows a live *workbook
> reconciliation* screen proving the engine reproduces the Excel Summary totals.
> The map/dashboard UI is next, once the CAD SVG geometry is available.

## What works today

- **Calc engine** (`src/domain/calc`) — pure TypeScript translations of every
  workbook formula (bay volume, COUNTIF counts, cubic-ft conversion, table &
  recommended utilization, roll-ups). Each function documents its Excel origin.
- **Dual utilization model** — *actual occupancy* (from the inventory export) and
  the workbook's *design factor*, plus `headroom = effective − occupied`.
- **Parsers** (`src/domain/parse`) — read the capacity workbook (`.xlsx`), the
  inventory detail export (`.xlsx`), and the valuation pivots (`.xlsb`).
- **Repository** (`src/domain/repository`) — localStorage now, swappable for a
  real database later (single interface).
- **Sample seed** (`src/domain/sample`) — real capacity primitives + clearly
  marked synthetic occupancy so screens populate before any upload.
- **27 passing tests** including a reconciliation suite asserting the engine
  matches the workbook Summary sheet to the foot.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # run the calc + parser test suite (vitest)
npm run test:watch # watch mode
npm run typecheck  # tsc, no emit
npm run build      # production build to dist/
npm run preview    # serve the production build
```

## Data files (not committed)

The proprietary workbook and inventory/valuation exports are **never committed**
(see `.gitignore`). They are uploaded into the app at runtime. For local work,
keep them outside the repo and import them through the (upcoming) Import screen,
or rely on the built-in sample seed.

| File | Role in the app |
|------|-----------------|
| `CubeA_MasterCopy.xlsx` | Capacity master — rack profiles, factors, layout grid |
| `Inv Valuation by Building - Detail.xlsx` | Actual occupancy (used cube by location) |
| `Formula DC Valuation by Building.xlsb` | Optional $-value / trend overlay |
| CAD floor plan (SVG, pending) | Map geometry — true rack positions |

## Deploy to Vercel

The app is a static Vite build — no server needed.

1. Push this branch to GitHub.
2. In Vercel, **New Project → import this repo**.
3. Vercel auto-detects Vite. Confirm:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. Deploy. Every push to the branch triggers a preview deployment.

CLI alternative:

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

## Project structure

```
src/
  domain/
    types.ts            # data model (racks, zones, occupancy, assignments)
    calc/               # pure calculation engine (no React)
      capacity.ts       #   workbook capacity formulas
      occupancy.ts      #   inventory occupancy aggregation
      utilization.ts    #   dual utilization + roll-ups
    parse/              # xlsx / xlsb parsers
    repository/         # storage interface + localStorage impl
    sample/seed.ts      # sample data (real primitives + synthetic occupancy)
  store/                # zustand app state
  lib/                  # formatting helpers
  App.tsx               # foundation reconciliation screen
tests/                  # vitest calc + parser + reconciliation tests
```

See [`PROJECT_NOTES.md`](./PROJECT_NOTES.md) for the workbook analysis, data-model
rationale, and the full feature roadmap.
