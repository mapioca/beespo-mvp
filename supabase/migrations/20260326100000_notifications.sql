-- Notification system: notifications + user preferences
-- ======================================================

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    type        text NOT NULL,        -- e.g. 'meeting_shared', 'meeting_starting_soon'
    title       text NOT NULL,
    body        text,
    metadata    jsonb DEFAULT '{}'::jsonb,  -- { meeting_id, shared_by, ... }
    read_at         timestamptz,
    digest_sent_at  timestamptz,
    created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_notifications_user_unread
    ON public.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

-- Notifications are created by server (service role), but allow insert for
-- authenticated users so server actions work with the user's session too
CREATE POLICY "Authenticated users can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());


-- 2. Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    notification_type   text NOT NULL,       -- e.g. 'meeting_shared', 'meeting_starting_soon'
    in_app_enabled      boolean DEFAULT true NOT NULL,
    email_enabled       boolean DEFAULT true NOT NULL,
    email_frequency     text DEFAULT 'immediate' NOT NULL
                        CHECK (email_frequency IN ('immediate', 'daily_digest', 'weekly_digest', 'never')),
    created_at          timestamptz DEFAULT now() NOT NULL,
    updated_at          timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user
    ON public.notification_preferences (user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can create own notification preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own preferences (reset to defaults)
CREATE POLICY "Users can delete own notification preferences"
    ON public.notification_preferences FOR DELETE
    USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Enable Supabase Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
