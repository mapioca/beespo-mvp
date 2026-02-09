-- Manually insert invite codes for testing
-- These codes follow the standard format (BEE-XXXXXX) but are memorable for testing purposes.
-- They are set with generous usage limits (10 uses each) so you can test multiple signups.

INSERT INTO platform_invitations (
    code, 
    description, 
    max_uses, 
    status,
    created_by
)
VALUES 
    ('BEE-TEST01', 'Manual test code 1', 10, 'active', NULL),
    ('BEE-TEST02', 'Manual test code 2', 10, 'active', NULL),
    ('BEE-WELCOME1', 'Welcome code for manual testing', 50, 'active', NULL)
ON CONFLICT (code) DO NOTHING;

-- Verification query to see the created codes
SELECT code, max_uses, uses_count, status, expires_at 
FROM platform_invitations 
WHERE code IN ('BEE-TEST01', 'BEE-TEST02', 'BEE-WELCOME1');
