import type { Resource, Site } from "./types";

/** Serpentine path of road nodes across the island (x, y in a 340x480 viewBox). */
export const NODES: ReadonlyArray<readonly [number, number]> = [
  [50, 70],
  [130, 70],
  [210, 70],
  [290, 70],
  [290, 150],
  [210, 150],
  [130, 150],
  [50, 150],
  [50, 230],
  [130, 230],
  [210, 230],
  [290, 230],
  [290, 310],
  [210, 310],
  [130, 310],
  [50, 310],
];

export const ROAD_COUNT = NODES.length - 1;

/** Road segment index that is the gray "Longest Road" site on Island Two. */
export const LONGEST_ROAD_INDEX = 7;

/** A terrain hex sitting inside the official grid, purely decorative. */
export interface Hex {
  x: number;
  y: number;
  terrain: Resource | "desert";
  /** Dice number token; null on the desert. */
  number: number | null;
}

/** Flat-top hex radius (centre to corner) used by the map. */
export const HEX_RADIUS = 44;

/**
 * Terrain hexes filling the three bands of the official sheet layout.
 * The road/building positions above are unchanged — these sit behind them.
 */
export const HEXES: ReadonlyArray<Hex> = [
  { x: 90, y: 110, terrain: "lumber", number: 8 },
  { x: 170, y: 110, terrain: "wool", number: 5 },
  { x: 250, y: 110, terrain: "grain", number: 10 },
  { x: 90, y: 190, terrain: "brick", number: 6 },
  { x: 170, y: 190, terrain: "desert", number: null },
  { x: 250, y: 190, terrain: "ore", number: 9 },
  { x: 90, y: 270, terrain: "grain", number: 4 },
  { x: 170, y: 270, terrain: "lumber", number: 11 },
  { x: 250, y: 270, terrain: "wool", number: 3 },
];

/** Points string for a flat-top hexagon centred on (cx, cy). */
export function hexPoints(cx: number, cy: number, r = HEX_RADIUS): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a) * 0.87).toFixed(2)}`;
  }).join(" ");
}

/** Red high-probability numbers get emphasised like the printed sheet. */
export const isHotNumber = (n: number): boolean => n === 6 || n === 8;


const KNIGHT_RESOURCES: Array<Resource | "wild"> = [
  "ore",
  "wool",
  "grain",
  "brick",
  "lumber",
  "wild",
];

export const SITES: Site[] = [
  // Settlements — ascending point values 3, 4, 5, 6
  { id: "s1", kind: "settlement", points: 3, order: 1, node: 2, resource: null, x: 210, y: 28 },
  { id: "s2", kind: "settlement", points: 4, order: 2, node: 6, resource: null, x: 130, y: 192 },
  { id: "s3", kind: "settlement", points: 5, order: 3, node: 9, resource: null, x: 130, y: 272 },
  { id: "s4", kind: "settlement", points: 6, order: 4, node: 13, resource: null, x: 210, y: 352 },
  // Cities — ascending point values 7, 10, 12
  { id: "c1", kind: "city", points: 7, order: 1, node: 4, resource: null, x: 318, y: 110 },
  { id: "c2", kind: "city", points: 10, order: 2, node: 8, resource: null, x: 22, y: 190 },
  { id: "c3", kind: "city", points: 12, order: 3, node: 12, resource: null, x: 318, y: 270 },
  // Knights — ascending 1..6 on Island One, each grants a resource joker
  ...KNIGHT_RESOURCES.map((resource, i) => ({
    id: `k${i + 1}`,
    kind: "knight" as const,
    points: 1,
    order: i + 1,
    node: null,
    resource,
    x: 45 + i * 54,
    y: 500,
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
  brick: "#b3402a",
  lumber: "#4a6b3a",
  wool: "#9fb87a",
  grain: "#d9b23c",
  ore: "#6e6a63",
  gold: "#c9a227",
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
