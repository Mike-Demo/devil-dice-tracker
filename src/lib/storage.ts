import type { Game } from "./engine/types";

const STORAGE_KEY = "catan-dice-games-v1";

function readAll(): Record<string, Game> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, Game>;
  } catch {
    // corrupted storage — start fresh
  }
  return {};
}

function writeAll(games: Record<string, Game>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function listGames(): Game[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadGame(id: string): Game | null {
  return readAll()[id] ?? null;
}

export function saveGame(game: Game): void {
  const games = readAll();
  games[game.id] = game;
  writeAll(games);
}

export function deleteGame(id: string): void {
  const games = readAll();
  delete games[id];
  writeAll(games);
}
