-- plugins/services/0017_service_addresses_city_ibge.sql
-- `service_addresses.city_ibge` preenchido pelo banco quando chega vazio. A busca (search 0011) e o
-- mapa filtram cidade SÓ por esse código: endereço salvo com cidade + UF e sem IBGE some da busca
-- mesmo publicado. O formulário tenta descobrir o código no navegador (CEP ou nome da cidade), mas
-- é best-effort e falha calada (ViaCEP fora, lista de cidades sem resposta); importador/robô também
-- pode gravar sem ele. Este trigger fecha o buraco para qualquer caminho de gravação.
--
-- Regra: INSERT/UPDATE com `city_ibge` vazio e `city` + `state` preenchidos → procura em
-- `location_city` (plugin location; o `id` é o código IBGE) pelo nome sem acento/caixa dentro da UF.
-- Achou um só → grava. Não achou → deixa vazio (não derruba o save). `city_ibge` informado não é
-- tocado. No fim, preenche os endereços que já estão gravados sem o código.
-- Idempotente.

DO $do$
BEGIN
  -- Depende do plugin location (vem antes de services na lista); sem ele, nada a fazer.
  IF to_regclass('public.location_city') IS NULL OR to_regclass('public.location_state') IS NULL THEN
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.fn_city_ibge_by_name(p_city text, p_state text)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $function$
    SELECT CASE WHEN count(*) = 1 THEN min(lc.id)::text END
    FROM public.location_city lc
    JOIN public.location_state ls ON ls.id = lc.state_id
    WHERE upper(ls.code) = upper(btrim(p_state))
      AND lower(unaccent(btrim(lc.name))) = lower(unaccent(btrim(p_city)));
  $function$;

  CREATE OR REPLACE FUNCTION public.fn_service_addresses_fill_city_ibge()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $function$
  BEGIN
    IF NULLIF(btrim(NEW.city_ibge), '') IS NULL
       AND NULLIF(btrim(NEW.city), '') IS NOT NULL
       AND NULLIF(btrim(NEW.state), '') IS NOT NULL THEN
      NEW.city_ibge := public.fn_city_ibge_by_name(NEW.city, NEW.state);
    END IF;
    RETURN NEW;
  END;
  $function$;

  DROP TRIGGER IF EXISTS service_addresses_fill_city_ibge ON public.service_addresses;
  CREATE TRIGGER service_addresses_fill_city_ibge
    BEFORE INSERT OR UPDATE OF city, state, city_ibge ON public.service_addresses
    FOR EACH ROW EXECUTE FUNCTION public.fn_service_addresses_fill_city_ibge();

  -- Endereços já gravados sem o código.
  UPDATE public.service_addresses sa
     SET city_ibge = public.fn_city_ibge_by_name(sa.city, sa.state),
         updated_at = now()
   WHERE NULLIF(btrim(sa.city_ibge), '') IS NULL
     AND NULLIF(btrim(sa.city), '') IS NOT NULL
     AND NULLIF(btrim(sa.state), '') IS NOT NULL
     AND public.fn_city_ibge_by_name(sa.city, sa.state) IS NOT NULL;
END
$do$;
