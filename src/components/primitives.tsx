import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Small presentational building blocks shared by every screen. They encode
 * the design's idioms once: hairline rules, text tabs, chips, segmented
 * pills, underline search, stat grids, kickers.
 */

export function BackLink({
  to,
  label = "Back",
  className,
}: {
  to: LinkProps["to"];
  label?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft className="size-3.5" strokeWidth={2.4} />
      {label}
    </Link>
  );
}

export function PageTitle({
  title,
  sub,
  right,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-title">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-muted-foreground">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-section">{children}</h2>
      {right}
    </div>
  );
}

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-kicker text-accent-text", className)}>{children}</div>;
}

export function UnderlineSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2.5 border-b-2 border-foreground pb-2.5 pt-3.5 text-[15px] text-faint",
        className,
      )}
    >
      <Search className="size-[18px] shrink-0" strokeWidth={2.2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent p-0 text-[15px] font-medium text-foreground outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  );
}

export function TextTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-[22px] text-[13px] font-bold", className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "border-b-2 pb-2 transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-faint hover:text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-[7px] text-[12px] font-bold transition-colors duration-150",
        active
          ? "bg-foreground text-background"
          : "border border-border text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  className,
  grow,
}: {
  options: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  grow?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full bg-secondary p-[3px] text-[12px] font-bold",
        grow && "flex w-full",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-full transition-colors",
              // Full-width segments give their label the whole slot, so side
              // padding only forces long labels ("By customer") to wrap.
              grow ? "flex-1 px-1 py-2 text-center" : "px-3 py-1.5",
              active
                ? "bg-card text-foreground shadow-[var(--shadow-chip)]"
                : "text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-primary/90",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A row of stats between two section rules. */
export function StatGrid({
  cols,
  children,
  className,
}: {
  cols: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tabular grid border-y border-border",
        cols === 3 && "grid-cols-3 py-[18px]",
        cols === 4 && "grid-cols-2 md:grid-cols-4",
        cols === 2 && "grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  className,
  valueClassName,
  size = "md",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-bold tracking-[-0.02em]",
          size === "lg" ? "text-[20px]" : "text-[17px]",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** 2×2 stat cell with inner hairlines (used by Insights and contact detail). */
export function QuadStat({
  label,
  value,
  index,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  index: 0 | 1 | 2 | 3;
  valueClassName?: string;
}) {
  const right = index % 2 === 1;
  const top = index < 2;
  return (
    <Stat
      label={label}
      value={value}
      size="lg"
      valueClassName={valueClassName}
      className={cn(
        "py-4",
        right && "border-l border-hairline pl-[18px]",
        top && "border-b border-hairline md:border-b-0",
        // On 4-col desktop layouts every cell after the first gets a left rule.
        !right && index === 2 && "md:border-l md:border-hairline md:pl-[18px]",
      )}
    />
  );
}

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-[60px] text-center text-[14px] text-faint", className)}>{children}</div>
  );
}

export function StatusDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-block size-[7px] shrink-0 rounded-full", className)} />
  );
}
