-- Seed pre-built shared meeting templates for common LDS meetings

-- Insert shared templates
INSERT INTO templates (id, name, description, calling_type, is_shared, organization_id, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bishopric Meeting', 'Standard bishopric meeting agenda', 'bishopric', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000002', 'Ward Council', 'Standard ward council meeting agenda', 'ward_council', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000003', 'Relief Society Presidency Meeting', 'Standard RS presidency meeting agenda', 'rs_presidency', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000004', 'Elders Quorum Presidency Meeting', 'Standard EQ presidency meeting agenda', 'elders_quorum', true, NULL, NULL);

-- Bishopric Meeting Template Items
INSERT INTO template_items (template_id, title, description, order_index, duration_minutes)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Opening Prayer', 'Invocation', 0, 2),
  ('00000000-0000-0000-0000-000000000001', 'Calendar Review', 'Review upcoming ward events and assignments', 1, 10),
  ('00000000-0000-0000-0000-000000000001', 'Member Needs', 'Discuss members needing ministering or support', 2, 20),
  ('00000000-0000-0000-0000-000000000001', 'Temple Recommends', 'Schedule and conduct recommend interviews', 3, 15),
  ('00000000-0000-0000-0000-000000000001', 'Youth', 'Discuss youth activities and needs', 4, 10),
  ('00000000-0000-0000-0000-000000000001', 'Financial Matters', 'Review budget and financial requests', 5, 10),
  ('00000000-0000-0000-0000-000000000001', 'Assignments', 'Review and make assignments', 6, 5),
  ('00000000-0000-0000-0000-000000000001', 'Closing Prayer', 'Benediction', 7, 2);

-- Ward Council Template Items
INSERT INTO template_items (template_id, title, description, order_index, duration_minutes)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Opening Prayer', 'Invocation', 0, 2),
  ('00000000-0000-0000-0000-000000000002', 'Calendar', 'Review upcoming ward activities', 1, 5),
  ('00000000-0000-0000-0000-000000000002', 'Ministering', 'Discuss ministering efforts and needs', 2, 15),
  ('00000000-0000-0000-0000-000000000002', 'Member Progress', 'Review recent converts, youth, and less-active members', 3, 15),
  ('00000000-0000-0000-0000-000000000002', 'Temple and Family History', 'Discuss temple attendance and family history work', 4, 10),
  ('00000000-0000-0000-0000-000000000002', 'Missionary Work', 'Review missionary efforts and referrals', 5, 10),
  ('00000000-0000-0000-0000-000000000002', 'Self-Reliance', 'Discuss temporal welfare and self-reliance', 6, 10),
  ('00000000-0000-0000-0000-000000000002', 'Council Together', 'Open discussion of ward needs', 7, 15),
  ('00000000-0000-0000-0000-000000000002', 'Closing Prayer', 'Benediction', 8, 2);

-- Relief Society Presidency Template Items
INSERT INTO template_items (template_id, title, description, order_index, duration_minutes)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'Opening Prayer', 'Invocation', 0, 2),
  ('00000000-0000-0000-0000-000000000003', 'Upcoming Lessons and Activities', 'Plan and coordinate upcoming events', 1, 15),
  ('00000000-0000-0000-0000-000000000003', 'Ministering', 'Review ministering assignments and needs', 2, 15),
  ('00000000-0000-0000-0000-000000000003', 'Sister Needs', 'Discuss individual sisters needing support', 3, 20),
  ('00000000-0000-0000-0000-000000000003', 'Temple and Family History', 'Coordinate temple trips and family history work', 4, 10),
  ('00000000-0000-0000-0000-000000000003', 'Assignments', 'Review and make assignments', 5, 5),
  ('00000000-0000-0000-0000-000000000003', 'Closing Prayer', 'Benediction', 6, 2);

-- Elders Quorum Presidency Template Items
INSERT INTO template_items (template_id, title, description, order_index, duration_minutes)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'Opening Prayer', 'Invocation', 0, 2),
  ('00000000-0000-0000-0000-000000000004', 'Upcoming Lessons and Activities', 'Plan and coordinate upcoming events', 1, 15),
  ('00000000-0000-0000-0000-000000000004', 'Ministering', 'Review ministering assignments and needs', 2, 15),
  ('00000000-0000-0000-0000-000000000004', 'Brother Needs', 'Discuss individual brethren needing support', 3, 20),
  ('00000000-0000-0000-0000-000000000004', 'Temple and Family History', 'Coordinate temple trips and family history work', 4, 10),
  ('00000000-0000-0000-0000-000000000004', 'Missionary Work', 'Discuss missionary opportunities and efforts', 5, 10),
  ('00000000-0000-0000-0000-000000000004', 'Assignments', 'Review and make assignments', 6, 5),
  ('00000000-0000-0000-0000-000000000004', 'Closing Prayer', 'Benediction', 7, 2);
