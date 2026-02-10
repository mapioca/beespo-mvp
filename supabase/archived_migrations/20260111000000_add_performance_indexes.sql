-- Migration: Add Performance Indexes for Production Readiness
-- This migration adds critical indexes for queries that ORDER BY created_at
-- and composite indexes for workspace_id + created_at filtering

-- ============================================================================
-- CREATED_AT INDEXES (for ORDER BY queries)
-- ============================================================================

-- Tasks table - ordered by created_at in all list views
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Announcements table - ordered by created_at
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Discussions table - ordered by created_at
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);

-- Business items table - ordered by created_at
CREATE INDEX IF NOT EXISTS idx_business_items_created_at ON business_items(created_at DESC);

-- Meetings table - ordered by created_at (already has scheduled_date index)
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);

-- Templates table - ordered by created_at
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Speakers table - ordered by created_at
CREATE INDEX IF NOT EXISTS idx_speakers_created_at ON speakers(created_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES (for workspace filtering + sorting)
-- ============================================================================
-- These indexes optimize queries that filter by workspace_id AND sort by created_at
-- Example: SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at DESC

-- Tasks composite index
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_created 
ON tasks(workspace_id, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Announcements composite index
CREATE INDEX IF NOT EXISTS idx_announcements_workspace_created 
ON announcements(workspace_id, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Discussions composite index
CREATE INDEX IF NOT EXISTS idx_discussions_workspace_created 
ON discussions(workspace_id, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Business items composite index
CREATE INDEX IF NOT EXISTS idx_business_items_workspace_created 
ON business_items(workspace_id, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Meetings composite index
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_created 
ON meetings(workspace_id, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Templates composite index
CREATE INDEX IF NOT EXISTS idx_templates_workspace_created 
ON templates(workspace_id, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- ADDITIONAL USEFUL INDEXES
-- ============================================================================

-- Tasks: Filter by status + workspace + sort by created_at
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_created 
ON tasks(workspace_id, status, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Tasks: Filter by assigned user + sort by created_at
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_created 
ON tasks(assigned_to, created_at DESC) 
WHERE assigned_to IS NOT NULL;

-- Discussions: Filter by status + workspace + sort by created_at
CREATE INDEX IF NOT EXISTS idx_discussions_workspace_status_created 
ON discussions(workspace_id, status, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Announcements: Filter by status + workspace + sort by created_at
CREATE INDEX IF NOT EXISTS idx_announcements_workspace_status_created 
ON announcements(workspace_id, status, created_at DESC) 
WHERE workspace_id IS NOT NULL;

-- Task labels for join queries
CREATE INDEX IF NOT EXISTS idx_task_label_assignments_task 
ON task_label_assignments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_label_assignments_label 
ON task_label_assignments(label_id);

-- Comments for counting
CREATE INDEX IF NOT EXISTS idx_task_comments_task 
ON task_comments(task_id);

-- ============================================================================
-- PROFILE OPTIMIZATION
-- ============================================================================

-- Optimize workspace member lookups
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_role 
ON profiles(workspace_id, role) 
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================

ANALYZE tasks;
ANALYZE announcements;
ANALYZE discussions;
ANALYZE business_items;
ANALYZE meetings;
ANALYZE templates;
ANALYZE speakers;
ANALYZE profiles;
ANALYZE task_label_assignments;
ANALYZE task_comments;

-- Add comments for documentation
COMMENT ON INDEX idx_tasks_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';
COMMENT ON INDEX idx_announcements_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';
COMMENT ON INDEX idx_discussions_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';
COMMENT ON INDEX idx_business_items_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';
