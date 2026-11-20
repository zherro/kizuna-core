-- plugins/services/0019_services_moderator_children_write.sql
-- Moderador (services.moderate) escreve endereços e subcategorias do anúncio que modera, como já
-- escreve a linha de services (services_owner_update). Antes, só o dono podia (sa_owner_write /
-- scs_owner_write): no wizard em modo revisão o DELETE/PATCH do moderador voltava 0 linhas e o
-- anúncio ficava incoerente (services gravado, endereço/categoria não).
-- Só afeta quem tem services.moderate; anon, prestador e dono não mudam. Aditivo e idempotente.

DROP POLICY IF EXISTS sa_moderator_write ON public.service_addresses;
CREATE POLICY sa_moderator_write ON public.service_addresses FOR ALL TO auth_user
  USING (auth.fun_auth_has_perm('services', 'moderate'))
  WITH CHECK (auth.fun_auth_has_perm('services', 'moderate'));

DROP POLICY IF EXISTS scs_moderator_write ON public.service_categories_sub;
CREATE POLICY scs_moderator_write ON public.service_categories_sub FOR ALL TO auth_user
  USING (auth.fun_auth_has_perm('services', 'moderate'))
  WITH CHECK (auth.fun_auth_has_perm('services', 'moderate'));
