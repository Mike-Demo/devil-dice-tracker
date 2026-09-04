# Match the Official Sheet + Turn Log + Logo

Three pieces of work: correct the map to match the printed Island One sheet, add a turn log to the game sheet, and finish wiring up the new icon as logo/favicon/social image.

## 1. Fix the map to match the official paper sheet

Comparing the official Island One sheet with the app:

**Knight numbers are on the wrong tiles.** Paper: 1=Mountains(ore), 2=Fields(wheat), 3=Pasture(sheep), 4=Forest(wood), 5=Hills(brick), 6=Desert(?). The app currently has Fields/Pasture and Hills/Forest swapped.

**Build spaces have the wrong values and count.** Paper has 6 settlement spaces (3, 5, 7, 7, 9, 11) and 4 city spaces (7, 12, 20, 30). The app has 4 settlements (3,4,5,6) and 3 cities (7,10,12).

Changes (`src/lib/engine/island.ts`):
- Reorder `KNIGHT_HEX` so each knight sits on the correct tile.
- Replace the settlement list with the paper's 6 values (3,5,7,7,9,11) placed at the correct road nodes around the island, and the city list with the paper's 4 values (7,12,20,30).
- Build order stays "ascending points within kind" on Island One (unchanged rule), now over the paper's values.
- Island Two uses its own fixed 1 VP / 2 VP scoring — its map and rules are untouched.

Engine/tests: `src/lib/engine/engine.ts` scoring logic needs no change (it reads `site.points`), but `src/lib/engine/engine.test.ts` must be updated for the new site ids/values, plus new tests asserting the paper values.

Note: saved in-progress Island One games reference old site ids (s1–s4, c1–c3). New ids will be added as s5/s6/c4 and values change on existing ids, so old in-progress Island One sheets may show slightly different scores. Acceptable for a pre-release app; called out here explicitly.

## 2. Turn log on the game sheet

- Add `log` to the game state: one entry per committed turn with player name, turn number, and what was built (roads, settlements, cities, knights, jokers spent) plus points scored.
- Entries are appended in `endTurn` (`src/lib/engine/engine.ts`) from the turn draft — no retroactive reconstruction.
- Game sheet gets a collapsible "Turn log" section below the map: newest turn first, e.g. "Turn 3 · Ana — Road 4, Settlement 5, Knight 2 — 8 pts".
- Log persists locally and syncs to the cloud with the rest of the game state (it's part of the saved game object).

## 3. Logo, favicon, social previews

The icon is already extracted to `public/logo.png` (512px) and `public/favicon.png` (64px). Remaining:
- Home header: replace the sheep image with the new icon (`src/routes/index.tsx`).
- Search/social previews: add `og:image` and `twitter:image` pointing at `https://catan.quest/logo.png` on the home route head, and switch `twitter:card` to `summary_large_image`? No — keep `summary` (square icon). Favicon link in `__root.tsx` already points at `/favicon.png`.

## Verification

- Update + run Vitest suite (engine + profiles).
- Playwright: open an Island One game, confirm knight numbers and 3/5/7/7/9/11 + 7/12/20/30 spaces match the paper, play a turn, confirm the turn log records it, confirm it survives reload.
- Confirm home page shows the new icon and the meta tags render in the HTML.
