import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listContacts, upsertContact, type ContactDTO } from "@/lib/contacts.functions";
import { mirrorContact } from "@/lib/mirror.functions";
import { requestSignal } from "@/lib/request-error";

export type Contact = ContactDTO;

export const CONTACTS_KEY = ["contacts"] as const;

export function useContacts() {
  const list = useServerFn(listContacts);
  const { session, loading } = useAuth();
  return useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: () => list({ signal: requestSignal() }),
    enabled: !loading && !!session,
  });
}

export function useUpsertContact() {
  const qc = useQueryClient();
  const fn = useServerFn(upsertContact);
  const mirror = useServerFn(mirrorContact);
  return useMutation({
    mutationFn: (input: {
      kind: "customer" | "dealer";
      displayName: string;
      tags: string[];
      notes: string | null;
    }) => fn({ data: input, signal: requestSignal() }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
      if (row?.id)
        void mirror({ data: { id: row.id }, signal: requestSignal(30_000) }).catch(() => {});
    },
  });
}

export function findContact(
  contacts: Contact[],
  kind: "customer" | "dealer",
  name: string,
): Contact | undefined {
  const key = name.trim().toLowerCase();
  return contacts.find((c) => c.kind === kind && c.nameKey === key);
}
