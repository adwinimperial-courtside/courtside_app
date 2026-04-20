CREATE TABLE impersonation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App admins can insert impersonation logs"
  ON impersonation_log FOR INSERT
  WITH CHECK (
    (SELECT raw_user_meta_data->>'app_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
  );

CREATE POLICY "App admins can read impersonation logs"
  ON impersonation_log FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'app_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
  );

CREATE POLICY "App admins can update impersonation logs"
  ON impersonation_log FOR UPDATE
  USING (
    (SELECT raw_user_meta_data->>'app_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
  );
