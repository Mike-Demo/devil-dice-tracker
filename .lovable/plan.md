# Hex Catan Board Reskin

Replace the parchment-style map with a proper Catan hex board — numbered resource tiles, resource cards, and a robber — while keeping every game rule, scoring step, and tap target exactly the same.

## What changes (visual only)

### The board (`src/components/IslandMap.tsx` + `src/lib/engine/island.ts`)
- **Classic fixed hex layout**: the standard 19-tile island (3-4-5-4-3 rows) in the beginner arrangement — 4 grain, 4 lumber, 4 wool, 3 brick, 3 ore, 1 desert in the middle of the fixed classic positions.
- **Number tokens**: each producing hex shows its classic number disc (2–12) with probability pips; the desert shows no number and holds the **robber** (a dark pawn token).
- **Resource-colored hexes** using the existing palette (brick, lumber, wool, grain, ore) with simple SVG texture motifs (hills, forest, pasture, field, mountains) so tiles read at a glance on a phone.
- **Roads** become the hex-edge path: the existing serpentine road network is laid over the hex borders so roads still build in order and unlock adjacent buildings — same indices, same rules.
- **Settlements/cities** sit at hex corners attached to their road node, drawn as wooden house / city pieces on a raised token with their point value, instead of flat circles.
- **Knights become a resource-card row** below the board: each knight is a resource card (Brick / Lumber / Wool / Grain / Ore / Wild "Any") showing the knight symbol, its 1 pt value, and flipping/marking when spent — matching the "resource cards" ask.

### Kept identical
- Engine, rules, road/site/joker indices, validation, scoring, turn flow, cloud sync — no logic changes.
- Zone headers, captions, legend (`MapLegend`), itemized scoring chips, tap feedback in the game sheet.
- Mobile-first sizing: single-column, large tap targets, viewBox sized for phones/tablets.

## Files
- `src/lib/engine/island.ts` — replace node/site coordinates with hex-derived positions; add `HEXES` (resource, number token, robber flag) for the classic fixed layout. Keep all exported IDs/indices stable so the engine and tests are untouched.
- `src/components/IslandMap.tsx` — full visual rewrite of the SVG: hex tiles, number discs with pips, robber pawn, edge roads, corner buildings, resource-card knight row. Same props and callbacks.
- Minor: `MapLegend.tsx` copy tweaks if any state visuals change.

## Verification
- Existing 11 engine tests must pass unchanged.
- Typecheck + build clean.
- Playwright on the game sheet: hexes, numbers, robber visible; tap a road → builds; tap settlement → scores; knight card spend works; End turn advances. Screenshot check on phone-width viewport.
