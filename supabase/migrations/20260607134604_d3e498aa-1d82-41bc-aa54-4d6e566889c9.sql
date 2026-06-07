INSERT INTO public.user_modules (user_id, module_id, status)
SELECT DISTINCT user_id, 'sleep', 'installed'
FROM public.sleep_entries
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, module_id) DO NOTHING;