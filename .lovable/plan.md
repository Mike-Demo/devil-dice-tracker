# Catan Dice Game — Digital Score Sheet

A mobile/tablet-first web app that replaces the paper pad from the Catan Dice Game. Players use physical dice; the app provides the interactive game sheet, turn tracking, and scoring. Works both as pass-and-play on one device and solo on each player's own device (no syncing — everything stays on the device).

## Screens

1. **Home (`/`)** — New game setup: choose Island One or Island Two, add 1–4 players with names, pass-and-play or solo mode. Also lists saved in-progress/past games to resume or review.
2. **Game sheet (`/game/$id`)** — the core screen, one player's sheet at a time:
   - **Interactive island map** (custom SVG, based on the actual sheet layout): tap to build roads, settlements, cities, knights. Rules enforced per island: road adjacency, ascending settlement/city/knight order (Island One), free order (Island Two).
   - **Turn panel**: current player, turn number (of 15 for Island One), pass-and-play handoff prompt ("Pass to Ana").
   - **Scoring track**: 15 boxes, points entered per turn, "X" = −2 when nothing built; running total with automatic subtraction.
   - **Resource Jokers & gold trades**: tap a built knight to spend its joker; jokers marked used. Island Two: 10 VP boxes, Longest Road / Largest Army checkmarks with automatic transfer prompts.
3. **Game over / results (`/game/$id/results`)** — final standings; Island One: total score minus X penalties; Island Two: winner at 10 VP.

## How a turn works in the app

Roll physical dice → build by tapping symbols on the map (app validates placement) → optionally spend resource jokers → app fills in the scoring box with the points earned → tap "End turn" → next player sheet slides in.

## Visual direction

Warm, tactile "game pad" feel inspired by the physical sheet: parchment/cream background, Catan-red and forest-green accents, chunky tap targets (min 44px), resource-colored iconography (brick/lumber/wool/grain/ore/gold). Mobile-first, fully responsive to tablets; portrait-friendly with the map zoomable/scrollable. I'll generate 3 design-direction prototypes for you to pick from before building.

## Technical details

- TanStack Start + Tailwind v4; island maps as hand-built SVG components with tappable regions.
- Game state in React context + `localStorage` (per guidance for no-account local play): games persist on the device, resumable anytime. No Lovable Cloud, no accounts, works offline after first load.
- Game rules engine as pure typed functions (`src/lib/engine/`) — build validation, scoring, joker/gold logic — unit-tested with Vitest, separated from UI.
- Undo for the current turn; confirm dialog before ending a turn with nothing built (the −2 "X").
- Routes: `/`, `/new`, `/game/$id`, `/game/$id/results`, each with its own `head()` metadata. Home replaces the placeholder at `/`.
