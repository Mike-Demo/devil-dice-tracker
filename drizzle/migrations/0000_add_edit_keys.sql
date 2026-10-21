ALTER TABLE public.games ADD COLUMN IF NOT EXISTS edit_key text;
ALTER TABLE public.rosters ADD COLUMN IF NOT EXISTS edit_key text;