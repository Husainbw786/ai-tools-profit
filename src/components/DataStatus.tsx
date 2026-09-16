import { useNavigate } from "@tanstack/react-router";
import { useIsFetching } from "@tanstack/react-query";
import { RefreshCw, WifiOff } from "lucide-react";
import { useSales } from "@/hooks/use-sales";
import { SALES_KEY } from "@/hooks/use-sales";
import { friendlyError, isAuthError, isOfflineError } from "@/lib/request-error";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Global fetch feedback: a thin terracotta progress line while the ledger is
 * refreshing, and an inline notice with Retry when the last fetch failed. The
 * last good data stays on screen underneath.
 */
const withPeriod = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export function DataStatus() {
  const sales = useSales();
  const fetching = useIsFetching({ queryKey: SALES_KEY }) > 0;
  const navigate = useNavigate();

  const signInAgain = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-primary transition-opacity duration-300",
          fetching ? "animate-[progress_1.2s_ease-in-out_infinite] opacity-100" : "opacity-0",
        )}
      />
      {sales.isError && (
        <div
          role="alert"
          className={cn(
            "mt-4 flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-[13px] font-semibold",
            isAuthError(sales.error)
              ? "bg-warning-soft text-warning"
              : isOfflineError(sales.error)
                ? "bg-secondary text-muted-foreground"
                : "bg-destructive-soft text-destructive",
          )}
        >
          {isOfflineError(sales.error) && <WifiOff className="size-4 shrink-0" />}
          <span className="min-w-0 flex-1">
            {sales.data
              ? `${withPeriod(friendlyError(sales.error, "Couldn't refresh your sales"))} Showing saved data.`
              : friendlyError(sales.error, "Couldn't load your sales.")}
          </span>
          {isAuthError(sales.error) ? (
            <button
              type="button"
              onClick={signInAgain}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-white"
            >
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => sales.refetch()}
              disabled={sales.isFetching}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-bold text-background disabled:opacity-60"
            >
              <RefreshCw className={cn("size-3", sales.isFetching && "animate-spin")} />
              Retry
            </button>
          )}
        </div>
      )}
    </>
  );
}
