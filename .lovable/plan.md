# Clearer Island Map — labelled sections and scoring feedback

The map currently draws roads, settlements, cities and knights as bare shapes with a number inside, so it's hard to tell what each symbol is or what you earn by building it. This makes the map read like the paper sheet: grouped, labelled zones with plain-language callouts.

## What changes on the game sheet

1. **Grouped, titled zones on the map**
   - The road chain gets a "ROADS" band label with a note that each road must be built in order (no points on Island One, they unlock buildings and Longest Road).
   - Settlements and cities sit in a "BUILDINGS" area, each with a small caption under the icon: "Settlement · 3 pts", "City · 7 pts" (Island Two shows VP instead of points).
   - Knights sit in a bordered "KNIGHTS / JOKERS" strip at the bottom with the header "Build a knight, then tap it to spend its resource joker", and each knight captioned with its resource name (Ore, Wool, Grain, Brick, Lumber, Any).

2. **Clear state colours plus a legend**
   A compact legend below the map explains the four visual states in words: dashed outline = available to build, solid green = built, gold ring = joker ready, crossed out = joker spent, grey hatch = Longest Road space (Island Two).

3. **Live "what am I scoring" readout**
   The bottom bar currently shows only "+4 pts". It gets an itemised breakdown of the current turn, e.g.
   ```text
   This turn        +4 pts
   Road 3 · Settlement 3 pts · Knight 2 (joker ready)
   ```
   Tapping any item in that list undoes it (same toggle behaviour that already exists).

4. **Tap feedback**
   Tapping a site briefly shows its name and value as a toast-style chip near the top ("City built — 7 pts"), so it's obvious what just got scored.

## Layout notes

The map keeps a taller viewBox so the labels have room; the whole sheet stays scrollable and mobile-first with 44px+ tap targets. Nothing about game rules, validation, scoring, or storage changes.

## Technical details

- `src/lib/engine/island.ts`: add a `label` (and resource display name) per site plus zone metadata for the roads/buildings/knights bands. Pure data, no rule changes.
- `src/components/IslandMap.tsx`: render zone frames, band titles, per-site captions, and keep the existing click handlers.
- New `src/components/MapLegend.tsx`: text legend under the map.
- `src/routes/game.$id.tsx`: itemised draft breakdown in the fixed bottom bar, built from the existing `draft` (roads/sites/jokers), each chip calling the existing toggle to undo; plus the tap-feedback chip.
- Verify with the existing Vitest suite (engine untouched) and a Playwright screenshot pass at phone width.
