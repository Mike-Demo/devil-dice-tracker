export interface PlayerGameRecord {
  gameId: string;
  island: number;
  points: number;
  longestRoad: number;
  won: boolean;
  finishedAt: number;
}

export interface PlayerProfile {
  name: string;
  totalPoints: number;
  bestLongestRoad: number;
  gamesPlayed: number;
  wins: number;
  history: PlayerGameRecord[];
}

export interface ResultRow extends PlayerGameRecord {
  name: string;
}

/** Aggregate finished-game rows into one profile per roster player. */
export function aggregateProfiles(
  names: string[],
  rows: ResultRow[],
): PlayerProfile[] {
  const profiles = new Map<string, PlayerProfile>();
  for (const name of names) {
    profiles.set(name, {
      name,
      totalPoints: 0,
      bestLongestRoad: 0,
      gamesPlayed: 0,
      wins: 0,
      history: [],
    });
  }

  for (const row of rows) {
    const profile = profiles.get(row.name);
    if (!profile) continue;
    profile.totalPoints += row.points;
    profile.bestLongestRoad = Math.max(profile.bestLongestRoad, row.longestRoad);
    profile.gamesPlayed += 1;
    if (row.won) profile.wins += 1;
    profile.history.push({
      gameId: row.gameId,
      island: row.island,
      points: row.points,
      longestRoad: row.longestRoad,
      won: row.won,
      finishedAt: row.finishedAt,
    });
  }

  for (const profile of profiles.values()) {
    profile.history.sort((a, b) => b.finishedAt - a.finishedAt);
  }

  return [...profiles.values()];
}
