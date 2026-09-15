import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** "Lifetime ▾" chip that opens a small option list. Closes on selection. */
export function PeriodPopover<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground",
            className,
          )}
        >
          {current}
          <ChevronDown className="size-3.5" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-auto min-w-[160px]">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onChange(o.id);
              setOpen(false);
            }}
            className={cn(
              "block w-full rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold transition-colors",
              o.id === value
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
