
CREATE OR REPLACE FUNCTION public.admin_list_tables()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  udt_name text,
  is_nullable text,
  column_default text,
  ordinal_position int,
  is_identity text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.udt_name::text,
    c.is_nullable::text,
    c.column_default::text,
    c.ordinal_position::int,
    c.is_identity::text
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY c.table_name, c.ordinal_position;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_tables() TO authenticated;
