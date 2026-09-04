import { describe, expect, it } from "vitest";
import {
  TURNS_PER_GAME,
  canBuildRoad,
  canBuildSite,
  canUseJoker,
  draftPoints,
  endTurn,
  newGame,
  newPlayer,
  recomputeSpecialVictoryPoints,
  totalScore,
  victoryPoints,
} from "./engine";
import { SITE_BY_ID } from "./island";
import { emptyDraft } from "./engine";

describe("roads", () => {
  it("start road is pre-built and roads must be sequential", () => {
    const sheet = newPlayer("A");
    const draft = emptyDraft();
    expect(sheet.roads[0]).toBe(true);
    expect(canBuildRoad(sheet, draft, 0)).toBe(false);
    expect(canBuildRoad(sheet, draft, 2)).toBe(false);
    expect(canBuildRoad(sheet, draft, 1)).toBe(true);
  });

  it("drafted roads unlock the next road", () => {
    const sheet = newPlayer("A");
    const draft = { ...emptyDraft(), roads: [1] };
    expect(canBuildRoad(sheet, draft, 2)).toBe(true);
    expect(canBuildRoad(sheet, draft, 1)).toBe(false);
  });
});

describe("sites", () => {
  it("Island One enforces ascending settlement order", () => {
    const sheet = newPlayer("A");
    sheet.roads[11] = true; // adjacent to s2 (node 12)
    const s1 = SITE_BY_ID.get("s1")!;
    const s2 = SITE_BY_ID.get("s2")!;
    const draft = emptyDraft();
    expect(canBuildSite(sheet, draft, 1, s1)).toBe(true);
    expect(canBuildSite(sheet, draft, 1, s2)).toBe(false);
    expect(canBuildSite(sheet, draft, 2, s2)).toBe(true); // Island Two: any order
  });

  it("requires an adjacent road", () => {
    const sheet = newPlayer("A");
    const s2 = SITE_BY_ID.get("s2")!;
    expect(canBuildSite(sheet, emptyDraft(), 2, s2)).toBe(false);
    sheet.roads[11] = true; // node 12's preceding road
    expect(canBuildSite(sheet, emptyDraft(), 2, s2)).toBe(true);
  });

  it("matches the printed sheet's values and knight tiles", () => {
    const settlements = ["s1", "s2", "s3", "s4", "s5", "s6"].map(
      (id) => SITE_BY_ID.get(id)!,
    );
    expect(settlements.map((s) => s.points)).toEqual([3, 5, 7, 7, 9, 11]);
    const cities = ["c1", "c2", "c3", "c4"].map((id) => SITE_BY_ID.get(id)!);
    expect(cities.map((c) => c.points)).toEqual([7, 12, 20, 30]);
    const knights = ["k1", "k2", "k3", "k4", "k5", "k6"].map(
      (id) => SITE_BY_ID.get(id)!,
    );
    expect(knights.map((k) => k.resource)).toEqual([
      "ore",
      "grain",
      "wool",
      "lumber",
      "brick",
      "wild",
    ]);
  });

  it("jokers require the knight to be built and unspent", () => {
    const sheet = newPlayer("A");
    const k1 = SITE_BY_ID.get("k1")!;
    expect(canUseJoker(sheet, emptyDraft(), k1)).toBe(false);
    sheet.built.push("k1");
    expect(canUseJoker(sheet, emptyDraft(), k1)).toBe(true);
    sheet.jokersUsed.push("k1");
    expect(canUseJoker(sheet, emptyDraft(), k1)).toBe(false);
  });
});

describe("scoring", () => {
  it("draft points sum roads and site values", () => {
    const draft = { roads: [1, 2], sites: ["s1", "k1"], jokers: [] };
    expect(draftPoints(draft)).toBe(2 + 3 + 1);
  });

  it("total subtracts 2 per X", () => {
    const sheet = newPlayer("A");
    sheet.scores = [3, "X", 7, "X"];
    expect(totalScore(sheet)).toBe(3 - 2 + 7 - 2);
  });
});

describe("game flow", () => {
  it("commits draft, rotates players, and finishes after 15 rounds on Island One", () => {
    const game = newGame(1, ["A", "B"]);
    game.draft = { roads: [1], sites: [], jokers: [] };
    endTurn(game);
    expect(game.sheets[0].scores).toEqual([1]);
    expect(game.sheets[0].roads[1]).toBe(true);
    expect(game.currentPlayer).toBe(1);
    expect(game.round).toBe(1);
    endTurn(game);
    expect(game.currentPlayer).toBe(0);
    expect(game.round).toBe(2);
    expect(game.sheets[1].scores).toEqual(["X"]);

    for (let i = 0; i < (TURNS_PER_GAME - 1) * 2; i++) endTurn(game);
    expect(game.status).toBe("finished");
    expect(game.winner).toBe(0); // A has 1 point, B has all X
  });

  it("records every committed turn in the log", () => {
    const game = newGame(1, ["A", "B"]);
    game.draft = { roads: [1, 2], sites: ["s1", "k1"], jokers: ["k1"] };
    endTurn(game);
    expect(game.log).toHaveLength(1);
    expect(game.log![0]).toEqual({
      round: 1,
      player: "A",
      roads: [1, 2],
      sites: ["s1", "k1"],
      jokers: ["k1"],
      score: 2 + 3 + 1,
    });
    endTurn(game); // B builds nothing
    expect(game.log).toHaveLength(2);
    expect(game.log![1].player).toBe("B");
    expect(game.log![1].score).toBe("X");
    expect(game.log![1].roads).toEqual([]);
  });

  it("Island Two finishes at 10 victory points", () => {
    const game = newGame(2, ["A"]);
    game.sheets[0].built = ["s1", "s2", "s3", "s4", "c1", "c2", "c3"]; // 4 + 6 = 10 VP
    game.draft = emptyDraft();
    endTurn(game);
    expect(game.status).toBe("finished");
    expect(game.winner).toBe(0);
  });
});

describe("special victory points (Island Two)", () => {
  it("awards largest army at 3 knights and transfers when beaten", () => {
    const game = newGame(2, ["A", "B"]);
    game.sheets[0].built = ["k1", "k2", "k3"];
    recomputeSpecialVictoryPoints(game);
    expect(game.largestArmyHolder).toBe(0);
    expect(victoryPoints(game, 0)).toBe(2);
    game.sheets[1].built = ["k1", "k2", "k3", "k4"];
    recomputeSpecialVictoryPoints(game);
    expect(game.largestArmyHolder).toBe(1);
  });

  it("longest road requires the gray road site", () => {
    const game = newGame(2, ["A"]);
    game.sheets[0].roads.fill(true);
    game.sheets[0].roads[7] = false; // gray site not built
    recomputeSpecialVictoryPoints(game);
    expect(game.longestRoadHolder).toBe(null);
    game.sheets[0].roads[7] = true;
    recomputeSpecialVictoryPoints(game);
    expect(game.longestRoadHolder).toBe(0);
  });
});
