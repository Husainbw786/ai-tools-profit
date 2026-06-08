
-- Role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'editor', 'viewer');

-- Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'My Shared Space',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Invites pending until invitee logs in
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

-- Links
CREATE TABLE public.workspace_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_links_ws ON public.workspace_links(workspace_id);
CREATE INDEX idx_workspace_invites_email ON public.workspace_invites(lower(email));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_links TO authenticated;
GRANT ALL ON public.workspaces, public.workspace_members, public.workspace_invites, public.workspace_links TO service_role;

-- RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_links ENABLE ROW LEVEL SECURITY;

-- Helper: is _user a member of _ws with at least _min_role
CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws uuid, _user uuid, _min_role public.workspace_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _ws AND user_id = _user
      AND CASE _min_role
        WHEN 'viewer' THEN role IN ('viewer','editor','owner')
        WHEN 'editor' THEN role IN ('editor','owner')
        WHEN 'owner'  THEN role = 'owner'
      END
  );
$$;

-- workspaces policies
CREATE POLICY "members can read workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid(), 'viewer'));

CREATE POLICY "user can create own workspace" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner can update workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner can delete workspace" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- workspace_members policies
CREATE POLICY "members can read members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'viewer'));

-- allow self-insert (used by ensureMyWorkspace owner row, and claim invites uses service-side via security-definer fn)
CREATE POLICY "self insert own membership" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner can manage members" ON public.workspace_members
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'owner'))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'owner'));

-- workspace_invites: only owner of workspace
CREATE POLICY "owner manages invites" ON public.workspace_invites
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'owner'))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'owner'));

-- workspace_links
CREATE POLICY "members can read links" ON public.workspace_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "editors can insert links" ON public.workspace_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'editor') AND created_by = auth.uid());

CREATE POLICY "editors can update links" ON public.workspace_links
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'editor'))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "editors can delete links" ON public.workspace_links
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'editor'));

-- updated_at triggers
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_workspace_links_updated BEFORE UPDATE ON public.workspace_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
