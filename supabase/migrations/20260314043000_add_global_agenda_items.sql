-- Migration to add expanded global agenda items and clean up unused schema

-- 1. Drop the dependent policy first
DROP POLICY IF EXISTS "Users can read procedural_item_types" ON public.procedural_item_types;

-- 2. Drop unused 'is_core' column from procedural_item_types
ALTER TABLE public.procedural_item_types DROP COLUMN IF EXISTS is_core;

-- 3. Recreate the policy without 'is_core'
CREATE POLICY "Users can read procedural_item_types" ON public.procedural_item_types 
  FOR SELECT TO authenticated 
  USING (
    (workspace_id IS NULL) OR 
    (workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()))
  );

-- 4. Insert new global items
INSERT INTO public.procedural_item_types 
  (id, name, description, default_duration_minutes, order_hint, is_custom, is_hymn, workspace_id, requires_assignee, requires_resource, has_rich_text, icon)
VALUES 
  ('global_sacrament', 'Sacrament Administration', 'The administration and distribution of the sacrament', 10, 15, false, false, NULL, false, false, true, 'Droplets'),
  ('global_testimonies', 'Bearing of Testimonies', 'Open time for members of the congregation to bear their testimonies', 30, 25, false, false, NULL, false, false, true, 'MessageCircleHeart'),
  ('global_musical_number', 'Special Musical Number', 'A musical presentation by a choir, family, or individual', 5, 25, false, false, NULL, true, true, true, 'Music'),
  ('global_ordinance', 'Ordinance or Blessing', 'Baby blessings, confirmations, or other priesthood ordinances', 5, 10, false, false, NULL, true, false, true, 'HandHeart'),
  ('global_recognition', 'Recognition / Award', 'Presenting an award, certificate, or recognition to a member', 5, 10, false, false, NULL, true, false, true, 'Award'),
  ('global_video', 'Video Presentation', 'A video message or presentation shown to the congregation', 10, 30, false, false, NULL, false, false, true, 'Video'),
  ('global_training', 'Training / Instruction', 'Specialized training or instruction delivered by a leader', 15, 30, false, false, NULL, true, false, true, 'Presentation')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  order_hint = EXCLUDED.order_hint,
  requires_assignee = EXCLUDED.requires_assignee,
  requires_resource = EXCLUDED.requires_resource,
  has_rich_text = EXCLUDED.has_rich_text,
  icon = EXCLUDED.icon;
