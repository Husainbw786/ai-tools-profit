// Simple cross-component bus so the floating "+" FAB in AppLayout
// can open the SaleDialog mounted at the root.

const EVENT = "profitai:new-sale";

export function openNewSale() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function onNewSale(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}