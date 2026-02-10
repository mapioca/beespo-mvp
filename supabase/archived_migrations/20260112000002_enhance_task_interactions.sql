-- Migration: Add task_comments and task_activities
-- Description: Enable commenting and activity tracking on tasks

-- 1. Task Comments (If not exists)
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Task Activities
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL, -- 'status_change', 'comment', 'assignment', 'creation'
    details JSONB, -- Store old/new values or extra metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Comments Policies
CREATE POLICY "View comments" ON task_comments FOR SELECT
    USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "create comments" ON task_comments FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- Activities Policies
CREATE POLICY "View activities" ON task_activities FOR SELECT
    USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_activities.task_id AND tasks.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "create activities" ON task_activities FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_activities.task_id AND tasks.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));
