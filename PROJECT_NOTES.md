# CubeA — Analysis, Data Model & Roadmap

This document captures the source-workbook analysis, the data model derived from
it, and the plan for the interactive app. It is the reference behind the code in
`src/domain`.

## 1. Source workbook analysis (`CubeA_MasterCopy.xlsx`)

The workbook is a **cubic-volume capacity calculator** driven by a cell-grid floor
map. Seven sheets, one engine:

| Sheet | Role | Contents |
|-------|------|----------|
| **Summary** | Output | Rolls up Retail + Wholesale + MODs (± Dock) into Total / Table-Utilization / Recommended cube (ft³ & in³). |
| **Location Details** | **Source** | The **Master Table** (cols S:X): 22 rack *profiles* (A1, A4, R1, DR…), each with per-level `Height×Width×Depth → Volume(in)`. |
| **Mods Summary** | Source | MOD 6/7/8 × Level 1–3 cube values (entered, not dimension-derived). |
| **Retail** | Calc + layout | Per-code summary table + **cell grid `B22:EF49`** (each cell = a rack code). |
| **Wholesale** | Calc + layout | Same pattern; grid `A21:FW60`; adds A4W/X1/X4/Z1/Z4. |
| **Dock Racks** | Calc + layout | Single "DR" profile; grid row `C19:AY19`. |
| **Utilization Rates** | Config | Utilization + Recommended factors per storage category (0.8 / 0.65…). |

**The core mechanism:** the floor layout is a grid of cells, each holding a
rack-type code. Capacity flows as:

```
Volume(in)/level = H * W * D                          (Location Details!X = U*V*W)
Bay Volume(in)   = Σ level volumes                    (SUM of Master Table X range)
# Bays           = COUNTIF(grid, code)                (the layout tally)
Total Volume(in) = Bay Volume × # Bays
Cubic Ft         = Cubic In / 1728
Table Utilization= Total × utilization factor         (Utilization Rates col C)
Recommended      = Total × recommended factor         (Utilization Rates col D)
Grand total      = Σ codes → Σ sheets
```

"Assigning racks and having space update automatically" = placing a rack code in
a grid cell; COUNTIF re-tallies and every total updates.

**Key limitation:** the workbook has **no actual occupancy** — it models
*capacity* and a design *utilization factor* (usable fraction), not how full racks
are. Every sheet currently applies the same 0.8 (Case Reserve) factor even though
the rate table defines others.

### Reference totals (used by the reconciliation test)

| Zone | Total ft³ | Source cell |
|------|----------:|-------------|
| Retail | 1,557,569 | `Retail!F18` |
| Wholesale | 1,380,934 | `Wholesale!I15` |
| MODs | 134,359.96 | `Mods Summary!D14` |
| Dock Racks | 36,521.33 | `Dock Racks!K6` |
| **Grand (no dock)** | **3,072,862.96** | `Summary!G10` |
| **Grand (with dock)** | **3,109,384.29** | `Summary!G23` |

## 2. Supplementary data sources

- **`Inv Valuation by Building - Detail.xlsx`** — the missing occupancy layer.
  Per-SKU-per-location inventory for **Building A** with `Aisle / Bay / Level /
  Position`, `Location Type` (RTL/WHL/D…), `Location Class` (Reserve / Pack&Hold /
  Active…), `Product Division`, `Quantity`, and per-unit cube. Occupied cube =
  `Quantity × Volume(ft³)`. Building A ≈ 17.3k occupied locations, ≈ 550k ft³ of
  product cube. Enables **true utilization = occupied ÷ capacity**.
- **`Formula DC Valuation by Building.xlsb` (×2 dates)** — $-valuation pivot
  summaries (Ext Units/Cost/Price). No cube. Optional value + trend overlay only.
- **CAD floor plan (`Building_A_7726_Editing.dwg`)** — geometry reference for the
  map. **Measured, not embedded:** the DWG (AutoCAD 2018, 317 layers) was read
  with LibreDWG → DXF → ezdxf, the true dimensions extracted, and the layout
  **rebuilt natively** in `src/domain/layout/floorplan.ts` so the app ships clean
  vector geometry instead of a 30 MB drawing export. Measured truths (units =
  inches): structural column grid **52 ft × 50 ft** on centre; rack floor extents
  **≈ 1847 ft (E–W) × ≈ 625 ft (N–S)**. Excel remains the data master; where CAD
  and Excel disagree on which racks exist, Excel wins. (Note: two Aisle 24s in
  Wholesale are real.)

## 3. Data model

Defined in `src/domain/types.ts`:

- `RackProfile` — a rack type and its levels; `bayVolumeIn`.
- `UtilizationFactor` — a storage category's design factors.
- `Bay` — one physical location: `rackCode` (capacity key) + address
  (`aisle/bay/level/position`) + optional geometry (`x/y/w/h` from CAD) +
  `source` flag (`excel` / `excel+cad` / `cad-only`).
- `Assignment` — the added tagging layer (department / category / storage type).
- `LocationOccupancy` / `InventorySnapshot` — actual used cube by location.
- `WarehouseModel` — the assembled, serialisable model consumed by the engine.

**Two masters, resolved:** Excel = data (existence, capacity); CAD = geometry
(positions). Inventory = occupancy. Valuation = optional overlay.

## 4. Layout / geometry model

The floor geometry is our **own native model**, rebuilt from the CAD (not the CAD
file itself). See `src/domain/layout/floorplan.ts`.

- **Division of truth:** CAD → true scale + footprint + column grid (measured in
  inches, expressed in feet); Excel → bay dimensions (nominal 8 ft × 3.5 ft) and
  the relative layout / per-code counts.
- **Model:** building footprint `1850 × 625 ft`; four zone rectangles placed per
  the CAD arrangement (Retail west, Wholesale east, MODs high/centre, Dock along
  the south edge). A per-zone `ZoneAllocator` fills each region with bays in
  aisle-and-row order (18 ft row pitch), emitting a real-world `x/y/w/h` rectangle
  per bay. The sample seed now tags bays `source: "excel+cad"`.
- **Coordinates** are feet, origin at the building SW corner, +x = east, +y =
  north. Real uploads can later carry exact per-bay CAD coordinates; this native
  model is the schematic baseline the map renders against.
- Covered by `tests/floorplan.test.ts` (geometry present, in-footprint, in-zone);
  capacity numbers are unchanged (`tests/reconcile.test.ts`).

## 5. Roadmap

- [x] Data model, parsers, calc engine, repository, sample seed
- [x] Reconciliation tests vs. workbook Summary (32 tests passing)
- [x] Foundation screen (live reconciliation)
- [x] CAD-derived floor geometry model (`floorplan.ts`); bays carry `x/y/w/h`
- [ ] Import/Export screen (upload workbook + inventory; export xlsx/csv; reset)
- [ ] Interactive layout map (pan/zoom, hover-glow, select, "Color/Measure by")
- [ ] Rack detail panel + assignment (single + bulk)
- [ ] Dashboard (KPI cards, Recharts, high/low-util tables)
- [ ] Capacity table + filters + search-to-highlight
- [ ] Data-Mapping / Settings (rack→category→factor, color thresholds)

The approved dark "control-room" UI direction is captured in the interactive
mockup shared during planning.
