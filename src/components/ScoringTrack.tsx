import { TURNS_PER_GAME, X_PENALTY, totalScore } from "@/lib/engine/engine";
import type { PlayerState } from "@/lib/engine/types";
import { cn } from "@/lib/cn";

export function ScoringTrack({ sheet }: { sheet: PlayerState }) {
  const total = totalScore(sheet);
  return (
    <div className="rounded-xl border-2 border-ink/15 bg-parchment-deep/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-display text-sm font-bold tracking-wide text-ink-soft uppercase">
          Scoring track
        </h3>
        <p className="font-display text-lg font-black text-ink">
          {total} <span className="text-xs font-semibold text-ink-soft">pts</span>
        </p>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: TURNS_PER_GAME }, (_, i) => {
          const entry = sheet.scores[i];
          return (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border text-sm font-bold",
                entry === undefined &&
                  "border-dashed border-ink/25 bg-parchment text-ink/25",
                entry === "X" && "border-catan-red bg-catan-red/10 text-catan-red",
                typeof entry === "number" &&
                  "border-forest bg-forest/15 text-forest-deep",
              )}
            >
              {entry === undefined ? i + 1 : entry === "X" ? "✕" : entry}
            </div>
          );
        })}
        <div className="flex aspect-square items-center justify-center rounded-md border-2 border-ink bg-ink text-sm font-black text-parchment">
          {total}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Each ✕ costs {X_PENALTY} points at the end of the game.
      </p>
    </div>
  );
}
