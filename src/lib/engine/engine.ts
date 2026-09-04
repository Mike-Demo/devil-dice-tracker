import { LONGEST_ROAD_INDEX, ROAD_COUNT, SITE_BY_ID, SITES } from "./island";
import type {
  Game,
  Island,
  PlayerState,
  ScoreEntry,
  Site,
  TurnDraft,
} from "./types";

export const TURNS_PER_GAME = 15;
export const X_PENALTY = 2;
export const VICTORY_POINTS_TO_WIN = 10;

export const emptyDraft = (): TurnDraft => ({ roads: [], sites: [], jokers: [] });

export function newPlayer(name: string): PlayerState {
  const roads = new Array<boolean>(ROAD_COUNT).fill(false);
  roads[0] = true; // purple starting road is already built
  return { name, roads, built: [], jokersUsed: [], scores: [] };
}

export function newGame(island: Island, names: string[]): Game {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    island,
    sheets: names.map(newPlayer),
    currentPlayer: 0,
    round: 1,
    draft: emptyDraft(),
    longestRoadHolder: null,
    largestArmyHolder: null,
    status: "active",
    winner: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Roads built so far this sheet, including the in-progress draft. */
export function effectiveRoads(sheet: PlayerState, draft: TurnDraft): boolean[] {
  const roads = [...sheet.roads];
  for (const idx of draft.roads) roads[idx] = true;
  return roads;
}

function effectiveBuilt(sheet: PlayerState, draft: TurnDraft): Set<string> {
  return new Set([...sheet.built, ...draft.sites]);
}

export function canBuildRoad(
  sheet: PlayerState,
  draft: TurnDraft,
  idx: number,
): boolean {
  if (idx < 0 || idx >= ROAD_COUNT) return false;
  if (effectiveRoads(sheet, draft)[idx]) return false;
  if (idx === 0) return false; // starting road is pre-built
  return effectiveRoads(sheet, draft)[idx - 1];
}

function siteAdjacentToRoad(roads: boolean[], site: Site): boolean {
  if (site.node === null) return true; // knights have no adjacency requirement
  const before = site.node - 1;
  const after = site.node;
  return Boolean(roads[before] ?? false) || Boolean(roads[after] ?? false);
}

export function canBuildSite(
  sheet: PlayerState,
  draft: TurnDraft,
  island: Island,
  site: Site,
): boolean {
  if (effectiveBuilt(sheet, draft).has(site.id)) return false;
  if (!siteAdjacentToRoad(effectiveRoads(sheet, draft), site)) return false;
  if (island === 1) {
    // Same-kind sites must be built in ascending point order.
    const built = effectiveBuilt(sheet, draft);
    for (const other of SITES) {
      if (other.kind === site.kind && other.order < site.order && !built.has(other.id)) {
        return false;
      }
    }
  }
  return true;
}

export function canUseJoker(
  sheet: PlayerState,
  draft: TurnDraft,
  site: Site,
): boolean {
  if (site.kind !== "knight") return false;
  if (!effectiveBuilt(sheet, draft).has(site.id)) return false;
  if (sheet.jokersUsed.includes(site.id)) return false;
  if (draft.jokers.includes(site.id)) return false;
  return true;
}

/** Points earned by the sites built in the current draft. */
export function draftPoints(draft: TurnDraft): number {
  let points = draft.roads.length; // every road is worth 1
  for (const id of draft.sites) {
    const site = SITE_BY_ID.get(id);
    if (site) points += site.points;
  }
  return points;
}

export function totalScore(sheet: PlayerState): number {
  return sheet.scores.reduce(
    (sum: number, entry: ScoreEntry) =>
      sum + (entry === "X" ? -X_PENALTY : entry),
    0,
  );
}

/** Victory points for an Island Two sheet. */
export function victoryPoints(
  game: Game,
  playerIndex: number,
  draft: TurnDraft | null = null,
): number {
  const sheet = game.sheets[playerIndex];
  const built = draft
    ? new Set([...sheet.built, ...draft.sites])
    : new Set(sheet.built);
  let vp = 0;
  for (const site of SITES) {
    if (!built.has(site.id)) continue;
    if (site.kind === "settlement") vp += 1;
    if (site.kind === "city") vp += 2;
  }
  if (game.longestRoadHolder === playerIndex) vp += 2;
  if (game.largestArmyHolder === playerIndex) vp += 2;
  return vp;
}

function knightCount(game: Game, playerIndex: number): number {
  const built = new Set(game.sheets[playerIndex].built);
  return SITES.filter((s) => s.kind === "knight" && built.has(s.id)).length;
}

function roadCount(game: Game, playerIndex: number): number {
  return game.sheets[playerIndex].roads.filter(Boolean).length;
}

/**
 * Recompute Longest Road / Largest Army holders (Island Two).
 * Ties keep the current holder; holders keep the card until strictly beaten.
 */
export function recomputeSpecialVictoryPoints(game: Game): void {
  if (game.island !== 2) return;

  // Longest Road: requires reaching the gray road site, then most roads wins.
  const eligible = game.sheets
    .map((s, i) => ({ i, roads: s.roads.filter(Boolean).length }))
    .filter((e) => game.sheets[e.i].roads[LONGEST_ROAD_INDEX]);
  if (eligible.length > 0) {
    const best = Math.max(...eligible.map((e) => e.roads));
    const leaders = eligible.filter((e) => e.roads === best).map((e) => e.i);
    game.longestRoadHolder = leaders.includes(game.longestRoadHolder ?? -1)
      ? game.longestRoadHolder
      : leaders[0];
  } else {
    game.longestRoadHolder = null;
  }

  // Largest Army: 3+ knights, most knights wins, ties keep the holder.
  const armies = game.sheets.map((_, i) => knightCount(game, i));
  const max = Math.max(...armies);
  if (max >= 3) {
    const leaders = armies
      .map((n, i) => ({ n, i }))
      .filter((e) => e.n === max)
      .map((e) => e.i);
    game.largestArmyHolder = leaders.includes(game.largestArmyHolder ?? -1)
      ? game.largestArmyHolder
      : leaders[0];
  } else {
    game.largestArmyHolder = null;
  }
}

/** Commit the current draft, advance play, and update game status. */
export function endTurn(game: Game): void {
  const sheet = game.sheets[game.currentPlayer];
  const points = draftPoints(game.draft);

  for (const idx of game.draft.roads) sheet.roads[idx] = true;
  sheet.built.push(...game.draft.sites);
  sheet.jokersUsed.push(...game.draft.jokers);
  sheet.scores.push(points > 0 ? points : "X");

  game.log ??= [];
  game.log.push({
    round: game.round,
    player: sheet.name,
    roads: [...game.draft.roads],
    sites: [...game.draft.sites],
    jokers: [...game.draft.jokers],
    score: points > 0 ? points : "X",
  });

  game.draft = emptyDraft();
  recomputeSpecialVictoryPoints(game);

  if (game.island === 2 && victoryPoints(game, game.currentPlayer) >= VICTORY_POINTS_TO_WIN) {
    game.status = "finished";
    game.winner = game.currentPlayer;
    game.updatedAt = Date.now();
    return;
  }

  game.currentPlayer = (game.currentPlayer + 1) % game.sheets.length;
  if (game.currentPlayer === 0) game.round += 1;

  if (
    game.island === 1 &&
    game.sheets.every((s) => s.scores.length >= TURNS_PER_GAME)
  ) {
    game.status = "finished";
    const totals = game.sheets.map(totalScore);
    game.winner = totals.indexOf(Math.max(...totals));
  }
  game.updatedAt = Date.now();
}

/** Standings sorted best-first for the results screen. */
export function standings(game: Game): Array<{ index: number; value: number }> {
  const values = game.sheets.map((_, i) =>
    game.island === 1 ? totalScore(game.sheets[i]) : victoryPoints(game, i),
  );
  return values
    .map((value, index) => ({ index, value }))
    .sort((a, b) => b.value - a.value);
}

export { roadCount };
