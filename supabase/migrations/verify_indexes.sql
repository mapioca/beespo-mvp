-- Verification Script: Check Performance Indexes
-- Run this in Supabase SQL Editor to verify all indexes were created

-- List all indexes we just created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%_created%'
   OR indexname LIKE 'idx_%_workspace_%'
   OR indexname LIKE 'idx_task_label%'
   OR indexname LIKE 'idx_task_comments%'
   OR indexname LIKE 'idx_profiles_workspace_role'
ORDER BY tablename, indexname;

-- Should return approximately 20-25 indexes
-- If you see indexes like:
-- - idx_tasks_created_at
-- - idx_tasks_workspace_created
-- - idx_announcements_created_at
-- - idx_discussions_workspace_created
-- etc., then the migration was successful!

-- Also check index sizes to see they're being used
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND (
    indexrelname LIKE 'idx_%_created%'
    OR indexrelname LIKE 'idx_%_workspace_%'
)
ORDER BY pg_relation_size(indexrelid) DESC;
