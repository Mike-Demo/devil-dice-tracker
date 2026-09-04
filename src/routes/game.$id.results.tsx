import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { standings, totalScore, victoryPoints } from "@/lib/engine/engine";
import type { Game } from "@/lib/engine/types";
import { loadGame } from "@/lib/storage";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/game/$id/results")({
  head: () => ({
    meta: [
      { title: "Results — Catan Dice Game Score Sheet" },
      {
        name: "description",
        content: "Final standings for your Catan Dice Game.",
      },
      { property: "og:title", content: "Results — Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content: "Final standings for your Catan Dice Game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Results,
});

const RANKS = ["1st", "2nd", "3rd", "4th"];

function Results() {
  const { id } = Route.useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const g = loadGame(id);
    if (g) setGame(g);
    else setNotFound(true);
  }, [id]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5">
        <h1 className="font-display text-2xl font-bold text-ink">
          Game not found
        </h1>
        <Link to="/" className="font-bold text-catan-red underline">
          Back to home
        </Link>
      </main>
    );
  }
  if (!game) return null;

  const table = standings(game);
  const winner = game.winner !== null ? game.sheets[game.winner] : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-catan-red uppercase">
          {game.status === "finished" ? "Game over" : "In progress"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-ink">
          {winner ? `${winner.name} wins!` : "Current standings"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Island {game.island === 1 ? "One · highest score wins" : "Two · race to 10 VP"}
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {table.map(({ index, value }, rank) => {
          const sheet = game.sheets[index];
          const xCount = sheet.scores.filter((s) => s === "X").length;
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-4 rounded-2xl border-2 p-4",
                rank === 0
                  ? "border-gold bg-gold/15"
                  : "border-ink/10 bg-parchment-deep/60",
              )}
            >
              <span className="font-display text-2xl font-black text-ink-soft">
                {MEDALS[rank] ?? `${rank + 1}.`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{sheet.name}</p>
                <p className="text-xs text-ink-soft">
                  {game.island === 1
                    ? `${xCount} ✕ mark${xCount === 1 ? "" : "s"} (−${xCount * 2})`
                    : `${sheet.built.length} builds`}
                </p>
              </div>
              <p className="font-display text-2xl font-black text-ink">
                {game.island === 1 ? totalScore(sheet) : victoryPoints(game, index)}
                <span className="ml-1 text-xs font-semibold text-ink-soft">
                  {game.island === 1 ? "pts" : "VP"}
                </span>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        {game.status === "active" && (
          <Link
            to="/game/$id"
            params={{ id: game.id }}
            className="rounded-2xl bg-forest px-6 py-4 text-center font-display text-lg font-bold text-parchment shadow-lg"
          >
            Resume game
          </Link>
        )}
        <Link
          to="/"
          className="rounded-2xl border-2 border-ink/20 px-6 py-4 text-center font-display text-lg font-bold text-ink"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
