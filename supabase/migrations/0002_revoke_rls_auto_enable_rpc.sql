-- A função auxiliar rls_auto_enable() não deve ser chamável pela API pública
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
