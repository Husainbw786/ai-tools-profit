import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createPayment,
  deletePayment,
  listPaymentsForSale,
  type PaymentDTO,
} from "@/lib/payments.functions";
import { SALES_KEY } from "@/hooks/use-sales";

export type Payment = PaymentDTO;

export function usePaymentsForSale(saleId: string | null | undefined) {
  const fn = useServerFn(listPaymentsForSale);
  return useQuery({
    queryKey: ["payments", saleId],
    queryFn: () => fn({ data: { saleId: saleId as string } }),
    enabled: !!saleId,
    staleTime: 15_000,
  });
}

export function useCreatePayment(saleId: string) {
  const qc = useQueryClient();
  const fn = useServerFn(createPayment);
  return useMutation({
    mutationFn: (input: {
      amount: number;
      paidAt: string;
      method?: string | null;
      note?: string | null;
    }) => fn({ data: { saleId, ...input } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", saleId] });
      qc.invalidateQueries({ queryKey: SALES_KEY });
    },
  });
}

export function useDeletePayment(saleId: string) {
  const qc = useQueryClient();
  const fn = useServerFn(deletePayment);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", saleId] });
      qc.invalidateQueries({ queryKey: SALES_KEY });
    },
  });
}
