import { useCallback, useEffect, useState } from "react";
import {
  canBuildRoad,
  canBuildSite,
  canUseJoker,
  draftPoints,
  endTurn as engineEndTurn,
  totalScore,
  victoryPoints,
} from "./engine/engine";
import { SITE_BY_ID } from "./engine/island";
import type { Game } from "./engine/types";
import { loadGame, saveGame } from "./storage";

export interface GameController {
  game: Game | null;
  notFound: boolean;
  toggleRoad: (idx: number) => void;
  toggleSite: (siteId: string) => void;
  toggleJoker: (siteId: string) => void;
  endTurn: () => void;
  draftPoints: number;
}

export function useGame(id: string): GameController {
  const [game, setGame] = useState<Game | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loaded = loadGame(id);
    if (loaded) setGame(loaded);
    else setNotFound(true);
  }, [id]);

  const update = useCallback((mutate: (g: Game) => void) => {
    setGame((prev) => {
      if (!prev) return prev;
      const next: Game = structuredClone(prev);
      mutate(next);
      next.updatedAt = Date.now();
      saveGame(next);
      return next;
    });
  }, []);

  const toggleRoad = useCallback(
    (idx: number) => {
      update((g) => {
        if (g.status !== "active") return;
        const sheet = g.sheets[g.currentPlayer];
        const draftIdx = g.draft.roads.indexOf(idx);
        if (draftIdx >= 0) {
          g.draft.roads.splice(draftIdx, 1);
        } else if (canBuildRoad(sheet, g.draft, idx)) {
          g.draft.roads.push(idx);
        }
      });
    },
    [update],
  );

  const toggleSite = useCallback(
    (siteId: string) => {
      update((g) => {
        if (g.status !== "active") return;
        const sheet = g.sheets[g.currentPlayer];
        const site = SITE_BY_ID.get(siteId);
        if (!site) return;
        const draftIdx = g.draft.sites.indexOf(siteId);
        if (draftIdx >= 0) {
          g.draft.sites.splice(draftIdx, 1);
          // Unbuilding a knight also un-spends its drafted joker use.
          const j = g.draft.jokers.indexOf(siteId);
          if (j >= 0) g.draft.jokers.splice(j, 1);
        } else if (canBuildSite(sheet, g.draft, g.island, site)) {
          g.draft.sites.push(siteId);
        }
      });
    },
    [update],
  );

  const toggleJoker = useCallback(
    (siteId: string) => {
      update((g) => {
        if (g.status !== "active") return;
        const sheet = g.sheets[g.currentPlayer];
        const site = SITE_BY_ID.get(siteId);
        if (!site) return;
        const draftIdx = g.draft.jokers.indexOf(siteId);
        if (draftIdx >= 0) {
          g.draft.jokers.splice(draftIdx, 1);
        } else if (canUseJoker(sheet, g.draft, site)) {
          g.draft.jokers.push(siteId);
        }
      });
    },
    [update],
  );

  const endTurn = useCallback(() => {
    update((g) => {
      if (g.status !== "active") return;
      engineEndTurn(g);
    });
  }, [update]);

  return {
    game,
    notFound,
    toggleRoad,
    toggleSite,
    toggleJoker,
    endTurn,
    draftPoints: game ? draftPoints(game.draft) : 0,
  };
}

export { totalScore, victoryPoints };
