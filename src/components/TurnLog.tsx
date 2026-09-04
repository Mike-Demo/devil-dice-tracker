import { SITE_BY_ID, siteLabel } from "@/lib/engine/island";
import type { TurnLogEntry } from "@/lib/engine/types";

interface Props {
  log: TurnLogEntry[];
}

function describeEntry(entry: TurnLogEntry): string {
  const parts: string[] = [];
  for (const idx of [...entry.roads].sort((a, b) => a - b)) {
    parts.push(`Road ${idx}`);
  }
  for (const id of entry.sites) {
    const site = SITE_BY_ID.get(id);
    if (site) parts.push(siteLabel(site));
  }
  for (const id of entry.jokers) {
    const site = SITE_BY_ID.get(id);
    if (site) parts.push(`${siteLabel(site)} joker`);
  }
  return parts.length > 0 ? parts.join(", ") : "Nothing built";
}

/** Collapsible list of committed turns, newest first. */
export function TurnLog({ log }: Props) {
  if (log.length === 0) return null;
  const entries = [...log].reverse();

  return (
    <details className="mt-4 rounded-2xl border-2 border-ink/10 bg-parchment-deep/40 p-4 shadow-sm">
      <summary className="cursor-pointer text-xs font-extrabold tracking-[0.2em] text-ink-soft uppercase">
        Turn log ({log.length})
      </summary>
      <ol className="mt-3 flex flex-col gap-2">
        {entries.map((entry, i) => (
          <li
            key={log.length - i}
            className="flex items-baseline justify-between gap-3 border-b border-ink/8 pb-2 text-sm last:border-0 last:pb-0"
          >
            <span className="text-ink">
              <span className="font-bold">
                Turn {entry.round} · {entry.player}
              </span>
              <span className="text-ink-soft"> — {describeEntry(entry)}</span>
            </span>
            <span className="shrink-0 font-bold text-catan-red">
              {entry.score === "X" ? "✕" : `${entry.score} pts`}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
