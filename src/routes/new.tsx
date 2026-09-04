import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { newGame } from "@/lib/engine/engine";
import type { Island } from "@/lib/engine/types";
import { saveGame } from "@/lib/storage";
import { getRosterStats } from "@/lib/cloud.functions";
import { getRosterCode } from "@/lib/roster";
import { cn } from "@/lib/cn";
import { WaInput, WaButton } from "@/design-system/font-awsome-web-awesome-171158";
import { CaptchaGate, type CaptchaState } from "@/components/CaptchaGate";
import { verifyCaptcha } from "@/lib/captcha.functions";


export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Game — Catan Dice Game Score Sheet" },
      {
        name: "description",
        content: "Set up a new Catan Dice Game: pick an island and add players.",
      },
      { property: "og:title", content: "New Game — Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content: "Set up a new Catan Dice Game: pick an island and add players.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewGame,
});

function NewGame() {
  const router = useRouter();
  const [island, setIsland] = useState<Island>(1);
  const [names, setNames] = useState<string[]>(["Player 1"]);
  const [aiFlags, setAiFlags] = useState<boolean[]>([false]);
  const [rosterCode, setRoster] = useState<string | null>(null);
  const [rosterNames, setRosterNames] = useState<string[]>([]);

  useEffect(() => {
    const code = getRosterCode();
    if (!code) return;
    setRoster(code);
    void getRosterStats({ data: { code } })
      .then((stats) => setRosterNames((stats ?? []).map((p) => p.name)))
      .catch(() => setRosterNames([]));
  }, []);

  const addPlayer = () => {
    if (names.length < 4) {
      setNames([...names, `Player ${names.length + 1}`]);
      setAiFlags([...aiFlags, false]);
    }
  };
  const addAi = () => {
    if (names.length >= 4) return;
    // Always add — never replace the human's own slot, or the game would
    // have no one holding the device.
    const n = aiFlags.filter(Boolean).length + 1;
    setNames([...names, n > 1 ? `Catan Bot ${n}` : "Catan Bot"]);
    setAiFlags([...aiFlags, true]);
  };
  const removePlayer = (idx: number) => {
    if (names.length > 1) {
      setNames(names.filter((_, i) => i !== idx));
      setAiFlags(aiFlags.filter((_, i) => i !== idx));
    }
  };
  const rename = (idx: number, value: string) => {
    setNames(names.map((n, i) => (i === idx ? value : n)));
  };
  const addFromRoster = (name: string) => {
    if (names.includes(name) || names.length >= 4) return;
    const blank = names.findIndex(
      (n, i) => !aiFlags[i] && /^Player \d+$/.test(n.trim()),
    );
    if (blank >= 0) rename(blank, name);
    else {
      setNames([...names, name]);
      setAiFlags([...aiFlags, false]);
    }
  };

  const [captcha, setCaptcha] = useState<CaptchaState>({ status: "loading" });
  const [starting, setStarting] = useState(false);

  const captchaOk =
    captcha.status === "solved" || captcha.status === "unconfigured";

  const start = async () => {
    if (aiFlags.every(Boolean)) return; // a game needs at least one human
    if (!captchaOk || starting) return;
    setStarting(true);
    try {
      if (captcha.status === "solved") {
        const { success } = await verifyCaptcha({
          data: { token: captcha.token },
        });
        if (!success) {
          setCaptcha({ status: "ready" });
          setStarting(false);
          return;
        }
      }
      const cleaned = names.map((n, i) =>
        aiFlags[i]
          ? n.trim() || "Catan Bot"
          : n.trim() || `Player ${i + 1}`,
      );
      const game = newGame(island, cleaned, aiFlags);
      if (rosterCode) game.rosterCode = rosterCode;
      saveGame(game);
      router.navigate({ to: "/game/$id", params: { id: game.id } });
    } catch {
      setStarting(false);
    }
  };

  const noHuman = aiFlags.every(Boolean);
  const startDisabled = noHuman || !captchaOk || starting;


  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <h1 className="mb-6 font-display text-3xl font-black text-ink">
        New game
      </h1>

      <section aria-label="Choose island" className="mb-8">
        <h2 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
          Island
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIsland(n)}
              aria-pressed={island === n}
              className={cn(
                "flex h-auto min-h-0 flex-col items-start rounded-xl border-2 p-4 text-left transition-colors",
                island === n
                  ? "border-catan-red bg-catan-red/10"
                  : "border-ink/15 bg-parchment-deep/50",
              )}
            >
              <p className="font-display text-lg font-bold whitespace-nowrap text-ink">
                Island {n === 1 ? "One" : "Two"}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {n === 1
                  ? "15 turns each — highest score wins"
                  : "Race to 10 victory points"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Players" className="mb-8">
        <h2 className="mb-2 text-sm font-bold tracking-wide text-ink-soft uppercase">
          Players ({names.length}/4)
        </h2>
        {rosterNames.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {rosterNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addFromRoster(name)}
                disabled={names.includes(name)}
                className={cn(
                  "rounded-full border-2 px-3 py-1 text-xs font-bold",
                  names.includes(name)
                    ? "border-forest/40 bg-forest/10 text-forest-deep"
                    : "border-ink/20 text-ink-soft",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {names.map((name, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <WaInput
                  value={name}
                  onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                    rename(idx, e.target.value)
                  }
                  aria-label={`Player ${idx + 1} name`}
                  maxlength={20}
                  className="w-full"
                />
                {aiFlags[idx] && (
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-ore/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-ink-soft uppercase">
                    AI
                  </span>
                )}
              </div>
              {names.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  aria-label={`Remove player ${idx + 1}`}
                  className="shrink-0 rounded-xl border-2 border-ink/15 px-4 font-bold text-ink-soft active:bg-ink/10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {names.length < 4 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={addPlayer}
              className="rounded-xl border-2 border-dashed border-ink/25 py-3 text-sm font-bold text-ink-soft active:bg-ink/5"
            >
              + Add player
            </button>
            <button
              type="button"
              onClick={addAi}
              className="rounded-xl border-2 border-dashed border-catan-red/40 py-3 text-sm font-bold text-catan-red active:bg-catan-red/5"
            >
              + Add AI opponent
            </button>
          </div>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <CaptchaGate onState={setCaptcha} />
        {noHuman && (
          <p className="text-center text-xs font-bold text-catan-red">
            Add at least one human player.
          </p>
        )}
        <WaButton
          variant="brand"
          size="large"
          pill
          disabled={startDisabled}
          onClick={() => void start()}
          className="w-full"
        >
          {starting ? "Checking…" : "Start game"}
        </WaButton>
      </div>
    </main>
  );
}
