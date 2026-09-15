import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Link2,
  Plus,
  Trash2,
  Pencil,
  Users,
  ExternalLink,
  Crown,
  UserPlus,
  X,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  getWorkspaceHub,
  getWorkspaceDetail,
  addLink,
  updateLink,
  deleteLink,
  inviteMember,
  updateMemberRole,
  removeMember,
  revokeInvite,
  type LinkDTO,
  listLedger,
  addLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  type LedgerEntryDTO,
  type LedgerKind,
  type MemberDTO,
} from "@/lib/workspace.functions";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Shared Links — ProfitAI" },
      { name: "description", content: "Private collaborative workspace for shared links." },
    ],
  }),
  component: LinksPage,
});

function LinksPage() {
  const hubFn = useServerFn(getWorkspaceHub);
  const { data: hub, isLoading } = useQuery({
    queryKey: ["workspace-hub"],
    queryFn: () => hubFn(),
  });

  const [activeWsId, setActiveWsId] = useState<string | null>(null);

  const currentId = activeWsId ?? hub?.myWorkspace.id ?? null;

  return (
    <AppLayout>
      <div className="mt-7 space-y-6">
        <div>
          <h1 className="text-title">Shared links</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Collaborate on links with people you invite. Your sales data stays private.
          </p>
        </div>

        {isLoading || !hub ? (
          <div className="py-[60px] text-center text-[14px] text-faint">Loading workspace…</div>
        ) : (
          <Tabs
            value={currentId === hub.myWorkspace.id ? "mine" : "shared"}
            onValueChange={(v) => {
              if (v === "mine") setActiveWsId(hub.myWorkspace.id);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mine">My Space</TabsTrigger>
              <TabsTrigger value="shared">
                Shared with me
                {hub.shared.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {hub.shared.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mine" className="mt-4">
              <WorkspaceView workspaceId={hub.myWorkspace.id} />
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {hub.shared.length === 0 ? (
                <div className="py-[60px] text-center text-[14px] text-faint">
                  No one has invited you yet. When they do, the space will show up here.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {hub.shared.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveWsId(s.id)}
                        className={`rounded-[14px] border p-4 text-left transition ${
                          activeWsId === s.id
                            ? "border-foreground"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <div className="text-[15px] font-bold">{s.name}</div>
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          You're a {s.role}
                        </div>
                      </button>
                    ))}
                  </div>
                  {activeWsId && activeWsId !== hub.myWorkspace.id && (
                    <div className="pt-2">
                      <WorkspaceView workspaceId={activeWsId} />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getWorkspaceDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => detailFn({ data: { workspaceId } }),
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LinkDTO | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);

  const addFn = useServerFn(addLink);
  const updFn = useServerFn(updateLink);
  const delFn = useServerFn(deleteLink);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });

  const saveMut = useMutation({
    mutationFn: async (input: { title: string; url: string; note: string }) => {
      if (editing) {
        return updFn({
          data: {
            id: editing.id,
            title: input.title,
            url: input.url,
            note: input.note || null,
          },
        });
      }
      return addFn({
        data: {
          workspaceId,
          title: input.title,
          url: input.url,
          note: input.note || null,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      setLinkDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Link updated" : "Link added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Link deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading || !data) {
    return <div className="py-[60px] text-center text-[14px] text-faint">Loading…</div>;
  }

  const canEdit = data.myRole === "owner" || data.myRole === "editor";
  const isOwner = data.myRole === "owner";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="text-section">{data.workspace.name}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {data.members.length} member{data.members.length === 1 ? "" : "s"} · you are{" "}
            {data.myRole}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
            <Users className="mr-1.5 size-4" /> Members
          </Button>
        </div>
      </div>

      <Tabs defaultValue="links">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="links">
            <Link2 className="mr-1.5 size-4" /> Links
          </TabsTrigger>
          <TabsTrigger value="ledger">
            <Scale className="mr-1.5 size-4" /> Ledger
          </TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4 space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setLinkDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add link
              </Button>
            </div>
          )}
          {data.links.length === 0 ? (
            <div className="py-[60px] text-center text-[14px] text-faint">
              <Link2 className="mx-auto mb-2 size-6 opacity-60" />
              No links yet. {canEdit && "Add one to get started."}
            </div>
          ) : (
            <div>
              {data.links.map((l) => (
                <div key={l.id} className="border-b border-hairline py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1.5 text-[15px] font-bold text-foreground hover:text-accent-text"
                      >
                        {l.title}
                        <ExternalLink className="size-3.5 opacity-60 group-hover:opacity-100" />
                      </a>
                      <div className="truncate text-[12px] text-muted-foreground">{l.url}</div>
                      {l.note && (
                        <div className="mt-1.5 text-[13px] text-muted-foreground">{l.note}</div>
                      )}
                      <div className="mt-2 text-[11px] font-semibold text-faint">
                        by {l.createdByEmail || "unknown"}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditing(l);
                            setLinkDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => {
                            if (confirm("Delete this link?")) delMut.mutate(l.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <LedgerPanel workspaceId={workspaceId} members={data.members} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={(v) => {
          setLinkDialogOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        saving={saveMut.isPending}
        onSave={(v) => saveMut.mutate(v)}
      />

      <MembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        workspaceId={workspaceId}
        members={data.members}
        invites={data.invites}
        isOwner={isOwner}
        onChanged={invalidate}
      />
    </div>
  );
}

function LinkDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: LinkDTO | null;
  saving: boolean;
  onSave: (v: { title: string; url: string; note: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");

  useMemo(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setUrl(initial?.url ?? "");
      setNote(initial?.note ?? "");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit link" : "Add link"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !url.trim() || saving}
            onClick={() => onSave({ title: title.trim(), url: url.trim(), note: note.trim() })}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersDialog({
  open,
  onOpenChange,
  workspaceId,
  members,
  invites,
  isOwner,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  members: { id: string; userId: string; email: string; role: "owner" | "editor" | "viewer" }[];
  invites: { id: string; email: string; role: "owner" | "editor" | "viewer" }[];
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  const inviteFn = useServerFn(inviteMember);
  const updRoleFn = useServerFn(updateMemberRole);
  const rmFn = useServerFn(removeMember);
  const revFn = useServerFn(revokeInvite);

  const inviteMut = useMutation({
    mutationFn: () => inviteFn({ data: { workspaceId, email: email.trim(), role } }),
    onSuccess: (res: any) => {
      onChanged();
      setEmail("");
      toast.success(res.status === "added" ? "Member added" : "Invite sent (joins on next login)");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Members</DialogTitle>
        </DialogHeader>

        {isOwner && (
          <div className="border-b border-border pb-4">
            <div className="mb-2 text-[12px] font-bold text-muted-foreground">Invite by email</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="brother@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => inviteMut.mutate()}
                disabled={!email.trim() || inviteMut.isPending}
              >
                <UserPlus className="mr-1.5 size-4" /> Invite
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[12px] font-bold text-muted-foreground">Members</div>
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border-b border-hairline py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-[14px] font-bold">
                  {m.role === "owner" && <Crown className="size-3.5 text-accent-text" />}
                  {m.email || m.userId.slice(0, 8)}
                </div>
              </div>
              {m.role === "owner" ? (
                <Badge variant="secondary">Owner</Badge>
              ) : isOwner ? (
                <div className="flex items-center gap-1">
                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      updRoleFn({ data: { memberId: m.id, role: v as any } }).then(() =>
                        onChanged(),
                      )
                    }
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${m.email}?`))
                        rmFn({ data: { memberId: m.id } }).then(() => onChanged());
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <Badge variant="outline">{m.role}</Badge>
              )}
            </div>
          ))}
        </div>

        {isOwner && invites.length > 0 && (
          <div className="space-y-2">
            <div className="text-[12px] font-bold text-muted-foreground">Pending invites</div>
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between border-b border-hairline py-2.5"
              >
                <div className="text-[14px]">
                  {i.email}
                  <span className="ml-2 text-[12px] text-muted-foreground">({i.role})</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => revFn({ data: { inviteId: i.id } }).then(() => onChanged())}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatRupees(cents: number) {
  const v = Math.abs(cents) / 100;
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function LedgerPanel({
  workspaceId,
  members,
  canEdit,
}: {
  workspaceId: string;
  members: MemberDTO[];
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLedger);
  const addFn = useServerFn(addLedgerEntry);
  const updFn = useServerFn(updateLedgerEntry);
  const delFn = useServerFn(deleteLedgerEntry);

  const queryKey = ["ledger", workspaceId] as const;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listFn({ data: { workspaceId } }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerEntryDTO | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const saveMut = useMutation({
    mutationFn: async (v: {
      amountCents: number;
      payerUserId: string;
      kind: LedgerKind;
      note: string;
      entryDate: string;
    }) => {
      if (editing) {
        return updFn({
          data: {
            id: editing.id,
            amountCents: v.amountCents,
            payerUserId: v.payerUserId,
            kind: v.kind,
            note: v.note || null,
            entryDate: v.entryDate,
          },
        });
      }
      return addFn({
        data: {
          workspaceId,
          amountCents: v.amountCents,
          payerUserId: v.payerUserId,
          kind: v.kind,
          note: v.note || null,
          entryDate: v.entryDate,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Entry updated" : "Entry added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading || !data) {
    return <div className="py-[60px] text-center text-[14px] text-faint">Loading ledger…</div>;
  }

  const viewerId = data.viewerUserId;
  const other = members.find((m) => m.userId !== viewerId);
  const otherLabel = other?.email?.split("@")[0] || "them";
  const net = data.netCents;

  const balanceLine =
    net === 0
      ? "All settled up"
      : net > 0
        ? `${otherLabel} owes you ₹${formatRupees(net)}`
        : `You owe ${otherLabel} ₹${formatRupees(net)}`;

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-5">
        <div className="text-[13px] font-semibold text-muted-foreground">Net balance</div>
        <div
          className={`mt-2 font-display text-[28px] font-medium leading-tight tracking-[-0.02em] ${
            net === 0 ? "" : net > 0 ? "text-success" : "text-destructive"
          }`}
        >
          {balanceLine}
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" /> Add entry
          </Button>
        </div>
      )}

      {data.entries.length === 0 ? (
        <div className="py-[60px] text-center text-[14px] text-faint">
          <Scale className="mx-auto mb-2 size-6 opacity-60" />
          No entries yet. {canEdit && "Add the first one."}
        </div>
      ) : (
        <div>
          {data.entries.map((e) => {
            const youPaid = e.payerUserId === viewerId;
            const payerName = youPaid ? "You" : e.payerEmail?.split("@")[0] || "them";
            const isSettle = e.kind === "settlement";
            return (
              <div key={e.id} className="border-b border-hairline py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isSettle ? (
                        <CheckCircle2 className="size-4 text-accent-text" />
                      ) : youPaid ? (
                        <ArrowUpRight className="size-4 text-success" />
                      ) : (
                        <ArrowDownLeft className="size-4 text-destructive" />
                      )}
                      <span className="text-[15px] font-bold">
                        {payerName} paid ₹{formatRupees(e.amountCents)}
                      </span>
                      {isSettle && (
                        <Badge variant="secondary" className="text-[10px]">
                          Settlement
                        </Badge>
                      )}
                    </div>
                    {e.note && (
                      <div className="mt-1.5 text-[13px] text-muted-foreground">{e.note}</div>
                    )}
                    <div className="mt-1.5 text-[11px] font-semibold text-faint">
                      {e.entryDate} · by {e.createdByEmail || "unknown"}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          setEditing(e);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => {
                          if (confirm("Delete this entry?")) delMut.mutate(e.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LedgerEntryDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        viewerId={viewerId}
        members={members}
        saving={saveMut.isPending}
        onSave={(v) => saveMut.mutate(v)}
      />
    </div>
  );
}

function LedgerEntryDialog({
  open,
  onOpenChange,
  initial,
  viewerId,
  members,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: LedgerEntryDTO | null;
  viewerId: string;
  members: MemberDTO[];
  saving: boolean;
  onSave: (v: {
    amountCents: number;
    payerUserId: string;
    kind: LedgerKind;
    note: string;
    entryDate: string;
  }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [payerUserId, setPayerUserId] = useState(viewerId);
  const [kind, setKind] = useState<LedgerKind>("entry");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(today);

  useMemo(() => {
    if (open) {
      setAmount(initial ? (initial.amountCents / 100).toString() : "");
      setPayerUserId(initial?.payerUserId ?? viewerId);
      setKind(initial?.kind ?? "entry");
      setNote(initial?.note ?? "");
      setEntryDate(initial?.entryDate ?? today);
    }
  }, [open, initial, viewerId, today]);

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const valid = amountCents > 0 && !!payerUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit entry" : "Add ledger entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Who paid?</Label>
            <Select value={payerUserId} onValueChange={setPayerUserId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.userId === viewerId ? "You" : m.email || m.userId.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as LedgerKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry (owe / claim)</SelectItem>
                <SelectItem value="settlement">Settlement (cash handed over)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || saving}
            onClick={() =>
              onSave({
                amountCents,
                payerUserId,
                kind,
                note: note.trim(),
                entryDate,
              })
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
