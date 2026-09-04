import {
  HEXES,
  LONGEST_ROAD_INDEX,
  NODES,
  RESOURCE_COLORS,
  RESOURCE_LABEL,
  ROAD_COUNT,
  SITES,
  SITE_BY_ID,
  TERRAIN_LABEL,
  hexPoints,
  isHotNumber,
  siteLabel,
  terrainColor,
} from "@/lib/engine/island";

import {
  canBuildRoad,
  canBuildSite,
  canUseJoker,
  effectiveRoads,
} from "@/lib/engine/engine";
import type { Game, PlayerState, Site, TurnDraft } from "@/lib/engine/types";
import { cn } from "@/lib/cn";

interface Props {
  game: Game;
  onToggleRoad: (idx: number) => void;
  onToggleSite: (siteId: string) => void;
  onToggleJoker: (siteId: string) => void;
}

const clampX = (x: number): number => Math.min(302, Math.max(38, x));

function valueCaption(site: Site, island: Game["island"]): string {
  if (site.kind === "knight") return RESOURCE_LABEL[site.resource ?? "wild"];
  if (island === 2) return site.kind === "city" ? "2 VP" : "1 VP";
  return `${site.points} pts`;
}

export function IslandMap({ game, onToggleRoad, onToggleSite, onToggleJoker }: Props) {
  const sheet: PlayerState = game.sheets[game.currentPlayer];
  const draft: TurnDraft = game.draft;
  const roads = effectiveRoads(sheet, draft);
  const built = new Set([...sheet.built, ...draft.sites]);
  const jokersSpent = new Set([...sheet.jokersUsed, ...draft.jokers]);

  return (
    <svg
      viewBox="0 0 340 560"
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
      <rect x="4" y="4" width="332" height="384" rx="18" fill="#eadfc6" stroke="#cbbd9c" strokeWidth="2" />

      {/* terrain hexes — same official layout, printed like the score sheet */}
      {HEXES.map((hex) => (
        <g key={`h${hex.x}-${hex.y}`} style={{ pointerEvents: "none" }}>
          <polygon
            points={hexPoints(hex.x, hex.y)}
            fill={terrainColor(hex.terrain)}
            fillOpacity={0.5}
            stroke="#a89a7c"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <text
            x={hex.x}
            y={hex.y - 20}
            textAnchor="middle"
            fontSize={7.5}
            fontWeight="700"
            letterSpacing="0.6"
            fill="#5c4d3a"
            opacity={0.75}
          >
            {TERRAIN_LABEL[hex.terrain].toUpperCase()}
          </text>
          {hex.number !== null ? (
            <>
              <circle
                cx={hex.x}
                cy={hex.y}
                r={12}
                fill="#f7f0df"
                stroke="#a89a7c"
                strokeWidth={1.2}
                opacity={0.95}
              />
              <text
                x={hex.x}
                y={hex.y + 4.5}
                textAnchor="middle"
                fontSize={13}
                fontWeight="800"
                fill={isHotNumber(hex.number) ? "#b3402a" : "#3b2f23"}
              >
                {hex.number}
              </text>
            </>
          ) : (
            <>
              {/* robber on the desert */}
              <ellipse cx={hex.x} cy={hex.y + 10} rx={9} ry={3.5} fill="#3b2f23" opacity={0.35} />
              <path
                d={`M ${hex.x} ${hex.y - 13} Q ${hex.x + 8} ${hex.y - 12} ${hex.x + 8} ${hex.y - 2} L ${hex.x + 10} ${hex.y + 9} L ${hex.x - 10} ${hex.y + 9} L ${hex.x - 8} ${hex.y - 2} Q ${hex.x - 8} ${hex.y - 12} ${hex.x} ${hex.y - 13} Z`}
                fill="#3b2f23"
                opacity={0.8}
              />
            </>
          )}
        </g>
      ))}

      {/* zone header: roads & buildings */}
      <text x="18" y="21" fontSize={10} fontWeight="800" letterSpacing="1.4" fill="#8f7f63">
        ROADS &amp; BUILDINGS
      </text>
      <text x="18" y="35" fontSize={9} fill="#8f7f63">
        Roads build in order — 1 pt each.
      </text>



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
                      ? `Build road ${i} — 1 pt`
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
            {(available || isDraft) && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 12}
                textAnchor="middle"
                fontSize={8}
                fontWeight="700"
                fill={isDraft ? "#2f5d34" : "#b3402a"}
                style={{ pointerEvents: "none" }}
              >
                ROAD 1pt
              </text>
            )}
          </g>
        );
      })}

      {/* nodes */}
      {NODES.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={4} fill="#cbbd9c" />
      ))}

      {/* knights strip */}
      <rect x="4" y="398" width="332" height="158" rx="18" fill="#e3d6ba" stroke="#cbbd9c" strokeWidth="2" />
      <text x="18" y="420" fontSize={10} fontWeight="800" letterSpacing="1.4" fill="#8f7f63">
        KNIGHTS &amp; RESOURCE JOKERS
      </text>
      <text x="18" y="436" fontSize={9} fill="#8f7f63">
        Build a knight (1 pt), then tap it to spend its resource joker.
      </text>

      {/* build sites */}
      {SITES.map((site) => {
        const isBuilt = built.has(site.id);
        const isDraft = draft.sites.includes(site.id);
        const available =
          !isBuilt && canBuildSite(sheet, draft, game.island, site);
        const jokerAvailable =
          site.kind === "knight" && canUseJoker(sheet, draft, site);
        const spent = jokersSpent.has(site.id);
        const label = siteLabel(site);
        const captionX = clampX(site.x);

        return (
          <g
            key={site.id}
            className={cn(
              "transition-all",
              (available || isDraft) && "cursor-pointer",
            )}
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

            {/* point / order label inside the icon */}
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

            {/* caption: what this piece is and what it is worth */}
            <text
              x={captionX}
              y={site.y + (site.kind === "knight" ? 44 : 22)}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight="700"
              fill="#6b5d4b"
              style={{ pointerEvents: "none" }}
            >
              {site.kind === "knight" ? `Knight ${site.order}` : label}
            </text>
            <text
              x={captionX}
              y={site.y + (site.kind === "knight" ? 54 : 31)}
              textAnchor="middle"
              fontSize={8}
              fill="#8f7f63"
              style={{ pointerEvents: "none" }}
            >
              {valueCaption(site, game.island)}
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
                : `${label} — ${valueCaption(site, game.island)}${
                    isBuilt ? " (built)" : available ? " — tap to build" : ""
                  }`}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

export { SITE_BY_ID };
