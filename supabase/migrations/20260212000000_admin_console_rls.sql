-- Admin Console RLS Policies
-- Grants sys_admin users cross-workspace access for platform management

-- Helper function to check if current user is a system admin
CREATE OR REPLACE FUNCTION public.is_sys_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_sys_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- =====================================================
-- Profiles: sys_admin can SELECT and UPDATE all profiles
-- =====================================================
CREATE POLICY "sys_admin_select_all_profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_sys_admin());

CREATE POLICY "sys_admin_update_all_profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_sys_admin())
  WITH CHECK (public.is_sys_admin());

-- =====================================================
-- Templates: sys_admin can manage all templates (global template CRUD)
-- =====================================================
CREATE POLICY "sys_admin_select_all_templates"
  ON public.templates
  FOR SELECT
  TO authenticated
  USING (public.is_sys_admin());

CREATE POLICY "sys_admin_insert_templates"
  ON public.templates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_sys_admin());

CREATE POLICY "sys_admin_update_templates"
  ON public.templates
  FOR UPDATE
  TO authenticated
  USING (public.is_sys_admin())
  WITH CHECK (public.is_sys_admin());

CREATE POLICY "sys_admin_delete_templates"
  ON public.templates
  FOR DELETE
  TO authenticated
  USING (public.is_sys_admin());

-- =====================================================
-- Template Items: sys_admin can manage items on global templates
-- =====================================================
CREATE POLICY "sys_admin_select_all_template_items"
  ON public.template_items
  FOR SELECT
  TO authenticated
  USING (public.is_sys_admin());

CREATE POLICY "sys_admin_insert_template_items"
  ON public.template_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_sys_admin());

CREATE POLICY "sys_admin_update_template_items"
  ON public.template_items
  FOR UPDATE
  TO authenticated
  USING (public.is_sys_admin())
  WITH CHECK (public.is_sys_admin());

CREATE POLICY "sys_admin_delete_template_items"
  ON public.template_items
  FOR DELETE
  TO authenticated
  USING (public.is_sys_admin());

-- =====================================================
-- Platform Invitations: sys_admin can manage all platform invitations
-- =====================================================
CREATE POLICY "sys_admin_select_platform_invitations"
  ON public.platform_invitations
  FOR SELECT
  TO authenticated
  USING (public.is_sys_admin());

CREATE POLICY "sys_admin_insert_platform_invitations"
  ON public.platform_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_sys_admin());

CREATE POLICY "sys_admin_update_platform_invitations"
  ON public.platform_invitations
  FOR UPDATE
  TO authenticated
  USING (public.is_sys_admin())
  WITH CHECK (public.is_sys_admin());
