import {
  loadCloudGame,
  recordResults,
  upsertGame,
} from "./cloud.functions";
import type { Game } from "./engine/types";
import { saveGame } from "./storage";

export type SyncStatus = "idle" | "saving" | "saved" | "offline";

export interface PushResult {
  code: string;
  editKey?: string;
}

/**
 * Push a game to the cloud, allocating a share code on first push.
 * Games opened from someone else's code have no edit key and stay local.
 */
export async function pushGame(game: Game): Promise<PushResult | null> {
  if (game.code && !game.editKey) return { code: game.code };
  const { editKey, rosterKey, ...state } = game;
  const payload = {
    ...(game.code ? { code: game.code } : {}),
    ...(editKey ? { editKey } : {}),
    ...(game.rosterCode ? { rosterCode: game.rosterCode } : {}),
    ...(rosterKey ? { rosterKey } : {}),
    state: state as unknown as Record<string, unknown>,
  };
  const result = await upsertGame({ data: payload });
  return { code: result.code, editKey: result.editKey };
}

/** Pull a game by share code and store it locally; returns the local game. */
export async function pullGame(code: string): Promise<Game | null> {
  const result = await loadCloudGame({ data: { code } });
  if (!result) return null;
  const { editKey: _e, rosterKey: _r, ...state } = result.state;
  const game: Game = { ...state, code: result.code };
  saveGame(game);
  return game;
}

/** Ask the server to record final standings from the saved game. */
export async function pushResults(game: Game): Promise<void> {
  if (!game.code || !game.editKey || game.status !== "finished") return;
  await recordResults({ data: { code: game.code } });
}
