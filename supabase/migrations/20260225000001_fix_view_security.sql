-- security invoker
ALTER VIEW public.discussion_summary SET (security_invoker = true);
ALTER VIEW public.calling_summary SET (security_invoker = true);
