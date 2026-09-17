import { useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedPill } from "@/components/primitives";
import {
  buildSaleMessage,
  recipientName,
  recipientPhone,
  whatsAppShareUrl,
  type MessageRecipient,
  type Sale,
} from "@/lib/sale-utils";

const RECIPIENTS: { id: MessageRecipient; label: string }[] = [
  { id: "customer", label: "Customer" },
  { id: "dealer", label: "Dealer" },
];

/**
 * Prefilled, editable WhatsApp message for one sale. "Customer" is the
 * personalised purchase confirmation (what they bought, at what rate, paid or
 * due, covered till when); "Dealer" asks the dealer to confirm supplying the
 * item at the buy rate. The text can be tweaked before it is sent or copied.
 */
export function MessageComposer({
  sale,
  initialRecipient = "customer",
}: {
  sale: Sale;
  initialRecipient?: MessageRecipient;
}) {
  const [to, setTo] = useState<MessageRecipient>(initialRecipient);
  // Edits are kept per recipient so switching tabs never loses a draft.
  const [drafts, setDrafts] = useState<Partial<Record<MessageRecipient, string>>>({});

  const template = buildSaleMessage(sale, to);
  const text = drafts[to] ?? template;
  const edited = drafts[to] !== undefined && drafts[to] !== template;

  const name = recipientName(sale, to);
  const phone = recipientPhone(sale, to);
  const href = whatsAppShareUrl(phone, text);
  const canSend = text.trim().length > 0;
  const rows = Math.min(16, Math.max(6, text.split("\n").length + 1));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy. Long-press the text to copy it.");
    }
  };

  return (
    <div className="mt-5 border-t border-border pt-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold text-muted-foreground">Send to</div>
        {edited && (
          <button
            type="button"
            onClick={() => setDrafts((d) => ({ ...d, [to]: undefined }))}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="size-3" strokeWidth={2.4} />
            Reset text
          </button>
        )}
      </div>
      <SegmentedPill className="mt-2" grow options={RECIPIENTS} value={to} onChange={setTo} />

      <div className="mt-2.5 truncate text-[12px] text-muted-foreground">
        {name || phone ? (
          <>
            To <span className="font-semibold text-foreground">{name || phone}</span>
            {name && phone && <span className="text-faint"> · {phone}</span>}
          </>
        ) : (
          <span>No {to} saved on this sale</span>
        )}
      </div>

      <Textarea
        className="mt-2 text-[13px] leading-[1.45]"
        rows={rows}
        value={text}
        onChange={(e) => setDrafts((d) => ({ ...d, [to]: e.target.value }))}
        aria-label={`Message to ${to}`}
      />
      {!phone && (
        <p className="mt-1.5 text-[11px] text-faint">
          No number saved for this {to}. WhatsApp will open with the text and ask you to pick the
          chat.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={canSend ? href : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!canSend}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-whatsapp text-[14px] font-bold text-white transition hover:bg-whatsapp/90 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <WhatsAppIcon className="size-4" />
          Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          disabled={!canSend}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-border px-4 text-[14px] font-bold text-foreground transition hover:bg-secondary/60 disabled:opacity-50"
        >
          <Copy className="size-4" strokeWidth={2.2} />
          Copy
        </button>
      </div>
    </div>
  );
}
