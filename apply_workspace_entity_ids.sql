-- Quick fix: Apply the workspace_entity_ids migration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/tuekpooasofqfawmpdxj/sql

-- Add the column
ALTER TABLE discussions
ADD COLUMN IF NOT EXISTS workspace_discussion_id VARCHAR(20);

-- You can run the full migration later: supabase/migrations/20260110100000_add_workspace_entity_ids.sql
