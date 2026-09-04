# AI Opponent for Solo Play

Add a computer player you can add to a game (solo = you + the AI). On its turn the AI rolls virtual dice using cryptographically secure randomness — the same `crypto.getRandomValues` approach as your STA D20 roller — decides what to build, and its turn is committed through the same rules engine and turn log as a human.

## What you'll see

- **New game screen:** a "Add AI opponent" button next to "+ Add player". AI players appear in the list with a robot-style badge (name editable, e.g. "Catan Bot"). Mix and match: 1 human + 1–3 AI, or add AI to a pass-and-play game.
- **Game sheet:** when the AI's turn comes up, the phase indicator shows "AI is rolling…", dice appear one step at a time (up to 3 throws, as in the real game), then its builds are tapped onto the map automatically with a short pause so you can follow along. Control returns to you for your next turn.
- **Turn log:** AI turns are logged like any other, with the dice it rolled and what it built, so you can replay its turns.
- **Results / profiles:** the AI appears in standings. It is excluded from your roster's player profile stats.

## How the AI plays

- Rolls 6 dice (faces: brick, lumber, wool, grain, ore, gold — gold is wild) with up to 2 rerolls, keeping dice toward a target build.
- Spends its resource dice (plus unused knight jokers as wilds, per the rules) on the official build costs: road = lumber + brick; settlement = lumber + brick + wool + grain; city = 2 grain + 3 ore; knight = ore + wool + grain.
- Chooses builds greedily by points, always respecting the existing engine rules (`canBuildRoad`, `canBuildSite`, `canUseJoker`) — Island One sequential ordering and road adjacency included, so the AI can never make an illegal move.
- If nothing is affordable, it scores an X, exactly like a human.

## Technical details

- New `src/lib/diceRandom.ts` — `secureD6()` via `crypto.getRandomValues` (ported from the STA project's `diceRandom.ts`, adapted to d6; same rejection-free modulo approach).
- New `src/lib/engine/ai.ts` — pure, testable functions: `rollDice()`, `chooseKeep()` (reroll strategy), `planBuilds(game)` (resource multiset + jokers → affordable build list validated through the engine). No `Math.random`.
- `src/lib/engine/types.ts` — add optional `isAI?: boolean` to `PlayerState`; add optional `dice: Resource[]` to `TurnLogEntry` so logged AI turns show their roll. Old saves stay compatible.
- `src/routes/new.tsx` — "Add AI opponent" button; AI names flagged at creation.
- `src/routes/game.$id.tsx` — when the current player is AI, a stepper effect runs roll → plan → apply draft → existing `endTurn()`, with short delays and the dice shown on screen; cloud autosave, phase indicator, and turn log all work unchanged.
- `src/routes/results.$id.tsx` / profiles — AI excluded from roster stat recording.
- Tests: deterministic AI tests by injecting a seeded random source into `rollDice`; cover legal-move guarantees, joker use, X-scoring, and a full AI-vs-human Island One game completing 15 turns.

## Not in scope

- No difficulty levels (single sensible strategy); no AI for mid-game join/replace; human dice entry stays exactly as it is.
