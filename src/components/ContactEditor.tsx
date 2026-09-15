import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/primitives";
import { useContacts, useUpsertContact, findContact } from "@/hooks/use-contacts";
import { TAG_PRESETS } from "@/lib/contacts-utils";
import { toast } from "sonner";

export function ContactEditor({ kind, name }: { kind: "customer" | "dealer"; name: string }) {
  const { data: contacts = [] } = useContacts();
  const upsert = useUpsertContact();
  const existing = findContact(contacts, kind, name);

  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setTags(existing?.tags ?? []);
    setNotes(existing?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      await upsert.mutateAsync({
        kind,
        displayName: name,
        tags,
        notes: notes.trim() ? notes.trim() : null,
      });
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const custom = tags.filter((t) => !TAG_PRESETS.includes(t as (typeof TAG_PRESETS)[number]));

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="text-[12px] font-bold text-muted-foreground">Tags</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TAG_PRESETS.map((t) => (
          <Chip key={t} active={tags.includes(t)} onClick={() => toggle(t)}>
            {t}
          </Chip>
        ))}
        {custom.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-[7px] text-[12px] font-bold text-background"
          >
            {t}
            <button
              type="button"
              onClick={() => toggle(t)}
              aria-label={`Remove tag ${t}`}
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
          placeholder="Custom tag"
          className="h-10 text-[13px]"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          className="h-10 rounded-[12px] px-4 text-[13px]"
        >
          Add
        </Button>
      </div>

      <div className="mt-4 text-[12px] font-bold text-muted-foreground">Notes</div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private notes about this contact"
        rows={3}
        className="mt-2"
      />

      <Button
        variant="outline"
        onClick={save}
        disabled={upsert.isPending}
        className="mt-3 h-[46px] w-full text-[14px]"
      >
        {upsert.isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
