import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { createSale, deleteSale, listSales, updateSale, type SaleDTO } from "@/lib/sales.functions";
import { mirrorSale } from "@/lib/mirror.functions";
import { requestSignal } from "@/lib/request-error";

export type Sale = SaleDTO;

export const SALES_KEY = ["sales"] as const;

export function useSales() {
  const list = useServerFn(listSales);
  const { session, loading } = useAuth();
  return useQuery({
    queryKey: SALES_KEY,
    queryFn: () => list({ signal: requestSignal() }),
    enabled: !loading && !!session,
  });
}

/** Fire-and-forget refresh of the Google Sheet / backup copies after a write. */
export function useMirrorSale() {
  const mirror = useServerFn(mirrorSale);
  return (saleId: string, action: "upsert" | "delete") => {
    void mirror({ data: { saleId, action }, signal: requestSignal(30_000) }).catch(() => {});
  };
}

export function useCreateSale() {
  const qc = useQueryClient();
  const fn = useServerFn(createSale);
  const mirror = useMirrorSale();
  return useMutation({
    mutationFn: (
      input: Omit<
        Sale,
        "id" | "createdAt" | "amountPaid" | "refundedAt" | "refundAmount" | "refundReason"
      > & {
        initialPaymentAmount?: number;
      },
    ) => fn({ data: input, signal: requestSignal() }),
    onSuccess: (row) => {
      if (row) {
        qc.setQueryData<Sale[]>(SALES_KEY, (current = []) => {
          const withoutDuplicate = current.filter((sale) => sale.id !== row.id);
          return [row, ...withoutDuplicate].sort(
            (a, b) => new Date(b.warrantyStart).getTime() - new Date(a.warrantyStart).getTime(),
          );
        });
        mirror(row.id, "upsert");
      }
    },
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  const fn = useServerFn(updateSale);
  const mirror = useMirrorSale();
  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: Partial<Omit<Sale, "id" | "createdAt" | "amountPaid">>;
    }) => fn({ data: input, signal: requestSignal() }),
    onSuccess: (row, vars) => {
      if (row) {
        qc.setQueryData<Sale[]>(SALES_KEY, (current = []) =>
          current.map((s) => (s.id === row.id ? { ...row, amountPaid: s.amountPaid } : s)),
        );
      }
      qc.invalidateQueries({ queryKey: SALES_KEY });
      mirror(vars.id, "upsert");
    },
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  const fn = useServerFn(deleteSale);
  const mirror = useMirrorSale();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id }, signal: requestSignal() }),
    onSuccess: (_res, id) => {
      qc.setQueryData<Sale[]>(SALES_KEY, (current = []) => current.filter((s) => s.id !== id));
      qc.invalidateQueries({ queryKey: SALES_KEY });
      mirror(id, "delete");
    },
  });
}
