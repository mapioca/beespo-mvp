-- Migration: Update tasks table for enhanced functionality
-- Description: Adds discussion/business associations, security tokens, and completion tracking

-- 1. Add new columns to tasks table
ALTER TABLE tasks
ADD COLUMN discussion_id UUID REFERENCES discussions(id) ON DELETE SET NULL,
ADD COLUMN business_item_id UUID REFERENCES business_items(id) ON DELETE SET NULL,
ADD COLUMN access_token UUID DEFAULT uuid_generate_v4(),
ADD COLUMN completed_at TIMESTAMPTZ;

-- 2. Create index for access_token lookup (critical for public route performance)
CREATE INDEX idx_tasks_access_token ON tasks(access_token);

-- 3. Create index for completed_at
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
