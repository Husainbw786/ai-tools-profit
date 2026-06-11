import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  createSale,
  deleteSale,
  listSales,
  updateSale,
  type SaleDTO,
} from "@/lib/sales.functions";

export type Sale = SaleDTO;

export const SALES_KEY = ["sales"] as const;

export function useSales() {
  const list = useServerFn(listSales);
  const { session, loading } = useAuth();
  return useQuery({
    queryKey: SALES_KEY,
    queryFn: () => list(),
    staleTime: 30_000,
    enabled: !loading && !!session,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  const fn = useServerFn(createSale);
  return useMutation({
    mutationFn: (input: Omit<Sale, "id" | "createdAt" | "amountPaid">) =>
      fn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALES_KEY }),
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  const fn = useServerFn(updateSale);
  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: Partial<Omit<Sale, "id" | "createdAt" | "amountPaid">>;
    }) =>
      fn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALES_KEY }),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  const fn = useServerFn(deleteSale);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SALES_KEY }),
  });
}