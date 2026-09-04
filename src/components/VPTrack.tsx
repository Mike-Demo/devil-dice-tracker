import { VICTORY_POINTS_TO_WIN, victoryPoints } from "@/lib/engine/engine";
import type { Game } from "@/lib/engine/types";
import { cn } from "@/lib/cn";

export function VPTrack({ game }: { game: Game }) {
  const idx = game.currentPlayer;
  const sheet = game.sheets[idx];
  const vp = victoryPoints(game, idx);

  // Basic VP from buildings (excludes the two special cards).
  const special =
    (game.longestRoadHolder === idx ? 2 : 0) +
    (game.largestArmyHolder === idx ? 2 : 0);
  const basicVp = vp - special;

  return (
    <div className="rounded-xl border-2 border-ink/15 bg-parchment-deep/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-display text-sm font-bold tracking-wide text-ink-soft uppercase">
          Victory points — first to {VICTORY_POINTS_TO_WIN}
        </h3>
        <p className="font-display text-lg font-black text-ink">
          {vp} <span className="text-xs font-semibold text-ink-soft">VP</span>
        </p>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: VICTORY_POINTS_TO_WIN }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border text-xs font-bold",
              i < basicVp
                ? "border-forest bg-forest/20 text-forest-deep"
                : i < vp
                  ? "border-gold bg-gold/25 text-ink"
                  : "border-dashed border-ink/25 bg-parchment text-ink/30",
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5",
            game.longestRoadHolder === idx
              ? "border-forest bg-forest/15 text-forest-deep"
              : "border-ink/20 text-ink/40",
          )}
        >
          Longest Road {game.longestRoadHolder === idx ? "✓ +2" : "—"}
        </span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5",
            game.largestArmyHolder === idx
              ? "border-forest bg-forest/15 text-forest-deep"
              : "border-ink/20 text-ink/40",
          )}
        >
          Largest Army {game.largestArmyHolder === idx ? "✓ +2" : "—"}
        </span>
        <span className="ml-auto text-ink-soft">{sheet.name}</span>
      </div>
    </div>
  );
}
