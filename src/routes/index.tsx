import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listGames, deleteGame } from "@/lib/storage";
import type { Game } from "@/lib/engine/types";
import { WaButton, WaAvatar } from "@/design-system/font-awsome-web-awesome-171158";
import sheepIcon from "@/assets/sheep.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catan Dice Game Score Sheet" },
      {
        name: "description",
        content:
          "A digital score sheet for the Catan Dice Game — track turns, build on the island map, and score without the paper pad.",
      },
      { property: "og:title", content: "Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content:
          "Track turns and scores for the Catan Dice Game on your phone or tablet — no paper pad needed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    setGames(listGames());
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <header className="mb-8 flex flex-col items-center text-center">
        <WaAvatar
          image={sheepIcon}
          label="Sheep mascot"
          className="mb-3 text-5xl"
        />
        <p className="mb-1 text-xs font-bold tracking-[0.3em] text-catan-red uppercase">
          Roll · Play · Settle
        </p>
        <h1 className="font-display text-4xl font-black text-ink">
          Catan Dice Game
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your digital score sheet. Roll the real dice, leave the paper pad in
          the box.
        </p>
      </header>

      <WaButton
        href="/new"
        variant="brand"
        size="large"
        pill
        className="cta-red mb-8 w-full"
      >
        Start a new game
      </WaButton>

      {games.length > 0 && (
        <section aria-label="Saved games">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">
            Saved games
          </h2>
          <ul className="flex flex-col gap-3">
            {games.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-xl border-2 border-ink/10 bg-parchment-deep/60 p-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    router.navigate({
                      to:
                        g.status === "finished"
                          ? "/game/$id/results"
                          : "/game/$id",
                      params: { id: g.id },
                    })
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-bold text-ink">
                    {g.sheets.map((s) => s.name).join(" vs ")}
                  </p>
                  <p className="text-xs text-ink-soft">
                    Island {g.island === 1 ? "One" : "Two"} ·{" "}
                    {g.status === "finished"
                      ? "Finished"
                      : `Round ${g.round}, ${g.sheets[g.currentPlayer].name}'s turn`}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label={`Delete game ${g.sheets.map((s) => s.name).join(" vs ")}`}
                  onClick={() => {
                    deleteGame(g.id);
                    setGames(listGames());
                  }}
                  className="shrink-0 rounded-lg border border-ink/20 px-3 py-2 text-xs font-bold text-ink-soft active:bg-ink/10"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-ink-soft">
        Works offline · everything stays on this device
      </footer>
    </main>
  );
}
