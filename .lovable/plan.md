# Cloud sync + player profiles

Two additions: games auto-save to the cloud and can be reopened on any device with a short code, and a roster of named players accumulates stats across games.

## How it works for you

**Auto-save + game code**
- Every game gets a 6-character code (e.g. `K3M-9QF`) shown at the top of the game sheet, with a "Copy link" button.
- Each change (build, joker, end turn) is saved to the cloud automatically, debounced so it stays fast. A small "Saved" / "Saving…" indicator sits next to the code.
- Opening `catan.quest/g/K3M9QF` on a phone loads that exact game and continues from the current turn. The saved-games page stays as-is, but you no longer need it.
- Offline still works: local storage remains the immediate source of truth and syncs when the connection returns.

**Player roster + profiles**
- Your device holds a roster (Mike, Sam, …) that you pick from when starting a game instead of typing names each time.
- The roster has its own code so you can load the same roster on a second device.
- A new Players page lists each player with: total points, best longest road, games played, wins, and a per-game history (date, island, score, result).
- Stats are written once when a game finishes, from the final standings.

## Screens

- Game sheet: game code + copy link + sync status in the header.
- Home: "Open a game by code" input; link to Players.
- New game: pick players from the roster or add a new one.
- Players page: roster list, tap a player for their history.

## Technical notes

Backend: Lovable Cloud (enabled as part of this work).

Tables (all access through server functions using the service-role client; no anon/authenticated grants, RLS enabled with no public policies):
- `rosters` — `id`, `code` (unique, short), `created_at`.
- `players` — `id`, `roster_id`, `name`, `created_at`.
- `games` — `id`, `code` (unique), `roster_id` (nullable), `island`, `state` (jsonb: the existing `Game` object), `status`, `updated_at`.
- `game_results` — `id`, `game_id`, `player_id`, `name`, `points`, `longest_road`, `won`, `finished_at`.

Server functions in `src/lib/cloud.functions.ts`:
- `upsertGame({ code, state })` — auto-save; creates on first call.
- `loadGame({ code })` — returns the stored `Game`.
- `finishGame({ code, results })` — writes `game_results` rows once, idempotent on `game_id`.
- `createRoster()` / `loadRoster({ code })` / `addPlayer({ rosterCode, name })`.
- `getRosterStats({ code })` — aggregates totals, best longest road, games played, wins, and per-game history.

Codes are server-generated with a crypto RNG (Crockford base32, ambiguous characters excluded) and are the only credential, so all inputs are Zod-validated and lookups are exact-match only; no enumeration endpoints, no listing of games or rosters without a code.

Client:
- `src/lib/useGame.ts` gains a debounced cloud push after each local commit plus a sync-status flag; local storage stays authoritative for rendering.
- New route `src/routes/g.$code.tsx` hydrates a game from the cloud into local storage, then redirects to the existing game sheet.
- New route `src/routes/players.tsx` for the roster and stats, using the existing parchment styling.
- Roster code stored in local storage; no login screens.

Conflict handling: last write wins, compared on `updatedAt`; if the cloud copy is newer than the local copy when opening a code, the cloud copy is used.

Tests: extend `src/lib/engine/engine.test.ts` with a stats-aggregation test (points, wins, best longest road from a set of results).
