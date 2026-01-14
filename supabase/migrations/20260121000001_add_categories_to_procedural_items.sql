-- Add categories to procedural items and create comprehensive LDS meeting agenda items
-- Date: 2026-01-21

-- Add category column to procedural_item_types
ALTER TABLE procedural_item_types
ADD COLUMN category TEXT DEFAULT 'other';

-- Create index for category filtering
CREATE INDEX idx_procedural_item_types_category ON procedural_item_types(category);

-- Update existing items with appropriate categories
UPDATE procedural_item_types SET category = 'worship' WHERE id = 'prayer';
UPDATE procedural_item_types SET category = 'worship' WHERE id = 'spiritual_thought';
UPDATE procedural_item_types SET category = 'worship' WHERE id = 'sacrament_distribution';
UPDATE procedural_item_types SET category = 'other' WHERE id = 'break';

-- =====================================================
-- ADD NEW PROCEDURAL ITEMS
-- =====================================================

-- ADMINISTRATIVE CATEGORY
INSERT INTO procedural_item_types (id, name, description, category, default_duration_minutes, order_hint) VALUES
  ('calendar_review', 'Calendar Review', 'Review upcoming ward events and activities', 'administrative', 5, 30),
  ('assignments_review', 'Assignments Review', 'Review and make new assignments', 'administrative', 5, 35),
  ('financial_review', 'Financial Review', 'Review financial matters (bishopric)', 'administrative', 10, 40),
  ('member_needs', 'Member Needs Discussion', 'Discuss member welfare and needs', 'administrative', 15, 45),
  ('ministering_report', 'Ministering Report', 'Report on ministering efforts', 'administrative', 10, 50),
  ('ward_business', 'Ward Business', 'General administrative business', 'administrative', 5, 55),
  ('opening_remarks', 'Opening Remarks', 'Leader opening comments', 'administrative', 3, 2),
  ('closing_remarks', 'Closing Remarks', 'Leader closing comments', 'administrative', 3, 98),
  ('introductions', 'Introductions & Welcome', 'Welcome visitors and new members', 'administrative', 3, 5);

-- WORSHIP CATEGORY (hymn slots - not individual hymns)
INSERT INTO procedural_item_types (id, name, description, category, default_duration_minutes, order_hint) VALUES
  ('opening_hymn', 'Opening Hymn', 'Hymn to open the meeting', 'worship', 3, 3),
  ('closing_hymn', 'Closing Hymn', 'Hymn to close the meeting', 'worship', 3, 97),
  ('sacrament_hymn', 'Sacrament Hymn', 'Hymn during sacrament preparation', 'worship', 3, 18);

-- MUSIC CATEGORY
INSERT INTO procedural_item_types (id, name, description, category, default_duration_minutes, order_hint) VALUES
  ('intermediate_hymn', 'Intermediate Hymn', 'Hymn between speakers or sections', 'music', 3, 30),
  ('special_musical_number', 'Special Musical Number', 'Solo or group musical performance', 'music', 4, 25),
  ('choir_performance', 'Choir Performance', 'Ward choir musical number', 'music', 5, 26),
  ('primary_songs', 'Primary Songs', 'Primary children singing', 'music', 5, 27),
  ('congregational_singing', 'Congregational Singing', 'Multiple hymns or singing time', 'music', 10, 28);

-- COUNCIL CATEGORY
INSERT INTO procedural_item_types (id, name, description, category, default_duration_minutes, order_hint) VALUES
  ('council_discussion', 'Council Discussion', 'Open council format discussion', 'council', 15, 60),
  ('member_welfare', 'Member Welfare Discussion', 'Discuss member welfare needs', 'council', 15, 61),
  ('temple_family_history', 'Temple and Family History', 'Temple and genealogy discussion', 'council', 10, 62),
  ('missionary_work', 'Missionary Work', 'Missionary efforts discussion', 'council', 10, 63),
  ('self_reliance', 'Self-Reliance Discussion', 'Self-reliance initiatives', 'council', 10, 64),
  ('youth_discussion', 'Youth Discussion', 'Youth-related items and needs', 'council', 10, 65);

-- TEACHING CATEGORY
INSERT INTO procedural_item_types (id, name, description, category, default_duration_minutes, order_hint) VALUES
  ('testimony', 'Testimony', 'Bearing of testimony', 'teaching', 3, 70),
  ('gospel_instruction', 'Gospel Instruction', 'Gospel teaching or lesson', 'teaching', 15, 71),
  ('sunday_school_lesson', 'Sunday School Lesson', 'Sunday School class instruction', 'teaching', 30, 72),
  ('youth_instruction', 'Youth Instruction', 'Youth-specific teaching', 'teaching', 15, 73),
  ('doctrine_discussion', 'Doctrine Discussion', 'Discussion of gospel doctrine', 'teaching', 15, 74);
