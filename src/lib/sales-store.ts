import { useSyncExternalStore } from "react";
import type { Sale } from "./sale-utils";

const KEY = "sales-tracker:v1";

const seed: Sale[] = [
  {
    id: "s1",
    productName: "LinkedIn Premium Career",
    durationMonths: 3,
    buyerName: "Reseller A",
    customerName: "Rahul Sharma",
    buyPrice: 400,
    sellPrice: 899,
    warrantyStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    notes: "Paid via UPI",
    createdAt: new Date().toISOString(),
  },
  {
    id: "s2",
    productName: "Spotify Premium",
    durationMonths: 6,
    buyerName: "Reseller B",
    customerName: "Priya Singh",
    buyPrice: 250,
    sellPrice: 599,
    warrantyStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "s3",
    productName: "ChatGPT Plus",
    durationMonths: 1,
    buyerName: "Reseller A",
    customerName: "Amit K.",
    buyPrice: 700,
    sellPrice: 1200,
    warrantyStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

let cache: Sale[] | null = null;
const listeners = new Set<() => void>();

const read = (): Sale[] => {
  if (cache) return cache;
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = seed;
      window.localStorage.setItem(KEY, JSON.stringify(seed));
      return cache;
    }
    cache = JSON.parse(raw) as Sale[];
    return cache;
  } catch {
    cache = seed;
    return cache;
  }
};

const write = (next: Sale[]) => {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
};

export const salesStore = {
  getAll: () => read(),
  add: (s: Omit<Sale, "id" | "createdAt">) => {
    const sale: Sale = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write([sale, ...read()]);
  },
  update: (id: string, patch: Partial<Sale>) => {
    write(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
  },
  remove: (id: string) => {
    write(read().filter((s) => s.id !== id));
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useSales = (): Sale[] =>
  useSyncExternalStore(
    salesStore.subscribe,
    () => read(),
    () => seed,
  );