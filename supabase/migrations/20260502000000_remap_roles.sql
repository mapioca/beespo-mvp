-- Role remap: admin → owner, leader → editor, guest → viewer
-- Introduces two new roles (admin, commenter) for future assignment.
-- Final role set: owner, admin, editor, commenter, viewer.
--
-- Permission expansion rules applied to existing RLS policies and functions:
--   • Old `= 'admin'`        → new `IN ('owner','admin')`         (manage tier)
--   • Old `IN ('admin','leader')` (or reversed) → new `IN ('owner','admin','editor')`  (edit tier)
--   • Old `'leader'`         → new `'editor'`                     (already absorbed above where paired with admin)
--   • Old `'guest'`          → new `'viewer'`
--
-- Order matters: expansion patterns run BEFORE the leader→editor / admin standalone substitutions
-- so we can pattern-match the original form.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Drop CHECK constraints so the data UPDATE can succeed.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles               DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.workspace_invitations  DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;

-- ---------------------------------------------------------------------------
-- 2. Rewrite RLS policy expressions.
--    For every policy whose qual/with_check references 'leader' or 'guest',
--    drop and recreate it with the substituted expression.
-- ---------------------------------------------------------------------------
DO $rls$
DECLARE
    pol record;
    new_qual text;
    new_check text;
    sql text;
    cmd_clause text;
BEGIN
    FOR pol IN
        SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual IS NOT NULL AND (qual LIKE '%''leader''%' OR qual LIKE '%''guest''%')
               OR with_check IS NOT NULL AND (with_check LIKE '%''leader''%' OR with_check LIKE '%''guest''%'))
    LOOP
        new_qual  := pol.qual;
        new_check := pol.with_check;

        -- Step A: expand admin+leader pairs to owner+admin+editor (keep 'leader' for now;
        -- it gets renamed to 'editor' in step C).
        FOR i IN 1..2 LOOP
            new_qual  := regexp_replace(new_qual,  E'ARRAY\\[\\s*''admin''::text\\s*,\\s*''leader''::text\\s*\\]', E'ARRAY[''owner''::text, ''admin''::text, ''leader''::text]', 'g');
            new_qual  := regexp_replace(new_qual,  E'ARRAY\\[\\s*''leader''::text\\s*,\\s*''admin''::text\\s*\\]', E'ARRAY[''owner''::text, ''admin''::text, ''leader''::text]', 'g');
            new_qual  := regexp_replace(new_qual,  E'ARRAY\\[\\s*''admin''\\s*,\\s*''leader''\\s*\\]',             E'ARRAY[''owner'', ''admin'', ''leader'']', 'g');
            new_qual  := regexp_replace(new_qual,  E'ARRAY\\[\\s*''leader''\\s*,\\s*''admin''\\s*\\]',             E'ARRAY[''owner'', ''admin'', ''leader'']', 'g');
            new_check := regexp_replace(new_check, E'ARRAY\\[\\s*''admin''::text\\s*,\\s*''leader''::text\\s*\\]', E'ARRAY[''owner''::text, ''admin''::text, ''leader''::text]', 'g');
            new_check := regexp_replace(new_check, E'ARRAY\\[\\s*''leader''::text\\s*,\\s*''admin''::text\\s*\\]', E'ARRAY[''owner''::text, ''admin''::text, ''leader''::text]', 'g');
            new_check := regexp_replace(new_check, E'ARRAY\\[\\s*''admin''\\s*,\\s*''leader''\\s*\\]',             E'ARRAY[''owner'', ''admin'', ''leader'']', 'g');
            new_check := regexp_replace(new_check, E'ARRAY\\[\\s*''leader''\\s*,\\s*''admin''\\s*\\]',             E'ARRAY[''owner'', ''admin'', ''leader'']', 'g');
        END LOOP;

        -- Step B: standalone `= 'admin'::text` (manage tier) becomes `= ANY (ARRAY['owner'::text, 'admin'::text])`.
        --   Anchored on `=` so we don't touch admin literals already inside the expanded ARRAY[...].
        new_qual  := regexp_replace(new_qual,  E'=\\s*''admin''::text',  E'= ANY (ARRAY[''owner''::text, ''admin''::text])',  'g');
        new_check := regexp_replace(new_check, E'=\\s*''admin''::text',  E'= ANY (ARRAY[''owner''::text, ''admin''::text])',  'g');

        -- Step C: leader → editor, guest → viewer everywhere remaining.
        new_qual  := replace(new_qual,  '''leader''', '''editor''');
        new_qual  := replace(new_qual,  '''guest''',  '''viewer''');
        new_check := replace(new_check, '''leader''', '''editor''');
        new_check := replace(new_check, '''guest''',  '''viewer''');

        EXECUTE format('DROP POLICY %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);

        cmd_clause := CASE pol.cmd
            WHEN 'SELECT' THEN 'FOR SELECT'
            WHEN 'INSERT' THEN 'FOR INSERT'
            WHEN 'UPDATE' THEN 'FOR UPDATE'
            WHEN 'DELETE' THEN 'FOR DELETE'
            ELSE 'FOR ALL'
        END;

        sql := format('CREATE POLICY %I ON %I.%I AS %s %s TO %s',
            pol.policyname,
            pol.schemaname,
            pol.tablename,
            CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
            cmd_clause,
            array_to_string(pol.roles, ', ')
        );
        IF new_qual IS NOT NULL THEN
            sql := sql || format(' USING (%s)', new_qual);
        END IF;
        IF new_check IS NOT NULL THEN
            sql := sql || format(' WITH CHECK (%s)', new_check);
        END IF;
        EXECUTE sql;
    END LOOP;
END;
$rls$;

-- Also handle policies whose ONLY old-role reference is the standalone `= 'admin'::text`
-- (no 'leader'/'guest' literals — the loop above didn't pick them up).
DO $rls2$
DECLARE
    pol record;
    new_qual text;
    new_check text;
    sql text;
    cmd_clause text;
BEGIN
    FOR pol IN
        SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual LIKE '%= ''admin''::text%' OR with_check LIKE '%= ''admin''::text%')
    LOOP
        new_qual  := regexp_replace(pol.qual,       E'=\\s*''admin''::text', E'= ANY (ARRAY[''owner''::text, ''admin''::text])', 'g');
        new_check := regexp_replace(pol.with_check, E'=\\s*''admin''::text', E'= ANY (ARRAY[''owner''::text, ''admin''::text])', 'g');

        EXECUTE format('DROP POLICY %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);

        cmd_clause := CASE pol.cmd
            WHEN 'SELECT' THEN 'FOR SELECT'
            WHEN 'INSERT' THEN 'FOR INSERT'
            WHEN 'UPDATE' THEN 'FOR UPDATE'
            WHEN 'DELETE' THEN 'FOR DELETE'
            ELSE 'FOR ALL'
        END;

        sql := format('CREATE POLICY %I ON %I.%I AS %s %s TO %s',
            pol.policyname,
            pol.schemaname,
            pol.tablename,
            CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
            cmd_clause,
            array_to_string(pol.roles, ', ')
        );
        IF new_qual IS NOT NULL THEN
            sql := sql || format(' USING (%s)', new_qual);
        END IF;
        IF new_check IS NOT NULL THEN
            sql := sql || format(' WITH CHECK (%s)', new_check);
        END IF;
        EXECUTE sql;
    END LOOP;
END;
$rls2$;

-- ---------------------------------------------------------------------------
-- 3. Rewrite functions whose bodies hardcode the old role names.
--    Uses pg_get_functiondef + the same expansion+rename rules as policies,
--    plus PL/pgSQL-specific patterns (IN ('admin','leader'), no ::text).
-- ---------------------------------------------------------------------------
DO $fns$
DECLARE
    fn record;
    def text;
BEGIN
    FOR fn IN
        SELECT p.oid, pg_get_functiondef(p.oid) AS def
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.prosrc LIKE '%''leader''%' OR p.prosrc LIKE '%''guest''%' OR p.prosrc LIKE '%= ''admin''%')
    LOOP
        def := fn.def;

        -- Step A: expand admin+leader pairs (both ::text and bare PL/pgSQL forms)
        def := regexp_replace(def, E'ARRAY\\[\\s*''admin''::text\\s*,\\s*''leader''::text\\s*\\]', E'ARRAY[''owner''::text, ''admin''::text, ''leader''::text]', 'g');
        def := regexp_replace(def, E'ARRAY\\[\\s*''leader''::text\\s*,\\s*''admin''::text\\s*\\]', E'ARRAY[''owner''::text, ''admin''::text, ''leader''::text]', 'g');
        def := regexp_replace(def, E'ARRAY\\[\\s*''admin''\\s*,\\s*''leader''\\s*\\]',             E'ARRAY[''owner'', ''admin'', ''leader'']', 'g');
        def := regexp_replace(def, E'ARRAY\\[\\s*''leader''\\s*,\\s*''admin''\\s*\\]',             E'ARRAY[''owner'', ''admin'', ''leader'']', 'g');
        def := regexp_replace(def, E'\\(\\s*''admin''\\s*,\\s*''leader''\\s*\\)',                  E'(''owner'', ''admin'', ''leader'')', 'g');
        def := regexp_replace(def, E'\\(\\s*''leader''\\s*,\\s*''admin''\\s*\\)',                  E'(''owner'', ''admin'', ''leader'')', 'g');

        -- Step B: standalone `= 'admin'::text` → expand to manage tier.
        -- (Bare `= 'admin'` without ::text does not appear in any existing function body in this repo;
        --  if one is added later, add a separate regex here.)
        def := regexp_replace(def, E'=\\s*''admin''::text',                        E'= ANY (ARRAY[''owner''::text, ''admin''::text])', 'g');

        -- Step C: leader → editor, guest → viewer
        def := replace(def, '''leader''', '''editor''');
        def := replace(def, '''guest''',  '''viewer''');

        IF def <> fn.def THEN
            EXECUTE def;
        END IF;
    END LOOP;
END;
$fns$;

-- ---------------------------------------------------------------------------
-- 4. Remap data in profiles + workspace_invitations.
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET role = CASE role
    WHEN 'admin'  THEN 'owner'
    WHEN 'leader' THEN 'editor'
    WHEN 'guest'  THEN 'viewer'
    ELSE role
END
WHERE role IN ('admin', 'leader', 'guest');

-- Pending invitations: original 'admin' becomes 'editor' (owner is not invitable;
-- the only path to owner is ownership transfer of an existing member).
UPDATE public.workspace_invitations
SET role = CASE role
    WHEN 'admin'  THEN 'editor'
    WHEN 'leader' THEN 'editor'
    WHEN 'guest'  THEN 'viewer'
    ELSE role
END
WHERE role IN ('admin', 'leader', 'guest');

-- ---------------------------------------------------------------------------
-- 5. Add new CHECK constraints (5 roles for profiles, 4 invitable for invitations).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('owner', 'admin', 'editor', 'commenter', 'viewer'));

ALTER TABLE public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_role_check
    CHECK (role IN ('admin', 'editor', 'commenter', 'viewer'));

-- ---------------------------------------------------------------------------
-- 6. Enforce one Owner per workspace.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_owner_per_workspace
    ON public.profiles (workspace_id)
    WHERE role = 'owner' AND is_deleted = false AND workspace_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Atomic ownership transfer RPC.
--    The partial unique index forbids two owners in a workspace, so the swap
--    must happen inside a single statement-visible transaction with the
--    intermediate state never observable. We do it by setting the current
--    owner to 'admin' first, then promoting the new owner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(p_new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_workspace_id uuid;
    v_new_owner_workspace_id uuid;
    v_caller_role text;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT workspace_id, role INTO v_workspace_id, v_caller_role
    FROM public.profiles WHERE id = v_caller_id;

    IF v_caller_role <> 'owner' THEN
        RAISE EXCEPTION 'Only the workspace owner can transfer ownership';
    END IF;

    IF p_new_owner = v_caller_id THEN
        RAISE EXCEPTION 'You already own this workspace';
    END IF;

    SELECT workspace_id INTO v_new_owner_workspace_id
    FROM public.profiles WHERE id = p_new_owner;

    IF v_new_owner_workspace_id IS NULL OR v_new_owner_workspace_id <> v_workspace_id THEN
        RAISE EXCEPTION 'Target user is not a member of this workspace';
    END IF;

    -- Demote current owner to admin first to free the partial unique index slot.
    UPDATE public.profiles SET role = 'admin' WHERE id = v_caller_id;
    UPDATE public.profiles SET role = 'owner' WHERE id = p_new_owner;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(uuid) TO authenticated;

COMMIT;
