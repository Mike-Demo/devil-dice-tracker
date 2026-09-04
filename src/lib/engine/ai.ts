import { canBuildRoad, canBuildSite, canUseJoker } from "./engine";
import { ROAD_COUNT, SITES } from "./island";
import type {
  Game,
  PlayerState,
  Resource,
  Site,
  SiteKind,
  TurnDraft,
} from "./types";

/** Die faces of the Catan Dice Game; gold is wild. */
export const DIE_FACES: readonly Resource[] = [
  "brick",
  "lumber",
  "wool",
  "grain",
  "ore",
  "gold",
];

export const DICE_COUNT = 6;
/** The game allows three throws per turn (initial roll + two re-rolls). */
export const MAX_THROWS = 3;

/** Returns a die-face index 0–5. Injected so tests can be deterministic. */
export type DieSource = () => number;

export interface AiPlan {
  /** Final dice faces the AI kept. */
  dice: Resource[];
  /** Builds/jokers to commit via the normal engine flow. */
  draft: TurnDraft;
}

type BuildKind = "road" | SiteKind;

/** Official build costs of the dice game. */
export const BUILD_COSTS: Record<BuildKind, readonly Resource[]> = {
  road: ["lumber", "brick"],
  settlement: ["lumber", "brick", "wool", "grain"],
  city: ["grain", "grain", "ore", "ore", "ore"],
  knight: ["ore", "wool", "grain"],
};

interface BuildOption {
  kind: BuildKind;
  /** Road index for roads, site id otherwise. */
  ref: number | string;
  points: number;
  cost: readonly Resource[];
}

function throwDice(kept: Resource[], rand: DieSource): Resource[] {
  const dice = [...kept];
  while (dice.length < DICE_COUNT) {
    dice.push(DIE_FACES[rand() % DIE_FACES.length] ?? "gold");
  }
  return dice;
}

/** Keep dice that fit the target's cost; gold is always kept (wild). */
function keepForTarget(dice: Resource[], cost: readonly Resource[]): Resource[] {
  const needed = [...cost];
  const kept: Resource[] = [];
  for (const die of dice) {
    if (die === "gold") {
      kept.push(die);
      continue;
    }
    const i = needed.indexOf(die);
    if (i >= 0) {
      needed.splice(i, 1);
      kept.push(die);
    }
  }
  return kept;
}

/** Every build the engine would allow right now, best points first. */
function legalBuilds(
  game: Game,
  sheet: PlayerState,
  draft: TurnDraft,
): BuildOption[] {
  const options: BuildOption[] = [];
  for (let idx = 1; idx < ROAD_COUNT; idx++) {
    if (canBuildRoad(sheet, draft, idx)) {
      options.push({ kind: "road", ref: idx, points: 1, cost: BUILD_COSTS.road });
      break; // roads are sequential — only the next one can be legal
    }
  }
  for (const site of SITES) {
    if (canBuildSite(sheet, draft, game.island, site)) {
      options.push({
        kind: site.kind,
        ref: site.id,
        points: site.points,
        cost: BUILD_COSTS[site.kind],
      });
    }
  }
  return options.sort((a, b) => b.points - a.points);
}

/**
 * Try to pay a cost from the dice pool, then gold, then unused knight
 * jokers. On success the pool is consumed and the joker site ids are
 * returned; on failure nothing is consumed and null is returned.
 */
function tryPay(
  sheet: PlayerState,
  draft: TurnDraft,
  pool: Map<Resource, number>,
  cost: readonly Resource[],
): { jokers: string[] } | null {
  const working = new Map(pool);
  const jokers: string[] = [];

  const take = (res: Resource): boolean => {
    const n = working.get(res) ?? 0;
    if (n > 0) {
      working.set(res, n - 1);
      return true;
    }
    return false;
  };

  for (const res of cost) {
    if (take(res) || take("gold")) continue;
    const draftWithJokers: TurnDraft = {
      ...draft,
      jokers: [...draft.jokers, ...jokers],
    };
    const joker = SITES.find(
      (s: Site) =>
        s.kind === "knight" &&
        (s.resource === res || s.resource === "wild") &&
        !jokers.includes(s.id) &&
        canUseJoker(sheet, draftWithJokers, s),
    );
    if (!joker) return null;
    jokers.push(joker.id);
  }

  pool.clear();
  for (const [res, n] of working) pool.set(res, n);
  return { jokers };
}

/**
 * Simulate a full AI turn: roll up to three throws keeping dice toward the
 * most valuable legal build, then spend the dice (plus knight jokers)
 * greedily on legal builds. Every choice is validated through the engine,
 * so the AI can never make an illegal move.
 */
export function planTurn(game: Game, rand: DieSource): AiPlan {
  const sheet = game.sheets[game.currentPlayer];
  const draft: TurnDraft = { roads: [], sites: [], jokers: [] };

  const target = legalBuilds(game, sheet, draft)[0] ?? null;

  let dice: Resource[] = [];
  for (let throwIdx = 0; throwIdx < MAX_THROWS; throwIdx++) {
    const kept =
      throwIdx === 0 || !target
        ? []
        : keepForTarget(dice, target.cost);
    dice = throwDice(kept, rand);
  }

  const pool = new Map<Resource, number>();
  for (const die of dice) pool.set(die, (pool.get(die) ?? 0) + 1);

  for (;;) {
    const options = legalBuilds(game, sheet, draft);
    let built = false;
    for (const option of options) {
      const payment = tryPay(sheet, draft, pool, option.cost);
      if (!payment) continue;
      if (option.kind === "road") draft.roads.push(option.ref as number);
      else draft.sites.push(option.ref as string);
      draft.jokers.push(...payment.jokers);
      built = true;
      break;
    }
    if (!built) break;
  }

  return { dice, draft };
}
