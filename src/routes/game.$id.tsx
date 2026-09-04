import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IslandMap } from "@/components/IslandMap";
import { ScoringTrack } from "@/components/ScoringTrack";
import { VPTrack } from "@/components/VPTrack";
import { TURNS_PER_GAME, standings } from "@/lib/engine/engine";
import { useGame } from "@/lib/useGame";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/game/$id")({
  head: () => ({
    meta: [
      { title: "Game Sheet — Catan Dice Game Score Sheet" },
      {
        name: "description",
        content:
          "Interactive Catan Dice Game sheet: build roads, settlements, cities and knights, and track the score.",
      },
      { property: "og:title", content: "Game Sheet — Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content:
          "Interactive Catan Dice Game sheet: build roads, settlements, cities and knights, and track the score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GameScreen,
});

function GameScreen() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { game, notFound, toggleRoad, toggleSite, toggleJoker, endTurn, draftPoints } =
    useGame(id);
  const [confirmingX, setConfirmingX] = useState(false);
  const [handoff, setHandoff] = useState<string | null>(null);

  useEffect(() => {
    if (game?.status === "finished") {
      router.navigate({ to: "/game/$id/results", params: { id: game.id } });
    }
  }, [game?.status, game?.id, router]);

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

  const sheet = game.sheets[game.currentPlayer];
  const nextPlayer = game.sheets[(game.currentPlayer + 1) % game.sheets.length];

  const doEndTurn = () => {
    setConfirmingX(false);
    if (game.sheets.length > 1) {
      setHandoff(nextPlayer.name);
    }
    endTurn();
  };

  const handleEndTurn = () => {
    if (draftPoints === 0) setConfirmingX(true);
    else doEndTurn();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-4 pb-28">
      {/* header */}
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">
            {game.island === 1
              ? `Island One · Round ${game.round}/${TURNS_PER_GAME}`
              : `Island Two · Round ${game.round}`}
          </p>
          <h1 className="truncate font-display text-2xl font-black text-ink">
            {sheet.name}'s turn
          </h1>
        </div>
        <Link
          to="/"
          className="shrink-0 rounded-lg border border-ink/20 px-3 py-2 text-xs font-bold text-ink-soft"
        >
          Save & exit
        </Link>
      </header>

      {/* island map */}
      <div className="rounded-2xl border-2 border-ink/10 bg-parchment-deep/40 p-2 shadow-sm">
        <IslandMap
          game={game}
          onToggleRoad={toggleRoad}
          onToggleSite={toggleSite}
          onToggleJoker={toggleJoker}
        />
      </div>

      {/* tracks */}
      <div className="mt-4">
        {game.island === 1 ? (
          <ScoringTrack sheet={sheet} />
        ) : (
          <VPTrack game={game} />
        )}
      </div>

      {/* standings strip (multiplayer) */}
      {game.sheets.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {standings(game).map(({ index, value }) => (
            <span
              key={index}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold",
                index === game.currentPlayer
                  ? "border-catan-red bg-catan-red/10 text-catan-red"
                  : "border-ink/15 text-ink-soft",
              )}
            >
              {game.sheets[index].name}: {value}
              {game.island === 2 ? " VP" : " pts"}
            </span>
          ))}
        </div>
      )}

      {/* fixed end-turn bar */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-ink/10 bg-parchment/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-soft">This turn</p>
            <p className="font-display text-xl font-black text-ink">
              {draftPoints > 0 ? `+${draftPoints} pts` : "Nothing built"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleEndTurn}
            className="shrink-0 rounded-2xl bg-forest px-8 py-4 font-display text-lg font-bold text-parchment shadow-lg transition-transform active:scale-[0.97]"
          >
            End turn
          </button>
        </div>
      </div>

      {/* X confirm dialog */}
      {confirmingX && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/50 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-parchment p-6 shadow-xl">
            <h2 className="font-display text-xl font-bold text-ink">
              Nothing built?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Ending the turn without building marks an ✕ in the scoring track,
              worth <strong>−2 points</strong>.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmingX(false)}
                className="flex-1 rounded-xl border-2 border-ink/20 py-3 font-bold text-ink"
              >
                Keep building
              </button>
              <button
                type="button"
                onClick={doEndTurn}
                className="flex-1 rounded-xl bg-catan-red py-3 font-bold text-parchment"
              >
                Mark ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* pass-and-play handoff */}
      {handoff && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-forest px-6 text-center">
          <p className="text-sm font-bold tracking-[0.3em] text-parchment/70 uppercase">
            Pass the device
          </p>
          <h2 className="mt-3 font-display text-4xl font-black text-parchment">
            {handoff}, you're up!
          </h2>
          <button
            type="button"
            onClick={() => setHandoff(null)}
            className="mt-10 rounded-2xl bg-parchment px-10 py-4 font-display text-lg font-bold text-forest-deep shadow-lg active:scale-[0.97]"
          >
            Ready — roll the dice
          </button>
        </div>
      )}
    </main>
  );
}
