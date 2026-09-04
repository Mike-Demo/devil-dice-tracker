# Turn counter + phase indicator, then publish

## What you'll get

- A **turn counter** on the game sheet header: "Turn 3 of 15" (Island One) or "Turn 3" (Island Two), plus whose turn it is.
- A **phase indicator** below the header that steps through each turn:
  1. **Roll** — roll the physical dice (re-roll up to 2 more times if you want)
  2. **Build** — tap roads, settlements, cities, knights on the map
  3. **Score** — confirm this turn's points, then End Turn
- Tap the current phase to advance to the next one; it resets to Roll on each new turn. Tapping map pieces auto-moves you to the Build phase.

## Technical details

- Round data already exists in the engine (`game.round`, `currentPlayer`) — no engine or rules changes.
- Phase is UI-only state in `src/routes/game.$id.tsx` (roll → build → score), reset whenever `currentPlayer`/`round` changes. Not persisted mid-refresh — safe default is Roll.
- Island One shows "Turn N of 15" using `TURNS_PER_GAME`; Island Two shows "Turn N" since it ends at 10 VP.
- Then **publish** the app so the live link (https://catan.quest and the Lovable URL) serves the update on phones and tablets.
