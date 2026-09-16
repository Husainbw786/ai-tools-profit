import { ArrowRight, ArrowUp, LineChart, MessageCircle, Shield, Users } from "lucide-react";
import { StatusDot } from "@/components/primitives";
import { cn } from "@/lib/utils";

/*
 * The marketing column of the login screen: brand, pitch, a sample ledger and
 * the feature list. It is the whole page on mobile (the sign-in form arrives as
 * a bottom sheet) and the left half of the split layout from `md` up.
 *
 * Everything here is static sample content — no ledger data is read.
 */

/** Sample rows for the preview card. Deliberately fictional. */
const PREVIEW = [
  {
    product: "ChatGPT Plus",
    sub: "Rahul Mehta · Paid · 22 d left",
    price: "₹1,299",
    note: "+44%",
    noteClass: "text-accent-text",
    dotClass: "bg-success",
  },
  {
    product: "LinkedIn Premium",
    sub: "Priya Sharma · Partial · 64 d left",
    price: "₹2,400",
    note: "₹1,200 due",
    noteClass: "text-destructive",
    dotClass: "bg-warning",
  },
  {
    product: "Canva Pro",
    sub: "Aman Verma · Unpaid · 311 d left",
    price: "₹1,800",
    note: "₹1,800 due",
    noteClass: "text-destructive",
    dotClass: "bg-destructive",
  },
];

/** Six months of profit, as a share of the tallest bar. */
const BARS = [
  { height: "38%", className: "bg-secondary" },
  { height: "52%", className: "bg-secondary" },
  { height: "44%", className: "bg-secondary" },
  { height: "100%", className: "bg-foreground" },
  { height: "70%", className: "bg-secondary" },
  { height: "62%", className: "bg-primary" },
];

const FEATURES = [
  {
    icon: LineChart,
    title: "Profit on every sale",
    body: "Buy price, sell price, margin — calculated the moment you log it.",
  },
  {
    icon: MessageCircle,
    title: "Dues at a glance",
    body: "See who owes you, how long it has been, and send a WhatsApp reminder in one tap.",
  },
  {
    icon: Shield,
    title: "Warranty tracking",
    body: "Days left on every subscription, with expired sales archived automatically.",
  },
  {
    icon: Users,
    title: "Customers & dealers",
    body: "Revenue, profit and outstanding balance per person, with full purchase history.",
  },
];

export function LoginShowcase({
  onSignIn,
  onSignUp,
  ctasHidden,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
  /** True once the mobile sheet is open — the in-page CTAs step aside for it. */
  ctasHidden: boolean;
}) {
  // The sheet triggers only exist below `md`; above it the form is always on screen.
  const triggerClass = cn("md:hidden", ctasHidden && "hidden");

  return (
    <div className="order-1 flex min-w-0 flex-1 basis-[380px] flex-col bg-panel px-[clamp(24px,5vw,72px)] pb-12 pt-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-primary text-white">
            <ArrowUp className="size-[18px]" strokeWidth={2.6} />
          </span>
          <span className="whitespace-nowrap font-display text-[21px] font-medium tracking-[-0.01em]">
            ProfitAI
          </span>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className={cn(
            "inline-flex h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(217,119,87,0.3)] transition hover:bg-primary/90",
            triggerClass,
          )}
        >
          Log in
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-[clamp(36px,7vh,80px)] max-w-[520px]">
        <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-text">
          Resale ledger
        </div>
        <h1 className="mt-3 text-pretty font-display text-[clamp(34px,4.2vw,52px)] font-medium leading-[1.05] tracking-[-0.025em]">
          Every subscription you resell, tracked to the rupee.
        </h1>
        <p className="mt-[18px] max-w-[460px] text-pretty text-[16px] leading-[1.6] text-muted-foreground">
          Log a sale in ten seconds, see profit instantly, and never lose track of who still owes
          you or when a warranty ends.
        </p>
        <div className={cn("mt-6 flex gap-2.5", triggerClass)}>
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[14px] bg-foreground text-[14px] font-bold text-background transition hover:bg-foreground/90"
          >
            Get started free
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[14px] border border-border bg-card text-[14px] font-bold transition hover:bg-card/70"
          >
            I have an account
          </button>
        </div>
      </div>

      <div className="mt-[clamp(28px,5vh,48px)] max-w-[520px] rounded-[20px] border border-border bg-card px-[22px] py-5 shadow-[0_12px_32px_rgba(41,38,27,0.08)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-semibold text-muted-foreground">
            Net profit · this month
          </span>
          <span className="text-[11px] font-bold text-accent-text">↑ 12%</span>
        </div>
        <div className="tabular mt-2 font-display text-[40px] font-medium leading-none tracking-[-0.03em]">
          ₹11,700
        </div>
        <div aria-hidden className="mt-[18px] grid h-14 grid-cols-6 items-end gap-2">
          {BARS.map((bar, i) => (
            <div
              key={i}
              style={{ height: bar.height }}
              className={cn("rounded-t-[6px] rounded-b-[3px]", bar.className)}
            />
          ))}
        </div>
        <div className="mt-4 border-t border-hairline">
          {PREVIEW.map((row) => (
            <div
              key={row.product}
              className="flex items-center gap-3 border-b border-hairline py-[11px]"
            >
              <StatusDot className={row.dotClass} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{row.product}</div>
                <div className="mt-px text-[12px] text-muted-foreground">{row.sub}</div>
              </div>
              <div className="tabular shrink-0 text-right">
                <div className="text-[14px] font-bold">{row.price}</div>
                <div className={cn("mt-px text-[11px] font-bold", row.noteClass)}>{row.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-[clamp(28px,5vh,48px)] grid max-w-[560px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-7 gap-y-[22px]">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-border bg-card text-accent-text">
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-bold">{title}</div>
              <div className="mt-[3px] text-pretty text-[13px] leading-[1.5] text-muted-foreground">
                {body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
