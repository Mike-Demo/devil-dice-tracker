import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  addRosterPlayer,
  createRoster,
  getRosterStats,
  removeRosterPlayer,
} from "@/lib/cloud.functions";
import type { PlayerProfile } from "@/lib/profileStats";
import { getRosterCode, normalizeCode, setRosterCode } from "@/lib/roster";
import { cn } from "@/lib/cn";
import { WaButton, WaInput } from "@/design-system/font-awsome-web-awesome-171158";

export const Route = createFileRoute("/players")({
  head: () => ({
    meta: [
      { title: "Players — Catan Dice Game Score Sheet" },
      {
        name: "description",
        content:
          "Track every player's total points, best longest road, games played, wins, and game history across your Catan Dice Games.",
      },
      { property: "og:title", content: "Players — Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content:
          "Career stats for your Catan Dice Game group: points, longest road, wins and history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Players,
});

function Players() {
  const [code, setCode] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (rosterCode: string) => {
    const stats = await getRosterStats({ data: { code: rosterCode } });
    setProfiles(stats ?? []);
  }, []);

  useEffect(() => {
    const existing = getRosterCode();
    if (!existing) return;
    setCode(existing);
    void refresh(existing).catch(() => setError("Couldn't load stats."));
  }, [refresh]);

  const start = async () => {
    setBusy(true);
    try {
      const result = await createRoster({ data: undefined });
      setRosterCode(result.code);
      setCode(result.code);
      setProfiles([]);
    } catch {
      setError("Couldn't create a roster.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const clean = normalizeCode(joinCode);
    if (clean.length !== 6) {
      setError("Roster codes are 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const stats = await getRosterStats({ data: { code: clean } });
      if (!stats) {
        setError("No roster found for that code.");
        return;
      }
      setRosterCode(clean);
      setCode(clean);
      setProfiles(stats);
      setError(null);
    } catch {
      setError("Couldn't load that roster.");
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const name = newName.trim();
    if (!code || !name) return;
    setBusy(true);
    try {
      await addRosterPlayer({ data: { rosterCode: code, name } });
      setNewName("");
      await refresh(code);
    } catch {
      setError("Couldn't add that player.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (name: string) => {
    if (!code) return;
    await removeRosterPlayer({ data: { rosterCode: code, name } });
    await refresh(code);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <header className="mb-6">
        <Link to="/" className="text-sm font-bold text-catan-red underline">
          ← Home
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black text-ink">Players</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Career totals across every finished game.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-xl border-2 border-catan-red/40 bg-catan-red/10 p-3 text-sm text-ink">
          {error}
        </p>
      )}

      {!code ? (
        <section className="flex flex-col gap-4">
          <WaButton variant="brand" size="large" pill disabled={busy} onClick={start}>
            Create a roster
          </WaButton>
          <div className="rounded-xl border-2 border-ink/10 bg-parchment-deep/60 p-4">
            <h2 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
              Or load an existing roster
            </h2>
            <div className="flex gap-2">
              <WaInput
                value={joinCode}
                onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setJoinCode(e.target.value)
                }
                placeholder="ABC123"
                aria-label="Roster code"
                maxlength={7}
                className="min-w-0 flex-1"
              />
              <WaButton variant="neutral" appearance="outlined" onClick={join}>
                Load
              </WaButton>
            </div>
          </div>
        </section>
      ) : (
        <>
          <p className="mb-5 rounded-xl border-2 border-ink/10 bg-parchment-deep/60 p-3 text-sm text-ink-soft">
            Roster code{" "}
            <strong className="font-display text-base tracking-widest text-ink">
              {code}
            </strong>{" "}
            — enter it on another device to see the same players.
          </p>

          <section aria-label="Add player" className="mb-6 flex gap-2">
            <WaInput
              value={newName}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewName(e.target.value)
              }
              placeholder="Add a player"
              aria-label="New player name"
              maxlength={20}
              className="min-w-0 flex-1"
            />
            <WaButton variant="brand" disabled={busy} onClick={add}>
              Add
            </WaButton>
          </section>

          {profiles.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No players yet. Add everyone who plays, then pick them when you start
              a game.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {profiles.map((p) => (
                <li
                  key={p.name}
                  className="rounded-2xl border-2 border-ink/10 bg-parchment-deep/60 p-4"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(open === p.name ? null : p.name)}
                    className="flex h-auto min-h-0 w-full flex-col items-start text-left"
                  >
                    <span className="font-display text-lg font-bold text-ink">
                      {p.name}
                    </span>
                    <span className="mt-1 text-xs text-ink-soft">
                      {p.totalPoints} total pts · longest road {p.bestLongestRoad} ·{" "}
                      {p.gamesPlayed} game{p.gamesPlayed === 1 ? "" : "s"} · {p.wins}{" "}
                      win{p.wins === 1 ? "" : "s"}
                    </span>
                  </button>

                  {open === p.name && (
                    <div className="mt-3 border-t-2 border-ink/10 pt-3">
                      {p.history.length === 0 ? (
                        <p className="text-xs text-ink-soft">No finished games yet.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {p.history.map((h) => (
                            <li
                              key={h.gameId}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-2 py-1 text-xs",
                                h.won ? "bg-gold/20 text-ink" : "text-ink-soft",
                              )}
                            >
                              <span>
                                {new Date(h.finishedAt).toLocaleDateString()} · Island{" "}
                                {h.island === 1 ? "One" : "Two"}
                              </span>
                              <span className="font-bold">
                                {h.points} {h.won ? "· win" : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <WaButton
                        size="small"
                        variant="neutral"
                        appearance="outlined"
                        className="mt-3"
                        onClick={() => void remove(p.name)}
                      >
                        Remove from roster
                      </WaButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
