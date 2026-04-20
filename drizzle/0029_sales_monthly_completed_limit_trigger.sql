-- Enforce subscription monthly completed-sales caps at the database (defense in depth + races).
-- Uses UTC calendar month boundaries, matching application logic.

CREATE OR REPLACE FUNCTION public.enforce_monthly_completed_sales_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  lim integer;
  cnt bigint;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'completed' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM 'completed' THEN
      RETURN NEW;
    END IF;
    IF OLD.status = 'completed' AND NEW.status = 'completed' THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('aurapharma:sales_monthly:' || NEW.organization_id::text));

  v_start := (date_trunc('month', (clock_timestamp() AT TIME ZONE 'UTC'))) AT TIME ZONE 'UTC';
  v_end := v_start + interval '1 month';

  lim := NULL;
  SELECT (spf.features->'limits'->>'salesTransactions')::integer
  INTO lim
  FROM public.organization_subscriptions os
  JOIN public.subscription_plan_features spf ON spf.plan_id = os.plan_id
  WHERE os.organization_id = NEW.organization_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT (spf.features->'limits'->>'salesTransactions')::integer
    INTO lim
    FROM public.subscription_plans p
    JOIN public.subscription_plan_features spf ON spf.plan_id = p.id
    WHERE p.code = 'free'
    LIMIT 1;
  END IF;

  IF lim IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::bigint
  INTO cnt
  FROM public.sales s
  WHERE s.organization_id = NEW.organization_id
    AND s.status = 'completed'
    AND COALESCE(s.completed_at, s.created_at) >= v_start
    AND COALESCE(s.completed_at, s.created_at) < v_end
    AND (TG_OP = 'INSERT' OR s.id IS DISTINCT FROM NEW.id);

  IF cnt >= lim THEN
    RAISE EXCEPTION 'Plan limit reached for salesTransactions.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sales_enforce_monthly_completed_sales_limit ON public.sales;

CREATE TRIGGER sales_enforce_monthly_completed_sales_limit
  BEFORE INSERT OR UPDATE OF status, completed_at ON public.sales
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_monthly_completed_sales_limit();

CREATE INDEX IF NOT EXISTS sales_org_completed_coalesce_month_idx
  ON public.sales (organization_id, (COALESCE(completed_at, created_at)))
  WHERE status = 'completed';
