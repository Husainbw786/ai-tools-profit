import { Link } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";

/**
 * Shared chrome for the public legal pages (privacy, terms). Deliberately
 * outside AppLayout so the pages render without a session — Google's OAuth
 * review and any signed-out visitor must be able to open them.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-7 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-primary text-white">
              <ArrowUp className="size-5" strokeWidth={2.6} />
            </span>
            <span className="font-display text-[20px] font-medium tracking-[-0.02em]">
              ProfitAI
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-7 pb-20 pt-10">
        <h1 className="font-display text-[36px] font-medium leading-[1.05] tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-2.5 text-[13px] text-faint">Last updated {updated}</p>

        <div
          className={[
            "mt-9 space-y-4 text-[15px] leading-[1.65] text-muted-foreground",
            "[&_p]:text-[15px] [&_p]:leading-[1.65]",
            "[&_strong]:font-semibold [&_strong]:text-foreground",
            "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
            "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4",
            "[&_a:hover]:text-primary",
          ].join(" ")}
        >
          {children}
        </div>

        <div className="mt-14 border-t border-border pt-6 text-[13px] text-faint">
          <Link to="/" className="transition hover:text-foreground">
            Back to ProfitAI
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-7">
      <h2 className="font-display text-[21px] font-medium tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
