import { lazy, Suspense, useEffect, useState } from "react";
import type { SaleSheetProps } from "@/components/SaleSheetPanel";

const loadPanel = () => import("@/components/SaleSheetPanel");
const SaleSheetPanel = lazy(() => loadPanel().then((m) => ({ default: m.SaleSheetPanel })));

let warmed = false;
/** Fetch the sheet's code once the first screen has settled, so the first tap has no wait. */
function warmUp() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const run = () => void loadPanel().catch(() => {});
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    window.setTimeout(run, 1500);
  }
}

/**
 * Lazy entry to the sale sheet. Nothing is rendered (or downloaded) until the
 * sheet is first opened; after that the panel stays mounted so its close
 * animation and open/close state behave exactly as before.
 */
export function SaleSheet(props: SaleSheetProps) {
  const [mounted, setMounted] = useState(props.open);

  useEffect(() => {
    if (props.open) setMounted(true);
  }, [props.open]);

  useEffect(() => {
    warmUp();
  }, []);

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <SaleSheetPanel {...props} />
    </Suspense>
  );
}
