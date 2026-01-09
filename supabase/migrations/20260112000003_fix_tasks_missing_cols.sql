-- Migration: Fix missing columns in tasks table
-- Description: Adds business_item_id, access_token, and completed_at if they are missing

-- Safely add columns
DO $$
BEGIN
    -- Add business_item_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'business_item_id') THEN
        ALTER TABLE tasks ADD COLUMN business_item_id UUID REFERENCES business_items(id) ON DELETE SET NULL;
    END IF;

    -- Add access_token
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'access_token') THEN
        ALTER TABLE tasks ADD COLUMN access_token UUID DEFAULT uuid_generate_v4();
        CREATE INDEX idx_tasks_access_token ON tasks(access_token);
    END IF;

    -- Add completed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMPTZ;
        CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
    END IF;
END $$;
