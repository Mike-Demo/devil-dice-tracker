import { describe, expect, it } from "vitest";
import { planTurn, BUILD_COSTS, DIE_FACES } from "./ai";
import {
  canBuildRoad,
  canBuildSite,
  canUseJoker,
  endTurn,
  newGame,
  TURNS_PER_GAME,
} from "./engine";
import { SITE_BY_ID, SITES } from "./island";
import type { Game, Resource, TurnDraft } from "./types";
import { secureInt } from "../diceRandom";

/** Deterministic die source cycling through the given face indices. */
const seq = (indices: number[]): (() => number) => {
  let i = 0;
  return () => {
    const v = indices[i % indices.length];
    i += 1;
    return v ?? 0;
  };
};

const faceIdx = (res: Resource): number => DIE_FACES.indexOf(res);

/** Assert every build in a draft is legal per the engine, applied in order. */
function expectDraftLegal(game: Game, draft: TurnDraft): void {
  const sheet = game.sheets[game.currentPlayer];
  const running: TurnDraft = { roads: [], sites: [], jokers: [] };
  for (const idx of draft.roads) {
    expect(canBuildRoad(sheet, running, idx), `road ${idx} legal`).toBe(true);
    running.roads.push(idx);
  }
  for (const id of draft.sites) {
    const site = SITE_BY_ID.get(id);
    expect(site, `site ${id} exists`).toBeDefined();
    expect(
      canBuildSite(sheet, running, game.island, site!),
      `site ${id} legal`,
    ).toBe(true);
    running.sites.push(id);
  }
  for (const id of draft.jokers) {
    const site = SITE_BY_ID.get(id)!;
    expect(canUseJoker(sheet, running, site), `joker ${id} legal`).toBe(true);
    running.jokers.push(id);
  }
}

describe("secureInt", () => {
  it("stays within range", () => {
    for (let i = 0; i < 200; i++) {
      const v = secureInt(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });
});

describe("planTurn", () => {
  it("builds a road from lumber + brick dice", () => {
    const game = newGame(1, ["Bot"], [true]);
    // First throw gives exactly the road cost; later throws are irrelevant.
    const rand = seq([faceIdx("lumber"), faceIdx("brick"), 0, 0, 0, 0]);
    const plan = planTurn(game, rand);
    expect(plan.dice).toHaveLength(6);
    expect(plan.draft.roads).toContain(1);
    expectDraftLegal(game, plan.draft);
  });

  it("scores an X when nothing is affordable (all ore)", () => {
    const game = newGame(1, ["Bot"], [true]);
    const rand = seq([faceIdx("ore")]);
    const plan = planTurn(game, rand);
    expect(plan.draft.roads).toHaveLength(0);
    expect(plan.draft.sites).toHaveLength(0);
    expectDraftLegal(game, plan.draft);
  });

  it("treats gold as wild", () => {
    const game = newGame(1, ["Bot"], [true]);
    // brick + gold pays the road's lumber.
    const rand = seq([faceIdx("brick"), faceIdx("gold")]);
    const plan = planTurn(game, rand);
    expect(plan.draft.roads).toContain(1);
  });

  it("spends a knight joker when the dice alone cannot pay", () => {
    const game = newGame(1, ["Bot"], [true]);
    const sheet = game.sheets[0];
    // Pretend the brick knight was built in an earlier turn.
    const brickKnight = SITES.find(
      (s) => s.kind === "knight" && s.resource === "brick",
    )!;
    sheet.built.push(brickKnight.id);
    // Lumber but no brick: joker covers the brick for a road.
    const rand = seq([faceIdx("lumber"), faceIdx("ore")]);
    const plan = planTurn(game, rand);
    expect(plan.draft.roads).toContain(1);
    expect(plan.draft.jokers).toContain(brickKnight.id);
    expectDraftLegal(game, plan.draft);
  });

  it("respects Island One settlement order even when it can afford a later one", () => {
    const game = newGame(1, ["Bot"], [true]);
    // Six settlement-cost dice repeated — plenty, but s2 needs road 12 first
    // anyway; assert whatever it builds is engine-legal.
    const rand = seq([
      faceIdx("lumber"),
      faceIdx("brick"),
      faceIdx("wool"),
      faceIdx("grain"),
    ]);
    const plan = planTurn(game, rand);
    expectDraftLegal(game, plan.draft);
    for (const id of plan.draft.sites) {
      expect(BUILD_COSTS[SITE_BY_ID.get(id)!.kind]).toBeDefined();
    }
  });
});

describe("AI full game", () => {
  it("plays a complete 2-AI Island One game to 15 turns each", () => {
    const game = newGame(1, ["Bot A", "Bot B"], [true, true]);
    // Semi-realistic mix of faces.
    const rand = seq([0, 1, 2, 3, 4, 5, 5, 2, 1, 0, 3, 4]);
    let guard = 0;
    while (game.status === "active" && guard < 200) {
      const plan = planTurn(game, rand);
      expectDraftLegal(game, plan.draft);
      game.draft = plan.draft;
      endTurn(game, plan.dice);
      guard += 1;
    }
    expect(game.status).toBe("finished");
    expect(game.sheets.every((s) => s.scores.length === TURNS_PER_GAME)).toBe(
      true,
    );
    // AI turns log their dice.
    expect(game.log?.every((e) => e.dice?.length === 6)).toBe(true);
  });

  it("plays an Island Two game until someone wins or 60 turns pass legally", () => {
    const game = newGame(2, ["Bot A", "Bot B"], [true, true]);
    const rand = seq([5, 0, 1, 2, 3, 4]);
    let guard = 0;
    while (game.status === "active" && guard < 200) {
      const plan = planTurn(game, rand);
      expectDraftLegal(game, plan.draft);
      game.draft = plan.draft;
      endTurn(game, plan.dice);
      guard += 1;
    }
    expect(guard).toBeLessThan(200);
  });
});
