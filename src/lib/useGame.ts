import { useCallback, useEffect, useRef, useState } from "react";
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
import type { Game, Resource } from "./engine/types";
import { loadGame, saveGame } from "./storage";
import { pushGame, pushResults, type SyncStatus } from "./cloudSync";

export interface GameController {
  game: Game | null;
  notFound: boolean;
  toggleRoad: (idx: number) => void;
  toggleSite: (siteId: string) => void;
  toggleJoker: (siteId: string) => void;
  endTurn: (dice?: Resource[]) => void;
  draftPoints: number;
  syncStatus: SyncStatus;
}

const SYNC_DEBOUNCE_MS = 700;

export function useGame(id: string): GameController {
  const [game, setGame] = useState<Game | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const pendingRef = useRef<Game | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    setSyncStatus("saving");
    try {
      const code = await pushGame(pending);
      if (code && !pending.code) {
        setGame((prev) => {
          if (!prev || prev.id !== pending.id) return prev;
          const next: Game = { ...prev, code };
          saveGame(next);
          return next;
        });
      }
      if (pending.status === "finished") {
        await pushResults({ ...pending, code: code ?? pending.code });
      }
      setSyncStatus("saved");
    } catch {
      setSyncStatus("offline");
    }
  }, []);

  const scheduleSync = useCallback(
    (next: Game) => {
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, SYNC_DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const loaded = loadGame(id);
    if (loaded) {
      setGame(loaded);
      // Make sure the game exists in the cloud (and has a share code) even if
      // the player never taps anything this session.
      scheduleSync(loaded);
    } else {
      setNotFound(true);
    }
  }, [id, scheduleSync]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const update = useCallback(
    (mutate: (g: Game) => void) => {
      setGame((prev) => {
        if (!prev) return prev;
        const next: Game = structuredClone(prev);
        mutate(next);
        next.updatedAt = Date.now();
        saveGame(next);
        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

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

  const endTurn = useCallback((dice?: Resource[]) => {
    update((g) => {
      if (g.status !== "active") return;
      engineEndTurn(g, dice);
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
    syncStatus,
  };
}

export { totalScore, victoryPoints };
