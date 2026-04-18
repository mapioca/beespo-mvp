-- Add indexes for meetings/agendas page performance
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_plan_date ON meetings(workspace_id, plan_type, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_recipient_status ON meeting_shares(recipient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_shared_by_status ON meeting_shares(shared_by, status);
