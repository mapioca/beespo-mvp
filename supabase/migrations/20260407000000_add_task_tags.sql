-- Add tags column to tasks table to support a list of strings
ALTER TABLE tasks ADD COLUMN tags TEXT[] DEFAULT '{}'::TEXT[];
