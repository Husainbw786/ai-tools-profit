import { cn } from "@/lib/utils";

/** A single placeholder block in the design's chip colour. */
export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[8px] bg-secondary", className)} />;
}

/** Placeholder for a list of sale / contact rows. */
export function SkeletonRows({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-[14px] border-b border-hairline py-4">
          <Bone className="size-[7px] rounded-full" />
          <div className="flex-1">
            <Bone className="h-[15px] w-[55%]" />
            <Bone className="mt-2 h-[12px] w-[40%]" />
          </div>
          <div className="flex flex-col items-end">
            <Bone className="h-[15px] w-[64px]" />
            <Bone className="mt-2 h-[11px] w-[40px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a stat row between rules. */
export function SkeletonStats({ cols = 3, className }: { cols?: 2 | 3 | 4; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid border-y border-border py-[18px]",
        cols === 3 ? "grid-cols-3" : cols === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i}>
          <Bone className="h-[11px] w-[52px]" />
          <Bone className="mt-2 h-[17px] w-[72px]" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for the serif hero number block. */
export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <Bone className="h-[13px] w-[72px]" />
      <Bone className="mt-3 h-[54px] w-[220px] rounded-[12px]" />
      <Bone className="mt-3 h-[13px] w-[180px]" />
    </div>
  );
}

/** Placeholder for the six-bar trend chart. */
export function SkeletonChart({ className }: { className?: string }) {
  const heights = [46, 28, 40, 60, 66, 52];
  return (
    <div aria-hidden className={cn("pt-[22px]", className)}>
      <div className="flex justify-between">
        <Bone className="h-[13px] w-[96px]" />
        <Bone className="h-[12px] w-[110px]" />
      </div>
      <div className="mt-4 grid h-[132px] grid-cols-6 items-end gap-2.5">
        {heights.map((h, i) => (
          <div key={i} className="flex h-full flex-col items-center justify-end">
            <div
              className="w-full max-w-[34px] animate-pulse rounded-[8px_8px_4px_4px] bg-secondary"
              style={{ height: `${h}%` }}
            />
            <Bone className="mt-2 h-[11px] w-[26px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for the dashboard's net-profit card. */
export function SkeletonHeroCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-[22px] bg-surface-hero px-5 pb-[18px] pt-5", className)}
    >
      <div className="flex items-center justify-between">
        <Bone className="h-[12px] w-[64px] bg-surface-hero-chip" />
        <Bone className="h-[22px] w-[84px] rounded-full bg-surface-hero-chip" />
      </div>
      <Bone className="mt-3 h-[46px] w-[200px] rounded-[12px] bg-surface-hero-chip" />
      <Bone className="mt-4 h-[12px] w-[220px] bg-surface-hero-chip" />
    </div>
  );
}

/** Placeholder for the dashboard's 2×2 tile grid. */
export function SkeletonTiles({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("grid grid-cols-2 gap-2.5 md:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Bone key={i} className="min-h-[118px] rounded-[22px]" />
      ))}
    </div>
  );
}
