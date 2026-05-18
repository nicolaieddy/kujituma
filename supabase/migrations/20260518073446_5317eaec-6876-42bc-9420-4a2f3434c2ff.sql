-- Deduplicate tos_acceptances: keep the earliest accepted_at per (user_id, tos_version)
DELETE FROM public.tos_acceptances a
USING public.tos_acceptances b
WHERE a.user_id = b.user_id
  AND a.tos_version = b.tos_version
  AND (
    a.accepted_at > b.accepted_at
    OR (a.accepted_at = b.accepted_at AND a.id > b.id)
  );

-- Prevent future duplicates
ALTER TABLE public.tos_acceptances
  ADD CONSTRAINT tos_acceptances_user_version_unique UNIQUE (user_id, tos_version);