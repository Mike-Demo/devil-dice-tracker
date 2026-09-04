import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/game/$id")({
  component: GameLayout,
});

function GameLayout() {
  return <Outlet />;
}
