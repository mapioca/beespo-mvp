-- Fix ambiguous column reference in create_platform_invitation function

CREATE OR REPLACE FUNCTION create_platform_invitation(
  p_max_uses INTEGER DEFAULT 1,
  p_description TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_new_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_attempts INTEGER := 0;
BEGIN
  -- Verify caller is sys_admin (qualify column with table name to avoid ambiguity)
  IF (SELECT profiles.is_sys_admin FROM profiles WHERE profiles.id = auth.uid()) != true THEN
    RAISE EXCEPTION 'Only system administrators can create invite codes';
  END IF;

  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;

  -- Generate unique code with retry
  LOOP
    v_code := generate_invite_code();
    v_attempts := v_attempts + 1;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM platform_invitations WHERE platform_invitations.code = v_code) THEN
      EXIT;
    END IF;
    
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Unable to generate unique code after 10 attempts';
    END IF;
  END LOOP;

  -- Insert the new invitation
  INSERT INTO platform_invitations (code, description, max_uses, expires_at, created_by)
  VALUES (v_code, p_description, p_max_uses, v_expires_at, auth.uid())
  RETURNING platform_invitations.id INTO v_new_id;

  RETURN QUERY 
  SELECT v_new_id, v_code, p_max_uses, v_expires_at;
END;
$$;
