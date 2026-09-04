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
    y: 430,
  })),
];

export const SITE_BY_ID: ReadonlyMap<string, Site> = new Map(
  SITES.map((s) => [s.id, s]),
);

export const RESOURCE_COLORS: Record<Resource, string> = {
  brick: "#b3402a",
  lumber: "#4a6b3a",
  wool: "#9fb87a",
  grain: "#d9b23c",
  ore: "#6e6a63",
  gold: "#c9a227",
};
