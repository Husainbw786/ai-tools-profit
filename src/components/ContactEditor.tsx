import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useContacts, useUpsertContact, findContact } from "@/hooks/use-contacts";
import { TAG_PRESETS, tagColor } from "@/lib/contacts-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ContactEditor({
  kind,
  name,
}: {
  kind: "customer" | "dealer";
  name: string;
}) {
  const { data: contacts = [] } = useContacts();
  const upsert = useUpsertContact();
  const existing = findContact(contacts, kind, name);

  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setTags(existing?.tags ?? []);
    setNotes(existing?.notes ?? "");
  }, [existing?.id]);

  const toggle = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setNewTag("");
  };

  const save = async () => {
    await upsert.mutateAsync({
      kind,
      displayName: name,
      tags,
      notes: notes.trim() ? notes.trim() : null,
    });
    toast.success("Saved");
  };

  return (
    <Card className="border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Tags
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TAG_PRESETS.map((t) => {
          const active = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                active
                  ? tagColor(t)
                  : "border-dashed border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? "✓ " : "+ "}
              {t}
            </button>
          );
        })}
        {tags
          .filter((t) => !TAG_PRESETS.includes(t as (typeof TAG_PRESETS)[number]))
          .map((t) => (
            <span
              key={t}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                tagColor(t),
              )}
            >
              {t}
              <button
                type="button"
                onClick={() => toggle(t)}
                className="opacity-70 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Custom tag…"
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={addTag} className="h-8">
          Add
        </Button>
      </div>

      <div className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Notes
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private notes about this contact…"
        rows={3}
        className="mt-2 text-sm"
      />

      <div className="mt-3 flex justify-end">
        <Button onClick={save} disabled={upsert.isPending} size="sm" className="gap-1.5">
          <Save className="size-3.5" />
          {upsert.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}