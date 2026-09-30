import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createPayment, deletePayment, type PaymentDTO } from "@/lib/payments.functions";
import { fetchPaymentsForSale } from "@/lib/ledger-reads";
import { mirrorPaymentDelete } from "@/lib/mirror.functions";
import { SALES_KEY, useMirrorSale } from "@/hooks/use-sales";
import { useAuth } from "@/hooks/use-auth";
import { requestSignal } from "@/lib/request-error";

export type Payment = PaymentDTO;

export function usePaymentsForSale(saleId: string | null | undefined) {
  const { session, loading } = useAuth();
  return useQuery({
    queryKey: ["payments", saleId],
    // Read straight from Supabase (RLS-scoped); no serverless hop.
    queryFn: () => fetchPaymentsForSale(saleId as string, requestSignal()),
    enabled: !!saleId && !loading && !!session,
    staleTime: 15_000,
  });
}

export function useCreatePayment(saleId: string) {
  const qc = useQueryClient();
  const fn = useServerFn(createPayment);
  const mirror = useMirrorSale();
  return useMutation({
    mutationFn: (input: {
      amount: number;
      paidAt: string;
      method?: string | null;
      note?: string | null;
    }) => fn({ data: { saleId, ...input }, signal: requestSignal() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", saleId] });
      qc.invalidateQueries({ queryKey: SALES_KEY });
      mirror(saleId, "upsert");
    },
  });
}

export function useDeletePayment(saleId: string) {
  const qc = useQueryClient();
  const fn = useServerFn(deletePayment);
  const mirrorDelete = useServerFn(mirrorPaymentDelete);
  const mirror = useMirrorSale();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id }, signal: requestSignal() }),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ["payments", saleId] });
      qc.invalidateQueries({ queryKey: SALES_KEY });
      void mirrorDelete({ data: { id }, signal: requestSignal(30_000) }).catch(() => {});
      mirror(saleId, "upsert");
    },
  });
}
