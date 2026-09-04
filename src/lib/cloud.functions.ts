import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Game } from "./engine/types";
import { aggregateProfiles, type PlayerProfile } from "./profileStats";


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

const stateSchema = z.object({
  code: codeSchema.optional(),
  rosterCode: codeSchema.optional(),
  state: z.record(z.unknown()),
});

const resultsSchema = z.object({
  code: codeSchema,
  results: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        points: z.number().int(),
        longestRoad: z.number().int().min(0),
        won: z.boolean(),
      }),
    )
    .min(1)
    .max(4),
});

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

/** Create or update the cloud copy of a game. Returns its share code. */
export const upsertGame = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => stateSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const game = data.state as unknown as Game;
    const rosterId = await rosterIdForCode(data.rosterCode);

    if (data.code) {
      const { error } = await db
        .from("games")
        .update({
          state: data.state,
          status: game.status,
          island: game.island,
          roster_id: rosterId,
          updated_at: new Date().toISOString(),
        })
        .eq("code", data.code);
      if (error) throw new Error(error.message);
      return { code: data.code };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();
      const { error } = await db.from("games").insert({
        code,
        state: data.state,
        status: game.status,
        island: game.island,
        roster_id: rosterId,
      });
      if (!error) return { code };
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
      .select("id, roster_id, island")
      .eq("code", data.code)
      .maybeSingle();
    if (!game) return { recorded: false };

    let playersByName = new Map<string, string>();
    if (game.roster_id) {
      // Make sure everyone who played exists on the roster.
      await db.from("players").upsert(
        data.results.map((r) => ({ roster_id: game.roster_id, name: r.name })),
        { onConflict: "roster_id,name" },
      );
      const { data: players } = await db
        .from("players")
        .select("id, name")
        .eq("roster_id", game.roster_id);
      playersByName = new Map((players ?? []).map((p) => [p.name, p.id]));
    }


    const rows = data.results.map((r) => ({
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
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const { error } = await db.from("rosters").insert({ code });
    if (!error) return { code };
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not allocate a roster code");
});

/** Add a player to a roster (no-op if the name already exists). */
export const addRosterPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ rosterCode: codeSchema, name: z.string().trim().min(1).max(40) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const rosterId = await rosterIdForCode(data.rosterCode);
    if (!rosterId) throw new Error("Roster not found");
    const { error } = await db
      .from("players")
      .upsert({ roster_id: rosterId, name: data.name }, { onConflict: "roster_id,name" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeRosterPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ rosterCode: codeSchema, name: z.string().trim().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const rosterId = await rosterIdForCode(data.rosterCode);
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

