import {
  LONGEST_ROAD_INDEX,
  NODES,
  RESOURCE_COLORS,
  ROAD_COUNT,
  SITES,
  SITE_BY_ID,
} from "@/lib/engine/island";
import {
  canBuildRoad,
  canBuildSite,
  canUseJoker,
  effectiveRoads,
} from "@/lib/engine/engine";
import type { Game, PlayerState, TurnDraft } from "@/lib/engine/types";
import { cn } from "@/lib/cn";

interface Props {
  game: Game;
  onToggleRoad: (idx: number) => void;
  onToggleSite: (siteId: string) => void;
  onToggleJoker: (siteId: string) => void;
}

const RESOURCE_LABEL: Record<string, string> = {
  brick: "Brick",
  lumber: "Lumber",
  wool: "Wool",
  grain: "Grain",
  ore: "Ore",
  gold: "Gold",
  wild: "Any resource",
};

export function IslandMap({ game, onToggleRoad, onToggleSite, onToggleJoker }: Props) {
  const sheet: PlayerState = game.sheets[game.currentPlayer];
  const draft: TurnDraft = game.draft;
  const roads = effectiveRoads(sheet, draft);
  const built = new Set([...sheet.built, ...draft.sites]);
  const jokersSpent = new Set([...sheet.jokersUsed, ...draft.jokers]);

  return (
    <svg
      viewBox="0 0 340 480"
      className="h-auto w-full select-none"
      role="img"
      aria-label="Island game map"
    >
      <defs>
        <pattern id="gray-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#d8cdb2" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#a89a7c" strokeWidth="2" />
        </pattern>
      </defs>

      {/* island backdrop */}
      <rect x="4" y="4" width="332" height="472" rx="18" fill="#eadfc6" stroke="#cbbd9c" strokeWidth="2" />

      {/* roads */}
      {Array.from({ length: ROAD_COUNT }, (_, i) => {
        const [x1, y1] = NODES[i];
        const [x2, y2] = NODES[i + 1];
        const isBuilt = roads[i];
        const isDraft = draft.roads.includes(i);
        const available = canBuildRoad(sheet, draft, i);
        const isGraySite = game.island === 2 && i === LONGEST_ROAD_INDEX;
        const isStart = i === 0;
        return (
          <g key={`r${i}`}>
            {(available || isDraft) && (
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="28" />
            )}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeLinecap="round"
              strokeWidth={isBuilt ? 10 : 8}
              stroke={
                isBuilt
                  ? isStart
                    ? "#7c4d9e"
                    : "#7a5230"
                  : isGraySite
                    ? "url(#gray-hatch)"
                    : "#f7f0df"
              }
              strokeDasharray={isBuilt ? undefined : "4 5"}
              className={cn(
                "transition-colors",
                available && "cursor-pointer hover:stroke-catan-red/60",
                isDraft && "stroke-forest",
              )}
              onClick={() => onToggleRoad(i)}
            >
              <title>
                {isStart
                  ? "Starting road (pre-built)"
                  : isBuilt
                    ? `Road ${i} — built`
                    : available
                      ? `Build road ${i}`
                      : `Road ${i} — build earlier roads first`}
              </title>
            </line>
            {/* invisible fat tap target */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth="24"
              onClick={() => onToggleRoad(i)}
              className={available || isDraft ? "cursor-pointer" : undefined}
            />
          </g>
        );
      })}

      {/* nodes */}
      {NODES.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={4} fill="#cbbd9c" />
      ))}

      {/* build sites */}
      {SITES.map((site) => {
        const isBuilt = built.has(site.id);
        const isDraft = draft.sites.includes(site.id);
        const available =
          !isBuilt && canBuildSite(sheet, draft, game.island, site);
        const jokerAvailable =
          site.kind === "knight" && canUseJoker(sheet, draft, site);
        const spent = jokersSpent.has(site.id);

        const ringClass = cn(
          "transition-all",
          (available || isDraft) && "cursor-pointer",
        );

        return (
          <g
            key={site.id}
            className={ringClass}
            onClick={() => {
              if (site.kind === "knight" && isBuilt && jokerAvailable) {
                onToggleJoker(site.id);
              } else if (site.kind === "knight" && isBuilt && draft.jokers.includes(site.id)) {
                onToggleJoker(site.id);
              } else if (available || isDraft) {
                onToggleSite(site.id);
              }
            }}
          >
            {/* tap target */}
            <circle cx={site.x} cy={site.y} r={24} fill="transparent" />

            {site.kind === "settlement" && (
              <path
                d={`M ${site.x - 13} ${site.y + 9} L ${site.x - 13} ${site.y - 2} L ${site.x} ${site.y - 13} L ${site.x + 13} ${site.y - 2} L ${site.x + 13} ${site.y + 9} Z`}
                fill={isBuilt ? (isDraft ? "#4a6b3a" : "#2f5d34") : "#f7f0df"}
                stroke={available ? "#b3402a" : "#a89a7c"}
                strokeWidth={available ? 2.5 : 1.5}
                strokeDasharray={isBuilt ? undefined : "4 3"}
              />
            )}
            {site.kind === "city" && (
              <path
                d={`M ${site.x - 15} ${site.y + 10} L ${site.x - 15} ${site.y - 4} L ${site.x - 8} ${site.y - 4} L ${site.x - 8} ${site.y - 12} L ${site.x} ${site.y - 12} L ${site.x} ${site.y - 4} L ${site.x + 8} ${site.y - 4} L ${site.x + 8} ${site.y - 12} L ${site.x + 15} ${site.y - 12} L ${site.x + 15} ${site.y + 10} Z`}
                fill={isBuilt ? (isDraft ? "#4a6b3a" : "#2f5d34") : "#f7f0df"}
                stroke={available ? "#b3402a" : "#a89a7c"}
                strokeWidth={available ? 2.5 : 1.5}
                strokeDasharray={isBuilt ? undefined : "4 3"}
              />
            )}
            {site.kind === "knight" && (
              <>
                <path
                  d={`M ${site.x} ${site.y - 14} L ${site.x + 12} ${site.y - 9} L ${site.x + 12} ${site.y + 2} Q ${site.x + 12} ${site.y + 11} ${site.x} ${site.y + 15} Q ${site.x - 12} ${site.y + 11} ${site.x - 12} ${site.y + 2} L ${site.x - 12} ${site.y - 9} Z`}
                  fill={
                    spent
                      ? "#c8bfa8"
                      : isBuilt
                        ? isDraft
                          ? "#4a6b3a"
                          : "#2f5d34"
                        : "#f7f0df"
                  }
                  stroke={
                    jokerAvailable ? "#c9a227" : available ? "#b3402a" : "#a89a7c"
                  }
                  strokeWidth={jokerAvailable ? 3 : available ? 2.5 : 1.5}
                  strokeDasharray={isBuilt ? undefined : "4 3"}
                />
                {/* resource pip */}
                <circle
                  cx={site.x}
                  cy={site.y + 26}
                  r={7}
                  fill={
                    site.resource && site.resource !== "wild"
                      ? RESOURCE_COLORS[site.resource]
                      : "#c9a227"
                  }
                  stroke="#3b2f23"
                  strokeWidth={1}
                  opacity={spent ? 0.35 : 1}
                />
                {site.resource === "wild" && (
                  <text
                    x={site.x}
                    y={site.y + 29.5}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="bold"
                    fill="#3b2f23"
                    opacity={spent ? 0.35 : 1}
                  >
                    ?
                  </text>
                )}
              </>
            )}

            {/* point / order label */}
            <text
              x={site.x}
              y={site.y + (site.kind === "knight" ? 3 : 4)}
              textAnchor="middle"
              fontSize={site.kind === "knight" ? 11 : 12}
              fontWeight="800"
              fill={isBuilt ? "#f7f0df" : "#6b5d4b"}
              style={{ pointerEvents: "none" }}
            >
              {site.kind === "knight" ? site.order : site.points}
            </text>

            {/* spent joker cross-out */}
            {site.kind === "knight" && spent && (
              <line
                x1={site.x - 14}
                y1={site.y - 14}
                x2={site.x + 14}
                y2={site.y + 14}
                stroke="#8f3120"
                strokeWidth={3}
                style={{ pointerEvents: "none" }}
              />
            )}

            <title>
              {site.kind === "knight"
                ? `Knight ${site.order} (${RESOURCE_LABEL[site.resource ?? "wild"]} joker)${
                    spent
                      ? " — joker used"
                      : isBuilt
                        ? " — tap to use joker"
                        : available
                          ? " — tap to build"
                          : ""
                  }`
                : `${site.kind === "city" ? "City" : "Settlement"} — ${site.points} pts${
                    isBuilt ? " (built)" : available ? " — tap to build" : ""
                  }`}
            </title>
          </g>
        );
      })}

      {/* legend */}
      <text x={20} y={470} fontSize={10} fill="#6b5d4b">
        Tap a dashed site to build · tap a built knight to spend its joker
      </text>
    </svg>
  );
}

export { SITE_BY_ID };
