import { describe, expect, it } from "vitest";
import { aggregateProfiles, type ResultRow } from "./profileStats";

const rows: ResultRow[] = [
  {
    name: "Ana",
    gameId: "g1",
    island: 1,
    points: 40,
    longestRoad: 8,
    won: true,
    finishedAt: 1_000,
  },
  {
    name: "Ana",
    gameId: "g2",
    island: 2,
    points: 10,
    longestRoad: 5,
    won: false,
    finishedAt: 2_000,
  },
  {
    name: "Bo",
    gameId: "g1",
    island: 1,
    points: 32,
    longestRoad: 9,
    won: false,
    finishedAt: 1_000,
  },
  {
    name: "Ghost",
    gameId: "g9",
    island: 1,
    points: 99,
    longestRoad: 12,
    won: true,
    finishedAt: 3_000,
  },
];

describe("aggregateProfiles", () => {
  it("aggregates totals, best road, games and wins", () => {
    const [ana, bo] = aggregateProfiles(["Ana", "Bo"], rows);
    expect(ana.totalPoints).toBe(50);
    expect(ana.bestLongestRoad).toBe(8);
    expect(ana.gamesPlayed).toBe(2);
    expect(ana.wins).toBe(1);
    expect(bo.totalPoints).toBe(32);
    expect(bo.wins).toBe(0);
  });

  it("sorts history newest first and ignores unknown names", () => {
    const profiles = aggregateProfiles(["Ana", "Bo"], rows);
    expect(profiles).toHaveLength(2);
    expect(profiles[0].history.map((h) => h.gameId)).toEqual(["g2", "g1"]);
  });

  it("returns zeroed profiles for players with no results", () => {
    const [cy] = aggregateProfiles(["Cy"], rows);
    expect(cy).toMatchObject({
      name: "Cy",
      totalPoints: 0,
      bestLongestRoad: 0,
      gamesPlayed: 0,
      wins: 0,
    });
  });
});
