import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { pullGame } from "@/lib/cloudSync";
import { normalizeCode } from "@/lib/roster";

export const Route = createFileRoute("/g/$code")({
  head: () => ({
    meta: [
      { title: "Open Game — Catan Dice Game Score Sheet" },
      {
        name: "description",
        content:
          "Open a shared Catan Dice Game score sheet by code and keep playing on any device.",
      },
      { property: "og:title", content: "Open Game — Catan Dice Game Score Sheet" },
      {
        property: "og:description",
        content: "Open a shared Catan Dice Game score sheet by code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OpenByCode,
});

function OpenByCode() {
  const { code } = Route.useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const game = await pullGame(normalizeCode(code));
        if (cancelled) return;
        if (!game) {
          setError("No game found for that code.");
          return;
        }
        router.navigate({
          to: game.status === "finished" ? "/game/$id/results" : "/game/$id",
          params: { id: game.id },
          replace: true,
        });
      } catch {
        if (!cancelled) setError("Couldn't reach the cloud. Check your connection.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">
        {error ? "Can't open that game" : `Opening game ${normalizeCode(code)}…`}
      </h1>
      {error && <p className="text-sm text-ink-soft">{error}</p>}
      <Link to="/" className="font-bold text-catan-red underline">
        Back to home
      </Link>
    </main>
  );
}
