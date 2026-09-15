import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SuggestOption = { label: string; count: number };

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "list"> & {
  value: string;
  onChange: (v: string) => void;
  /** Called when the user picks a suggestion (after onChange). */
  onPick?: (v: string) => void;
  options: SuggestOption[];
  /** Right-align the dropdown so it does not overflow the viewport. */
  alignRight?: boolean;
};

/**
 * Text input with a design-styled suggestion dropdown. Replaces the native
 * <datalist>. Rendered inline (no portal) so it works inside the sale sheet.
 */
export function SuggestInput({
  value,
  onChange,
  onPick,
  options,
  alignRight,
  className,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();

  const matches = useMemo(() => {
    const t = value.trim().toLowerCase();
    return options
      .filter((o) => !t || o.label.toLowerCase().includes(t))
      .filter((o) => o.label.toLowerCase() !== t)
      .slice(0, 6);
  }, [options, value]);

  const open = focused && matches.length > 0;

  const pick = (label: string) => {
    onChange(label);
    onPick?.(label);
    setFocused(false);
    setHighlight(-1);
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h <= 0 ? matches.length - 1 : h - 1));
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            pick(matches[highlight].label);
          } else if (e.key === "Escape") {
            setFocused(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute top-[calc(100%+6px)] z-20 max-h-[200px] w-max min-w-full max-w-[min(280px,80vw)] overflow-auto rounded-[14px] border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]",
            alignRight ? "right-0" : "left-0",
          )}
        >
          {matches.map((o, i) => (
            <li
              key={o.label}
              role="option"
              aria-selected={i === highlight}
              // mousedown + preventDefault so the input's blur never cancels the pick
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o.label);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold",
                i === highlight ? "bg-secondary text-foreground" : "text-foreground",
              )}
            >
              <span className="truncate">{o.label}</span>
              <span className="shrink-0 text-[11px] font-semibold text-faint">
                {o.count} sale{o.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Builds suggestion options (unique, trimmed, counted, most-used first). */
export function countOptions(values: (string | null | undefined)[]): SuggestOption[] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = (v ?? "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
