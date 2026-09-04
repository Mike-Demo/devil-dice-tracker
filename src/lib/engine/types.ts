export type Island = 1 | 2;

export type Resource =
  | "brick"
  | "lumber"
  | "wool"
  | "grain"
  | "ore"
  | "gold";

export type SiteKind = "settlement" | "city" | "knight";

export interface Site {
  id: string;
  kind: SiteKind;
  points: number;
  /** Island One ordering rank within its kind (1 = must be built first). */
  order: number;
  /** Road node index this site sits adjacent to (settlements/cities only). */
  node: number | null;
  /** Resource joker granted (knights only). */
  resource: Resource | "wild" | null;
  x: number;
  y: number;
}

export type ScoreEntry = number | "X";

export interface TurnDraft {
  roads: number[];
  sites: string[];
  jokers: string[];
}

export interface PlayerState {
  name: string;
  /** 15 road segments; index 0 starts pre-built. */
  roads: boolean[];
  /** Site ids permanently built (committed turns). */
  built: string[];
  /** Knight site ids whose resource joker has been spent. */
  jokersUsed: string[];
  /** One entry per finished turn. */
  scores: ScoreEntry[];
}

/** One committed turn, recorded so past turns can be replayed. */
export interface TurnLogEntry {
  /** 1-based round the turn happened in. */
  round: number;
  player: string;
  roads: number[];
  sites: string[];
  jokers: string[];
  /** Points scored, or "X" when nothing was built. */
  score: ScoreEntry;
}

export interface Game {
  id: string;
  island: Island;
  sheets: PlayerState[];
  currentPlayer: number;
  /** 1-based round number. */
  round: number;
  draft: TurnDraft;
  longestRoadHolder: number | null;
  largestArmyHolder: number | null;
  status: "active" | "finished";
  winner: number | null;
  createdAt: number;
  updatedAt: number;
  /** Committed turns, oldest first. Optional for games saved before the log existed. */
  log?: TurnLogEntry[];
  /** Shareable cloud code, once the game has synced at least once. */
  code?: string;
  /** Roster this game's players came from, if any. */
  rosterCode?: string;
}

