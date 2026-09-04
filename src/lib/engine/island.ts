import type { Resource, Site } from "./types";

/** Flat-top hex radius (centre to corner) used by the map. */
export const HEX_RADIUS = 42;

/** Half-width / half-height steps of the hex vertex grid. */
const U = HEX_RADIUS / 2;
const V = HEX_RADIUS * Math.sin(Math.PI / 3);

/** Centre of the island inside the map viewBox. */
export const ISLAND_CENTER: readonly [number, number] = [170, 190];

/** Convert a hex-grid coordinate (in U / V steps) to viewBox pixels. */
const px = (a: number, b: number): [number, number] => [
  Number((ISLAND_CENTER[0] + a * U).toFixed(2)),
  Number((ISLAND_CENTER[1] + b * V).toFixed(2)),
];

/** A terrain hex of the printed island. */
export interface Hex {
  x: number;
  y: number;
  terrain: Resource | "desert";
  /** Dice number token; null on the desert. */
  number: number | null;
}

/**
 * The six terrain hexes of the printed sheet: a ring around the open water,
 * mountains / desert / hills on top, fields / pasture / forest below.
 */
export const HEXES: ReadonlyArray<Hex> = [
  { ...pos(-3, -1), terrain: "ore", number: 1 },
  { ...pos(0, -2), terrain: "desert", number: null },
  { ...pos(3, -1), terrain: "brick", number: 5 },
  { ...pos(3, 1), terrain: "lumber", number: 4 },
  { ...pos(0, 2), terrain: "wool", number: 3 },
  { ...pos(-3, 1), terrain: "grain", number: 2 },
];

function pos(a: number, b: number): { x: number; y: number } {
  const [x, y] = px(a, b);
  return { x, y };
}

/**
 * Road nodes: hex corners walked around the island edge, exactly like the
 * printed road track. Consecutive nodes always share a hex edge.
 */
const NODE_GRID: ReadonlyArray<readonly [number, number]> = [
  [-2, -2],
  [-1, -3],
  [1, -3],
  [2, -2],
  [4, -2],
  [5, -1],
  [4, 0],
  [5, 1],
  [4, 2],
  [2, 2],
  [1, 3],
  [-1, 3],
  [-2, 2],
  [-4, 2],
  [-5, 1],
  [-4, 0],
];

export const NODES: ReadonlyArray<readonly [number, number]> = NODE_GRID.map(
  ([a, b]) => px(a, b),
);

export const ROAD_COUNT = NODES.length - 1;

/** Road segment index that is the gray "Longest Road" site on Island Two. */
export const LONGEST_ROAD_INDEX = 7;

/** Points string for a flat-top hexagon centred on (cx, cy). */
export function hexPoints(cx: number, cy: number, r = HEX_RADIUS): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

/** Red high-probability numbers get emphasised like the printed sheet. */
export const isHotNumber = (n: number): boolean => n === 6 || n === 8;

/** Push a build token outwards from the island centre so roads stay visible. */
function outward(node: number, distance: number): { x: number; y: number } {
  const [x, y] = NODES[node];
  const dx = x - ISLAND_CENTER[0];
  const dy = y - ISLAND_CENTER[1];
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: Number((x + (dx / len) * distance).toFixed(2)),
    y: Number((y + (dy / len) * distance).toFixed(2)),
  };
}

/** Knight order on the sheet: one pawn per terrain hex. */
const KNIGHT_HEX: ReadonlyArray<{ resource: Resource | "wild"; hex: number }> = [
  { resource: "ore", hex: 0 },
  { resource: "wool", hex: 4 },
  { resource: "grain", hex: 5 },
  { resource: "brick", hex: 2 },
  { resource: "lumber", hex: 3 },
  { resource: "wild", hex: 1 },
];

export const SITES: Site[] = [
  // Settlements — ascending point values 3, 4, 5, 6
  { id: "s1", kind: "settlement", points: 3, order: 1, node: 2, resource: null, ...outward(2, 18) },
  { id: "s2", kind: "settlement", points: 4, order: 2, node: 6, resource: null, ...outward(6, 18) },
  { id: "s3", kind: "settlement", points: 5, order: 3, node: 9, resource: null, ...outward(9, 18) },
  { id: "s4", kind: "settlement", points: 6, order: 4, node: 13, resource: null, ...outward(13, 18) },
  // Cities — ascending point values 7, 10, 12
  { id: "c1", kind: "city", points: 7, order: 1, node: 4, resource: null, ...outward(4, 20) },
  { id: "c2", kind: "city", points: 10, order: 2, node: 8, resource: null, ...outward(8, 20) },
  { id: "c3", kind: "city", points: 12, order: 3, node: 12, resource: null, ...outward(12, 20) },
  // Knights — one per hex, each grants a resource joker
  ...KNIGHT_HEX.map(({ resource, hex }, i) => ({
    id: `k${i + 1}`,
    kind: "knight" as const,
    points: 1,
    order: i + 1,
    node: null,
    resource,
    x: HEXES[hex].x,
    y: HEXES[hex].y,
  })),
];

export const SITE_BY_ID: ReadonlyMap<string, Site> = new Map(
  SITES.map((s) => [s.id, s]),
);

/** Human-readable name for a build site, e.g. "Settlement 3" / "Knight 2". */
export function siteLabel(site: Site): string {
  const kind =
    site.kind === "settlement" ? "Settlement" : site.kind === "city" ? "City" : "Knight";
  return `${kind} ${site.kind === "knight" ? site.order : site.points}`;
}

/** Display names for knight joker resources. */
export const RESOURCE_LABEL: Record<Resource | "wild", string> = {
  brick: "Brick",
  lumber: "Lumber",
  wool: "Wool",
  grain: "Grain",
  ore: "Ore",
  gold: "Gold",
  wild: "Any resource",
};

export const RESOURCE_COLORS: Record<Resource, string> = {
  brick: "var(--color-brick)",
  lumber: "var(--color-lumber)",
  wool: "var(--color-wool)",
  grain: "var(--color-grain)",
  ore: "var(--color-ore)",
  gold: "var(--color-gold)",
};

export const DESERT_COLOR = "var(--color-desert)";

/** Fill for any terrain hex, including the desert. */
export function terrainColor(terrain: Resource | "desert"): string {
  return terrain === "desert" ? DESERT_COLOR : RESOURCE_COLORS[terrain];
}

export const TERRAIN_LABEL: Record<Resource | "desert", string> = {
  brick: "Hills",
  lumber: "Forest",
  wool: "Pasture",
  grain: "Fields",
  ore: "Mountains",
  gold: "Gold field",
  desert: "Desert",
};
