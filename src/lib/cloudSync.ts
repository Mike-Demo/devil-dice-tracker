import {
  loadCloudGame,
  recordResults,
  upsertGame,
} from "./cloud.functions";
import { roadCount, standings, totalScore, victoryPoints } from "./engine/engine";
import type { Game } from "./engine/types";
import { saveGame } from "./storage";

export type SyncStatus = "idle" | "saving" | "saved" | "offline";

/** Push a game to the cloud, allocating a share code on first push. */
export async function pushGame(game: Game): Promise<string | null> {
  const payload = {
    ...(game.code ? { code: game.code } : {}),
    ...(game.rosterCode ? { rosterCode: game.rosterCode } : {}),
    state: game as unknown as Record<string, unknown>,
  };
  const { code } = await upsertGame({ data: payload });
  return code;
}

/** Pull a game by share code and store it locally; returns the local game. */
export async function pullGame(code: string): Promise<Game | null> {
  const result = await loadCloudGame({ data: { code } });
  if (!result) return null;
  const game: Game = { ...result.state, code: result.code };
  saveGame(game);
  return game;
}

/** Write final standings for a finished game. */
export async function pushResults(game: Game): Promise<void> {
  if (!game.code || game.status !== "finished") return;
  const order = standings(game);
  const best = order[0]?.value ?? 0;
  await recordResults({
    data: {
      code: game.code,
      // AI opponents play along but never touch player profile stats.
      results: game.sheets.flatMap((sheet, index) =>
        sheet.isAI
          ? []
          : [
              {
                name: sheet.name,
                points:
                  game.island === 1
                    ? totalScore(sheet)
                    : victoryPoints(game, index),
                longestRoad: roadCount(game, index),
                won:
                  game.winner !== null
                    ? game.winner === index
                    : (order.find((entry) => entry.index === index)?.value ??
                        0) === best,
              },
            ],
      ),
    },
  });
}
