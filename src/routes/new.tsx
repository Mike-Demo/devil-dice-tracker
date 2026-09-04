import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { newGame } from "@/lib/engine/engine";
import type { Island } from "@/lib/engine/types";
import { saveGame } from "@/lib/storage";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Game — Catan Dice Game Score Sheet" },
      {
        name: "description",
        content: "Set up a new Catan Dice Game: pick an island and add players.",
      },
      { property: "og:title", content: "New Game — Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content: "Set up a new Catan Dice Game: pick an island and add players.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewGame,
});

function NewGame() {
  const router = useRouter();
  const [island, setIsland] = useState<Island>(1);
  const [names, setNames] = useState<string[]>(["Player 1"]);

  const addPlayer = () => {
    if (names.length < 4) setNames([...names, `Player ${names.length + 1}`]);
  };
  const removePlayer = (idx: number) => {
    if (names.length > 1) setNames(names.filter((_, i) => i !== idx));
  };
  const rename = (idx: number, value: string) => {
    setNames(names.map((n, i) => (i === idx ? value : n)));
  };

  const start = () => {
    const cleaned = names.map((n, i) => n.trim() || `Player ${i + 1}`);
    const game = newGame(island, cleaned);
    saveGame(game);
    router.navigate({ to: "/game/$id", params: { id: game.id } });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <h1 className="mb-6 font-display text-3xl font-black text-ink">
        New game
      </h1>

      <section aria-label="Choose island" className="mb-8">
        <h2 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
          Island
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIsland(n)}
              aria-pressed={island === n}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-colors",
                island === n
                  ? "border-catan-red bg-catan-red/10"
                  : "border-ink/15 bg-parchment-deep/50",
              )}
            >
              <p className="font-display text-lg font-bold text-ink">
                Island {n === 1 ? "One" : "Two"}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {n === 1
                  ? "15 turns each — highest score wins"
                  : "Race to 10 victory points"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Players" className="mb-8">
        <h2 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
          Players ({names.length}/4)
        </h2>
        <div className="flex flex-col gap-2">
          {names.map((name, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={name}
                onChange={(e) => rename(idx, e.target.value)}
                aria-label={`Player ${idx + 1} name`}
                maxLength={20}
                className="min-w-0 flex-1 rounded-xl border-2 border-ink/15 bg-parchment px-4 py-3 text-base font-semibold text-ink outline-none focus:border-catan-red"
              />
              {names.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  aria-label={`Remove player ${idx + 1}`}
                  className="shrink-0 rounded-xl border-2 border-ink/15 px-4 font-bold text-ink-soft active:bg-ink/10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {names.length < 4 && (
          <button
            type="button"
            onClick={addPlayer}
            className="mt-2 w-full rounded-xl border-2 border-dashed border-ink/25 py-3 text-sm font-bold text-ink-soft active:bg-ink/5"
          >
            + Add player
          </button>
        )}
      </section>

      <button
        type="button"
        onClick={start}
        className="mt-auto rounded-2xl bg-catan-red px-6 py-4 font-display text-xl font-bold text-parchment shadow-lg transition-transform active:scale-[0.98]"
      >
        Start game
      </button>
    </main>
  );
}
