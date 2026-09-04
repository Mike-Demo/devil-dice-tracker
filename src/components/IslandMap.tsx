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

function valueCaption(site: Site, island: Game["island"]): string {
  if (site.kind === "knight") return RESOURCE_LABEL[site.resource ?? "wild"];
  if (island === 2) return site.kind === "city" ? "2 VP" : "1 VP";
  return `${site.points} pts`;
}

const angleOf = (x1: number, y1: number, x2: number, y2: number): number =>
  (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

export function IslandMap({ game, onToggleRoad, onToggleSite, onToggleJoker }: Props) {
  const sheet: PlayerState = game.sheets[game.currentPlayer];
  const draft: TurnDraft = game.draft;
  const roads = effectiveRoads(sheet, draft);
  const built = new Set([...sheet.built, ...draft.sites]);
  const jokersSpent = new Set([...sheet.jokersUsed, ...draft.jokers]);

  return (
    <svg
      viewBox="0 0 340 392"
      className="h-auto w-full select-none"
      role="img"
      aria-label="Island game map"
    >
      <defs>
        <pattern id="gray-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--color-map-hatch)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-map-line)" strokeWidth="2" />
        </pattern>
      </defs>

      {/* zone header */}
      <text x="16" y="18" fontSize={10} fontWeight="800" letterSpacing="1.4" fill="var(--color-ink-soft)">
        THE ISLAND — ROADS, BUILDINGS &amp; KNIGHTS
      </text>
      <text x="16" y="32" fontSize={9} fill="var(--color-ink-soft)">
        Roads build in order — 1 pt each.
      </text>

      {/* sea */}
      <rect
        x="6"
        y="44"
        width="328"
        height="300"
        rx="14"
        fill="var(--color-sea)"
        stroke="var(--color-sea-deep)"
        strokeWidth="3"
      />

      {/* terrain hexes */}
      {HEXES.map((hex) => (
        <g key={`h${hex.x}-${hex.y}`} style={{ pointerEvents: "none" }}>
          <polygon
            points={hexPoints(hex.x, hex.y)}
            fill="var(--color-sand)"
            stroke="var(--color-sand-deep)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <polygon
            points={hexPoints(hex.x, hex.y, 35.5)}
            fill={terrainColor(hex.terrain)}
            fillOpacity={hex.terrain === "desert" ? 0.9 : 0.75}
            stroke="none"
          />
          <text
            x={hex.x}
            y={hex.y - 23}
            textAnchor="middle"
            fontSize={7.5}
            fontWeight="700"
            letterSpacing="0.6"
            fill="var(--color-map-token)"
          >
            {TERRAIN_LABEL[hex.terrain].toUpperCase()}
          </text>
        </g>
      ))}

      {/* roads sit on the hex edges, like the printed track */}
      {Array.from({ length: ROAD_COUNT }, (_, i) => {
        const [x1, y1] = NODES[i];
        const [x2, y2] = NODES[i + 1];
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const rot = angleOf(x1, y1, x2, y2);
        const isBuilt = roads[i];
        const isDraft = draft.roads.includes(i);
        const available = canBuildRoad(sheet, draft, i);
        const isGraySite = game.island === 2 && i === LONGEST_ROAD_INDEX;
        const isStart = i === 0;
        const fill = isBuilt
          ? isDraft
            ? "var(--color-forest)"
            : isStart
              ? "var(--color-road-start)"
              : "var(--color-road)"
          : isGraySite
            ? "url(#gray-hatch)"
            : "var(--color-map-token)";
        return (
          <g
            key={`r${i}`}
            transform={`rotate(${rot.toFixed(2)} ${mx} ${my})`}
            className={cn(available && "cursor-pointer")}
            onClick={() => onToggleRoad(i)}
          >
            <rect
              x={mx - 17}
              y={my - 7}
              width={34}
              height={14}
              rx={2.5}
              fill={fill}
              stroke={available ? "var(--color-catan-red)" : "var(--color-ink)"}
              strokeWidth={available ? 2.5 : 1.4}
            />
            <text
              x={mx}
              y={my + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="800"
              fill={isBuilt ? "var(--color-map-token)" : "var(--color-ink)"}
              style={{ pointerEvents: "none" }}
            >
              1
            </text>
            {/* invisible fat tap target */}
            <rect
              x={mx - 22}
              y={my - 13}
              width={44}
              height={26}
              fill="transparent"
            />
            <title>
              {isStart
                ? "Starting road (pre-built)"
                : isBuilt
                  ? `Road ${i} — built`
                  : available
                    ? `Build road ${i} — 1 pt`
                    : `Road ${i} — build earlier roads first`}
            </title>
          </g>
        );
      })}

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
        const pieceFill = isBuilt
          ? isDraft
            ? "var(--color-forest)"
            : "var(--color-built)"
          : "var(--color-map-token)";
        const pieceStroke = available
          ? "var(--color-catan-red)"
          : "var(--color-ink)";

        return (
          <g
            key={site.id}
            className={cn(
              "transition-all",
              (available || isDraft || jokerAvailable) && "cursor-pointer",
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
            <circle cx={site.x} cy={site.y} r={22} fill="transparent" />

            {site.kind === "settlement" && (
              /* paper's arrow-shaped settlement space */
              <path
                d={`M ${site.x} ${site.y - 15} L ${site.x + 11} ${site.y - 4} L ${site.x + 7} ${site.y - 4} L ${site.x + 7} ${site.y + 12} L ${site.x - 7} ${site.y + 12} L ${site.x - 7} ${site.y - 4} L ${site.x - 11} ${site.y - 4} Z`}
                fill={pieceFill}
                stroke={pieceStroke}
                strokeWidth={available ? 2.5 : 1.6}
                strokeLinejoin="round"
              />
            )}
            {site.kind === "city" && (
              /* paper's stepped city space */
              <path
                d={`M ${site.x - 13} ${site.y + 12} L ${site.x - 13} ${site.y - 2} L ${site.x - 2} ${site.y - 2} L ${site.x - 2} ${site.y - 8} L ${site.x + 5} ${site.y - 15} L ${site.x + 13} ${site.y - 8} L ${site.x + 13} ${site.y + 12} Z`}
                fill={pieceFill}
                stroke={pieceStroke}
                strokeWidth={available ? 2.5 : 1.6}
                strokeLinejoin="round"
              />
            )}
            {site.kind === "knight" && (
              <>
                {/* pawn on the hex */}
                <circle
                  cx={site.x}
                  cy={site.y - 17}
                  r={8}
                  fill={pieceFill}
                  stroke={jokerAvailable ? "var(--color-gold)" : pieceStroke}
                  strokeWidth={jokerAvailable ? 3 : available ? 2.5 : 1.4}
                />
                <path
                  d={`M ${site.x - 7} ${site.y - 2} Q ${site.x - 5} ${site.y - 11} ${site.x} ${site.y - 11} Q ${site.x + 5} ${site.y - 11} ${site.x + 7} ${site.y - 2} Z`}
                  fill={pieceFill}
                  stroke={jokerAvailable ? "var(--color-gold)" : pieceStroke}
                  strokeWidth={jokerAvailable ? 2.5 : 1.4}
                  strokeLinejoin="round"
                />
                {/* resource disc, like the printed number token */}
                <circle
                  cx={site.x}
                  cy={site.y + 12}
                  r={15}
                  fill="var(--color-map-token)"
                  stroke={jokerAvailable ? "var(--color-gold)" : "var(--color-ink)"}
                  strokeWidth={jokerAvailable ? 3 : 1.4}
                  opacity={spent ? 0.45 : 1}
                />
                <circle
                  cx={site.x}
                  cy={site.y + 12}
                  r={9}
                  fill={
                    site.resource && site.resource !== "wild"
                      ? RESOURCE_COLORS[site.resource]
                      : "var(--color-gold)"
                  }
                  opacity={spent ? 0.3 : 1}
                />
                {site.resource === "wild" && (
                  <text
                    x={site.x}
                    y={site.y + 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="800"
                    fill="var(--color-ink)"
                    style={{ pointerEvents: "none" }}
                  >
                    ?
                  </text>
                )}
                {spent && (
                  <line
                    x1={site.x - 13}
                    y1={site.y - 1}
                    x2={site.x + 13}
                    y2={site.y + 25}
                    stroke="var(--color-catan-red-deep)"
                    strokeWidth={3}
                    style={{ pointerEvents: "none" }}
                  />
                )}
              </>
            )}

            {/* number printed on the space */}
            <text
              x={site.x}
              y={site.kind === "knight" ? site.y - 14 : site.y + 8}
              textAnchor="middle"
              fontSize={site.kind === "knight" ? 9 : 11}
              fontWeight="800"
              fill={
                site.kind === "knight"
                  ? isBuilt
                    ? "var(--color-map-token)"
                    : "var(--color-ink)"
                  : isBuilt
                    ? "var(--color-map-token)"
                    : "var(--color-ink)"
              }
              style={{ pointerEvents: "none" }}
            >
              {site.kind === "knight" ? site.order : site.points}
            </text>

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

      <text x="16" y="364" fontSize={9} fill="var(--color-ink-soft)">
        Pawns on the tiles are knights — 1 pt, then tap to spend the joker.
      </text>
      <text x="16" y="378" fontSize={9} fill="var(--color-ink-soft)">
        Arrows = settlements, stepped spaces = cities; number = points.
      </text>
    </svg>
  );
}

export { SITE_BY_ID };
