
DROP POLICY IF EXISTS "self insert own membership" ON public.workspace_members;

CREATE POLICY "invitee can read own invite" ON public.workspace_invites
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));
