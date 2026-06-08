## Goal

Add a new **Links** page where each user has their own shared workspace. They can invite collaborators by email (viewer / editor / owner) to add and manage links together — completely isolated from sales/hisab data.

## What gets built

### 1. New page: `/links`
- Nav entry "Links" in `AppLayout` bottom tabs.
- Two sections:
  - **My Workspace** — the workspace owned by the current user. Lists links with title, URL, optional note, "added by" badge.
  - **Shared with me** — workspaces other users have invited me to, each opens its own view.
- Add / edit / delete link dialog (title, URL, note) — gated by role.
- Members panel (visible to owner + admins): invite by email, list members with role chips, change role, remove member.

### 2. Database (new tables — isolated from `sales`)
- `workspaces` — one per owner (`owner_id` unique).
- `workspace_members` — `(workspace_id, user_id, role)` where role is `owner | editor | viewer`. Owner row auto-created.
- `workspace_invites` — pending invites by `email` (lowercased) + role, consumed on first login by that email.
- `workspace_links` — `workspace_id`, `title`, `url`, `note`, `created_by`.

### 3. Access rules (RLS)
- All four tables: only members of a workspace can read it. Editors/owners can write links. Only owner can manage members & invites.
- Sales table is **untouched** — brother literally cannot query it.
- A `SECURITY DEFINER` helper `is_workspace_member(_ws uuid, _user uuid, _min_role)` to keep policies recursion-free.
- Auto-create the user's own workspace + owner membership on first visit (via a server fn `ensureMyWorkspace`).
- Auto-consume matching `workspace_invites` for the signed-in user's email on login (server fn `claimPendingInvites`, called from the `/links` loader).

### 4. Server functions (`src/lib/workspace.functions.ts`)
- `getMyWorkspaceData` → owner workspace + links + members.
- `getSharedWorkspaces` → list of workspaces I'm a member of (not owner).
- `getWorkspaceDetail(id)` → links + members for a workspace I belong to.
- `addLink / updateLink / deleteLink` (role-gated).
- `inviteMember(email, role)` → upsert into `workspace_invites`, plus immediately add if that user already exists in `auth.users`.
- `updateMemberRole / removeMember` (owner only).
- `claimPendingInvites` (called for current user's email on `/links` load).

All use `requireSupabaseAuth`. Admin email lookups for invite-consumption use `supabaseAdmin` inside the handler.

### 5. UI components
- `src/routes/links.tsx` — main page with tabs ("My space" / "Shared with me") and workspace detail view.
- `src/components/LinkDialog.tsx` — add/edit link form.
- `src/components/MembersPanel.tsx` — invite input, member list with role dropdown.
- Reuse existing Navy Trust palette and Digital Tools typography.

### 6. Files touched
**New:** migration, `src/lib/workspace.functions.ts`, `src/routes/links.tsx`, `src/components/LinkDialog.tsx`, `src/components/MembersPanel.tsx`.
**Edited:** `src/components/AppLayout.tsx` (add nav entry).

## Out of scope
- Notes / checklists / file uploads (links only, per your choice).
- Email notifications for invites (works silently — invitee sees the workspace when they next open Links).
- Sales/hisab data stays 100% private. No cross-table joins. No shared visibility.

## Notes
- Brother just needs to log in with the email you invited; access is granted automatically on first `/links` visit.
- Owner cannot be removed or demoted.
- After approval, the database migration will run first, then the code is generated against the regenerated types.
