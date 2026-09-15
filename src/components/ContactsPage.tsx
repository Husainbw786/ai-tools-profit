import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ContactsBrowser } from "@/components/ContactsBrowser";
import { BackLink, SegmentedPill } from "@/components/primitives";
import type { ContactKind } from "@/lib/contacts-utils";

const KINDS: { id: ContactKind; label: string }[] = [
  { id: "customer", label: "Customers" },
  { id: "dealer", label: "Dealers" },
];

/** Shared page body for /customers and /dealers; the pill switches routes. */
export function ContactsPage({ kind }: { kind: ContactKind }) {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <BackLink to="/more" className="mt-6" />
      <div className="mt-4 flex items-end justify-between gap-3">
        <h1 className="text-title">{kind === "customer" ? "Customers" : "Dealers"}</h1>
        <SegmentedPill
          options={KINDS}
          value={kind}
          onChange={(k) => navigate({ to: k === "customer" ? "/customers" : "/dealers" })}
        />
      </div>
      <ContactsBrowser kind={kind} />
    </AppLayout>
  );
}
