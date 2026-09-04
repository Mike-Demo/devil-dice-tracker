import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IslandMap } from "@/components/IslandMap";
import { MapLegend } from "@/components/MapLegend";
import { ScoringTrack } from "@/components/ScoringTrack";
import { VPTrack } from "@/components/VPTrack";
import { TURNS_PER_GAME, standings } from "@/lib/engine/engine";
import { RESOURCE_LABEL, SITE_BY_ID, siteLabel } from "@/lib/engine/island";
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
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFlash = (message: string) => {
    setFlash(message);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1800);
  };

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);



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

  const valueOf = (siteId: string): string => {
    const site = SITE_BY_ID.get(siteId);
    if (!site) return "";
    if (site.kind === "knight") return "1 pt";
    if (game.island === 2) return site.kind === "city" ? "2 VP" : "1 VP";
    return `${site.points} pts`;
  };

  const handleRoad = (idx: number) => {
    const undoing = game.draft.roads.includes(idx);
    toggleRoad(idx);
    showFlash(undoing ? `Road ${idx} removed` : `Road ${idx} built — 1 pt`);
  };

  const handleSite = (siteId: string) => {
    const site = SITE_BY_ID.get(siteId);
    if (!site) return;
    const undoing = game.draft.sites.includes(siteId);
    toggleSite(siteId);
    showFlash(
      undoing
        ? `${siteLabel(site)} removed`
        : `${siteLabel(site)} built — ${valueOf(siteId)}`,
    );
  };

  const handleJoker = (siteId: string) => {
    const site = SITE_BY_ID.get(siteId);
    if (!site) return;
    const undoing = game.draft.jokers.includes(siteId);
    toggleJoker(siteId);
    showFlash(
      undoing
        ? "Joker returned"
        : `${RESOURCE_LABEL[site.resource ?? "wild"]} joker spent`,
    );
  };

  const draftItems: Array<{ key: string; label: string; undo: () => void }> = [
    ...game.draft.roads.map((idx) => ({
      key: `r${idx}`,
      label: `Road ${idx} · 1 pt`,
      undo: () => handleRoad(idx),
    })),
    ...game.draft.sites.map((siteId) => {
      const site = SITE_BY_ID.get(siteId);
      return {
        key: `s${siteId}`,
        label: site ? `${siteLabel(site)} · ${valueOf(siteId)}` : siteId,
        undo: () => handleSite(siteId),
      };
    }),
    ...game.draft.jokers.map((siteId) => {
      const site = SITE_BY_ID.get(siteId);
      return {
        key: `j${siteId}`,
        label: `${RESOURCE_LABEL[site?.resource ?? "wild"]} joker used`,
        undo: () => handleJoker(siteId),
      };
    }),
  ];


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
          onToggleRoad={handleRoad}
          onToggleSite={handleSite}
          onToggleJoker={handleJoker}
        />
      </div>

      <MapLegend island={game.island} />

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

      {/* tap feedback chip */}
      {flash && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center px-4"
        >
          <span className="rounded-full bg-ink/90 px-4 py-2 text-sm font-bold text-parchment shadow-lg">
            {flash}
          </span>
        </div>
      )}

      {/* fixed end-turn bar */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-ink/10 bg-parchment/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          {draftItems.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {draftItems.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={item.undo}
                    className="rounded-full border border-forest/40 bg-forest/10 px-3 py-1 text-xs font-bold text-forest-deep"
                    aria-label={`Undo ${item.label}`}
                  >
                    {item.label} <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-soft">
                This turn{draftItems.length > 0 ? " · tap an item to undo" : ""}
              </p>
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
