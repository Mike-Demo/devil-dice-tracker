CREATE TABLE public.rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rosters TO service_role;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roster_id, name)
);
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  roster_id uuid REFERENCES public.rosters(id) ON DELETE SET NULL,
  island smallint NOT NULL,
  state jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  name text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  longest_road integer NOT NULL DEFAULT 0,
  won boolean NOT NULL DEFAULT false,
  island smallint NOT NULL DEFAULT 1,
  finished_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, name)
);
GRANT ALL ON public.game_results TO service_role;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX game_results_game_id_idx ON public.game_results (game_id);
CREATE INDEX players_roster_id_idx ON public.players (roster_id);
CREATE INDEX games_roster_id_idx ON public.games (roster_id);