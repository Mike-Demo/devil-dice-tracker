import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Game } from "./engine/types";
import type { Json } from "@/integrations/supabase/types";
import { aggregateProfiles, type PlayerProfile } from "./profileStats";
import { roadCount, standings, totalScore, victoryPoints } from "./engine/engine";


/** Crockford-style base32 alphabet without ambiguous characters. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "Codes are 6 letters and numbers");

/** Private random secret proving the caller created a game or roster. */
const keySchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Checks a caller's key against a row's stored key. Rows created before
 * keys existed (null) are claimed by the first caller that presents a key.
 */
async function checkKey(
  table: "games" | "rosters",
  id: string,
  stored: string | null,
  key: string | undefined,
): Promise<boolean> {
  if (!key) return false;
  if (stored) return stored === key;
  const db = await admin();
  const { data } = await db
    .from(table)
    .update({ edit_key: key })
    .eq("id", id)
    .is("edit_key", null)
    .select("id");
  return (data ?? []).length > 0;
}

const stateSchema = z.object({
  code: codeSchema.optional(),
  editKey: keySchema.optional(),
  rosterCode: codeSchema.optional(),
  rosterKey: keySchema.optional(),
  state: z.record(z.unknown()),
});

const resultsSchema = z.object({ code: codeSchema });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function rosterIdForCode(code: string | undefined): Promise<string | null> {
  if (!code) return null;
  const db = await admin();
  const { data } = await db.from("rosters").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

/** Roster id only when the caller holds that roster's key. */
async function ownedRosterId(
  code: string | undefined,
  key: string | undefined,
): Promise<string | null> {
  if (!code || !key) return null;
  const db = await admin();
  const { data } = await db
    .from("rosters")
    .select("id, edit_key")
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;
  return (await checkKey("rosters", data.id, data.edit_key, key)) ? data.id : null;
}

/** Create or update the cloud copy of a game. Returns its share code. */
export const upsertGame = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => stateSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    // Never persist private keys inside the shareable state.
    const { editKey: _e, rosterKey: _r, ...cleanState } = data.state;
    data.state = cleanState;
    const game = data.state as unknown as Game;
    const rosterId = await ownedRosterId(data.rosterCode, data.rosterKey);

    if (data.code) {
      const { data: existing } = await db
        .from("games")
        .select("id, edit_key")
        .eq("code", data.code)
        .maybeSingle();
      if (
        !existing ||
        !(await checkKey("games", existing.id, existing.edit_key, data.editKey))
      ) {
        throw new Error("Not allowed to edit this game");
      }
      const { error } = await db
        .from("games")
        .update({
          state: data.state as Json,
          status: game.status,
          island: game.island,
          roster_id: rosterId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error("Could not save game");
      return { code: data.code, editKey: data.editKey };
    }

    const editKey = generateKey();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();
      const { error } = await db.from("games").insert({
        code,
        edit_key: editKey,
        state: data.state as Json,
        status: game.status,
        island: game.island,
        roster_id: rosterId,
      });
      if (!error) return { code, editKey };
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Could not allocate a game code");
  });

/** Load a game by its share code. */
export const loadCloudGame = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: codeSchema }).parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db
      .from("games")
      .select("code, state, updated_at")
      .eq("code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      code: row.code,
      state: row.state as unknown as Game,
      updatedAt: new Date(row.updated_at).getTime(),
    };
  });

/** Record final standings once a game is finished. Idempotent per game. */
export const recordResults = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resultsSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: game } = await db
      .from("games")
      .select("id, roster_id, island, state, status")
      .eq("code", data.code)
      .maybeSingle();
    if (!game || game.status !== "finished") return { recorded: false };

    // Standings come from the saved game itself, never from the caller.
    const saved = game.state as unknown as Game;
    if (!Array.isArray(saved?.sheets) || saved.status !== "finished") {
      return { recorded: false };
    }
    const order = standings(saved);
    const best = order[0]?.value ?? 0;
    const results = saved.sheets.flatMap((sheet, index) =>
      sheet.isAI
        ? []
        : [
            {
              name: String(sheet.name).trim().slice(0, 40) || `Player ${index + 1}`,
              points:
                saved.island === 1 ? totalScore(sheet) : victoryPoints(saved, index),
              longestRoad: roadCount(saved, index),
              won:
                saved.winner !== null
                  ? saved.winner === index
                  : (order.find((e) => e.index === index)?.value ?? 0) === best,
            },
          ],
    );
    if (results.length === 0) return { recorded: false };

    let playersByName = new Map<string, string>();
    const rosterId = game.roster_id;
    if (rosterId) {
      // Make sure everyone who played exists on the roster.
      await db.from("players").upsert(
        results.map((r) => ({ roster_id: rosterId, name: r.name })),
        { onConflict: "roster_id,name" },
      );
      const { data: players } = await db
        .from("players")
        .select("id, name")
        .eq("roster_id", rosterId);
      playersByName = new Map((players ?? []).map((p) => [p.name, p.id]));
    }


    const rows = results.map((r) => ({
      game_id: game.id,
      player_id: playersByName.get(r.name) ?? null,
      name: r.name,
      points: r.points,
      longest_road: r.longestRoad,
      won: r.won,
      island: game.island,
    }));

    const { error } = await db
      .from("game_results")
      .upsert(rows, { onConflict: "game_id,name" });
    if (error) throw new Error(error.message);
    return { recorded: true };
  });

/** Create a new empty roster and return its code. */
export const createRoster = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  const editKey = generateKey();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const { error } = await db.from("rosters").insert({ code, edit_key: editKey });
    if (!error) return { code, editKey };
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not allocate a roster code");
});

/** Add a player to a roster (no-op if the name already exists). */
export const addRosterPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        rosterCode: codeSchema,
        rosterKey: keySchema,
        name: z.string().trim().min(1).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const rosterId = await ownedRosterId(data.rosterCode, data.rosterKey);
    if (!rosterId) throw new Error("Not allowed to edit this roster");
    const { error } = await db
      .from("players")
      .upsert({ roster_id: rosterId, name: data.name }, { onConflict: "roster_id,name" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeRosterPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        rosterCode: codeSchema,
        rosterKey: keySchema,
        name: z.string().trim().min(1).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const rosterId = await ownedRosterId(data.rosterCode, data.rosterKey);
    if (!rosterId) return { ok: false };
    await db.from("players").delete().eq("roster_id", rosterId).eq("name", data.name);
    return { ok: true };
  });

export type { PlayerGameRecord, PlayerProfile } from "./profileStats";


/** Roster players plus their aggregated stats across all finished games. */
export const getRosterStats = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: codeSchema }).parse(input))
  .handler(async ({ data }): Promise<PlayerProfile[] | null> => {
    const db = await admin();
    const rosterId = await rosterIdForCode(data.code);
    if (!rosterId) return null;

    const { data: players } = await db
      .from("players")
      .select("name")
      .eq("roster_id", rosterId)
      .order("name");

    const { data: gameRows } = await db
      .from("games")
      .select("id")
      .eq("roster_id", rosterId);
    const gameIds = (gameRows ?? []).map((g) => g.id);

    const { data: results } = gameIds.length
      ? await db
          .from("game_results")
          .select("game_id, name, points, longest_road, won, island, finished_at")
          .in("game_id", gameIds)
          .order("finished_at", { ascending: false })
      : { data: [] as never[] };

    return aggregateProfiles(
      (players ?? []).map((p) => p.name),
      (results ?? []).map((row) => ({
        name: row.name,
        gameId: row.game_id,
        island: row.island,
        points: row.points,
        longestRoad: row.longest_road,
        won: row.won,
        finishedAt: new Date(row.finished_at).getTime(),
      })),
    );
  });

