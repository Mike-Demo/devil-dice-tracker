# Copy the paper's Island hex layout

Redraw the map so it matches the printed Catan Dice Game sheet: six terrain hexes in a ring around open sea, roads sitting on the hex edges (including the forks), and building slots as the arrow-shaped tokens from the paper. Scoring and building rules stay exactly as they are today.

## What the board becomes

- **Six terrain hexes in the paper's arrangement**: mountains, desert, hills/brick across the top, then fields, pasture, forest below, leaving the open blue water in the middle and around the island, exactly as on the sheet.
- **Knight pawns on the hexes**: each producing hex carries the numbered pawn (1-5) with its resource picture; the desert carries the "?" wild pawn numbered 6. These are the existing knights, moved onto the tiles instead of sitting in a strip below.
- **Roads on the hex edges**: every road is a small tilted rectangle marked "1", laid along the island's edges just like the paper, so the branches and forks are visible.
- **Building slots as arrow tokens**: settlements and cities appear as the paper's white arrow/house shapes with their point numbers (3, 5, 7, 9, 11, 12, 20, 30 style values kept as the app already scores them), placed at the same spots along the road path.
- **Colours and feel of the printed sheet**: blue sea panel, sand-coloured island border, terrain art tones for mountains, fields, pasture, forest, hills and desert.

## What stays the same

- Roads still unlock one after another in the current fixed order — the forks are drawn but the sequence rule is unchanged, per your choice.
- All point values, knight jokers, joker spending, turn flow, scoring chips, undo, cloud sync and the results screen are untouched.
- Every tap target stays finger-sized on a phone, single column.

## Technical notes

- `src/lib/engine/island.ts`: replace `HEXES` with the six-hex paper arrangement and derive road node coordinates from hex-edge midpoints; re-position `SITES` (settlements, cities, knights) onto the corresponding corners/tiles. Site ids, `order`, `points`, `node` indices and `ROAD_COUNT` stay identical so the engine, tests and saved games keep working.
- `src/components/IslandMap.tsx`: redraw the SVG — sea rect, hex terrain tiles, edge-aligned road rectangles rotated to their edge angle, arrow-shaped build tokens, hex-mounted knight pawns. Same props and callbacks.
- `src/components/MapLegend.tsx`: adjust wording for the new visuals.
- Island Two keeps its own hex set in the same style, with the hatched Longest Road space preserved.

## Verification

- All 14 existing tests pass unchanged; typecheck and build clean.
- Browser check at phone width: hexes and numbers visible, road taps still build in order, settlement/city/knight taps score, End turn advances.
