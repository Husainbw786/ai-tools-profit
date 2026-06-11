
DROP POLICY IF EXISTS "Users select own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users delete own contacts" ON public.contacts;

CREATE POLICY "Users select own contacts" ON public.contacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.contacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
