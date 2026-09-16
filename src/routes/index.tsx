import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ArrowRight, Clock, FileText, MessageCircle, Settings, Target } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { ProfitTrendChart } from "@/components/ProfitTrendChart";
import { PeriodPopover } from "@/components/PeriodPopover";
import {
  Bone,
  SkeletonChart,
  SkeletonHeroCard,
  SkeletonRows,
  SkeletonTiles,
} from "@/components/skeletons";
import { useAuth } from "@/hooks/use-auth";
import { useSales } from "@/hooks/use-sales";
import { useMonthlyGoal } from "@/hooks/use-goal";
import { cn } from "@/lib/utils";
import {
  balanceDue,
  daysRemaining,
  effectiveRevenue,
  filterByRange,
  formatMoney,
  isExpired,
  isRefunded,
  lineCost,
  profit,
  type DateRange,
  type Sale,
} from "@/lib/sale-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProfitAI" },
      { name: "description", content: "Track subscription resales and profit." },
    ],
  }),
  component: Index,
});

type Period = "lifetime" | "this-month" | "last-month";

const PERIODS: { id: Period; label: string }[] = [
  { id: "lifetime", label: "Lifetime" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
];

/** "Good morning" / "afternoon" / "evening" by the viewer's local clock. */
function greetingFor(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** First name from sign-up metadata, else the email's local part. */
function firstNameOf(user: { email?: string; user_metadata?: Record<string, unknown> } | null) {
  const full = user?.user_metadata?.full_name;
  if (typeof full === "string" && full.trim()) return full.trim().split(/\s+/)[0];
  const local = user?.email?.split("@")[0];
  return local || null;
}

function Index() {
  const { data: sales = [], isPending } = useSales();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("lifetime");
  const [editing, setEditing] = useState<Sale | null>(null);

  const now = new Date();
  const range: DateRange | null = useMemo(() => {
    if (period === "this-month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (period === "last-month") {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const inRange = useMemo(() => filterByRange(sales, range), [sales, range]);
  const totalProfit = inRange.reduce((sum, s) => sum + profit(s), 0);
  const totalRevenue = inRange.reduce((sum, s) => sum + effectiveRevenue(s), 0);
  const totalCost = inRange.reduce((sum, s) => sum + lineCost(s), 0);
  const totalUnits = inRange.reduce((sum, s) => sum + (s.quantity || 1), 0);

  const unpaid = useMemo(() => sales.filter((s) => balanceDue(s) > 0 && !isRefunded(s)), [sales]);
  const dueAmount = unpaid.reduce((a, s) => a + balanceDue(s), 0);

  const { goal, setGoal } = useMonthlyGoal();
  const thisMonthProfit = useMemo(
    () =>
      filterByRange(sales, { from: startOfMonth(now), to: endOfMonth(now) }).reduce(
        (a, s) => a + profit(s),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales],
  );
  const goalPct = goal > 0 ? Math.min(100, (thisMonthProfit / goal) * 100) : 0;

  const active = useMemo(() => sales.filter((s) => !isExpired(s)), [sales]);
  const expiringSoon = active.filter((s) => s.hasWarranty && daysRemaining(s) <= 7).length;
  const recent = useMemo(
    () => [...active].sort((a, b) => b.warrantyStart.localeCompare(a.warrantyStart)).slice(0, 4),
    [active],
  );

  const initial = (user?.email?.[0] ?? "P").toUpperCase();
  const firstName = firstNameOf(user);
  const greeting = `${greetingFor(now.getHours())}${firstName ? `, ${firstName}` : ""}`;
  const todayLine = [
    format(now, "EEEE, d MMMM"),
    `${active.length} active`,
    expiringSoon ? `${expiringSoon} expiring this week` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const header = (
    <div className="flex items-center justify-between pt-5 md:pt-2">
      <Link
        to="/more"
        aria-label="More"
        className="grid size-9 place-items-center rounded-full bg-primary text-[14px] font-extrabold text-white md:invisible"
      >
        {initial}
      </Link>
      <Link
        to="/more"
        aria-label="Settings"
        className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground md:invisible"
      >
        <Settings className="size-[17px]" strokeWidth={2.2} />
      </Link>
    </div>
  );

  if (isPending) {
    return (
      <AppLayout>
        <h1 className="sr-only">Dashboard</h1>
        {header}
        <div className="mt-6" aria-hidden>
          <Bone className="h-[28px] w-[240px] rounded-[10px]" />
          <Bone className="mt-2.5 h-[13px] w-[200px]" />
        </div>
        <SkeletonHeroCard className="mt-[22px]" />
        <SkeletonTiles className="mt-2.5" />
        <SkeletonChart className="pt-[26px]" />
        <SkeletonRows className="mt-8" count={3} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {header}

      <div className="mt-6">
        <h1 className="text-[28px] leading-none">{greeting}</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{todayLine}</p>
      </div>

      <section
        aria-label="Net profit"
        className="mt-[22px] rounded-[22px] bg-surface-hero px-5 pb-[18px] pt-5"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-muted-foreground">Net profit</span>
          <PeriodPopover
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            className="bg-surface-hero-chip px-2.5 py-[5px] text-[11px] font-bold"
          />
        </div>
        <div className="text-hero-card mt-2.5">{formatMoney(totalProfit)}</div>
        <div className="tabular mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span>
            Rev <strong className="text-foreground">{formatMoney(totalRevenue)}</strong>
          </span>
          <span>
            Cost <strong className="text-foreground">{formatMoney(totalCost)}</strong>
          </span>
          <span>
            Sales <strong className="text-foreground">{inRange.length}</strong>
            {totalUnits !== inRange.length && (
              <span className="text-faint"> · {totalUnits} units</span>
            )}
          </span>
        </div>
      </section>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Tile
          to="/collections"
          icon={<MessageCircle className="size-[18px]" strokeWidth={2.2} />}
          value={formatMoney(dueAmount)}
          sub={dueAmount > 0 ? `to collect · ${unpaid.length}` : "nothing outstanding"}
          tone={dueAmount > 0 ? "alert" : "ok"}
        />
        <GoalTile goal={goal} setGoal={setGoal} earned={thisMonthProfit} pct={goalPct} />
        <Tile
          to="/sales"
          icon={<FileText className="size-[18px]" strokeWidth={2.2} />}
          value={active.length}
          sub="active subscriptions"
        />
        <Tile
          to="/sales"
          icon={<Clock className="size-[18px]" strokeWidth={2.2} />}
          value={expiringSoon}
          sub="expiring this week"
          tone="warn"
        />
      </div>

      <ProfitTrendChart sales={sales} className="pt-[26px]" />

      <div className="mt-[30px] flex items-baseline justify-between">
        <h2 className="text-section">Active</h2>
        <Link
          to="/sales"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          {active.length} <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="mt-1">
        <SalesList
          sales={recent}
          emptyText="No active sales. Tap + to add your first one."
          onRowClick={(s) => setEditing(s)}
        />
      </div>

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}

type Tone = "default" | "alert" | "ok" | "warn";

const TILE_BASE =
  "flex min-h-[118px] flex-col justify-between rounded-[22px] p-[18px] text-left transition";

const ICON_TONE: Record<Tone, string> = {
  default: "text-accent-text",
  alert: "text-destructive",
  ok: "text-success",
  warn: "text-warning",
};

/** One of the 2×2 dashboard tiles: icon + arrow on top, big numeral + caption below. */
function Tile({
  to,
  icon,
  value,
  sub,
  tone = "default",
}: {
  to: "/collections" | "/sales";
  icon: React.ReactNode;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone?: Tone;
}) {
  const alert = tone === "alert";
  return (
    <Link
      to={to}
      className={cn(
        TILE_BASE,
        alert ? "bg-destructive-soft" : "border border-border bg-card hover:border-faint",
      )}
    >
      <div className={cn("flex items-center justify-between", ICON_TONE[tone])}>
        {icon}
        <ArrowRight className="size-3.5" strokeWidth={2.4} />
      </div>
      <div>
        <div
          className={cn("text-tile", alert && "text-destructive", tone === "ok" && "text-success")}
        >
          {value}
        </div>
        <div className="mt-0.5 text-[12px] font-semibold text-muted-foreground">{sub}</div>
      </div>
    </Link>
  );
}

/** Monthly goal tile with inline editing (progress bar + "earned of goal ✎"). */
function GoalTile({
  goal,
  setGoal,
  earned,
  pct,
}: {
  goal: number;
  setGoal: (n: number) => void;
  earned: number;
  pct: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const save = () => {
    setGoal(Number(draft) || 0);
    setEditing(false);
  };
  const startEdit = () => {
    setDraft(goal ? String(goal) : "");
    setEditing(true);
  };

  return (
    <div className={cn(TILE_BASE, "border border-border bg-card")}>
      <div className="flex items-center justify-between text-accent-text">
        <Target className="size-[18px]" strokeWidth={2.2} />
        <span className="tabular text-[12px] font-bold">
          {goal > 0 ? `${pct.toFixed(0)}%` : "Goal"}
        </span>
      </div>
      {editing ? (
        <div>
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Monthly profit goal"
            value={draft}
            placeholder="e.g. 15000"
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="tabular h-[34px] w-full rounded-[8px] border border-primary bg-transparent px-2.5 text-[14px] font-bold text-foreground outline-none"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={save}
              className="h-[30px] flex-1 rounded-[8px] bg-primary text-[12px] font-bold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-[30px] rounded-[8px] border border-border px-2.5 text-[12px] font-bold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startEdit} className="w-full text-left">
          <div className="h-1 overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${goal > 0 ? pct : 0}%` }}
            />
          </div>
          <div className="tabular mt-2 text-[12px] font-semibold text-muted-foreground">
            {goal > 0 ? (
              <>
                {formatMoney(earned)} of {formatMoney(goal)} goal ✎
              </>
            ) : (
              <span className="text-accent-text">Set a goal ✎</span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
