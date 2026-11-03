import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ChevronRight, FileDown, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SalesList } from "@/components/SalesList";
import { Button } from "@/components/ui/button";
import {
  BackLink,
  EmptyState,
  PageTitle,
  QuadStat,
  StatGrid,
  TextTabs,
  UnderlineSearch,
} from "@/components/primitives";
import { SkeletonRows } from "@/components/skeletons";
import { useAuth } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/admin";
import { getPlatformUserData, listPlatformUsers } from "@/lib/admin.functions";
import { downloadFile, salesToCSV } from "@/lib/exports";
import { friendlyError, requestSignal } from "@/lib/request-error";
import {
  balanceDue,
  formatDate,
  formatMoney,
  isRefunded,
  lineTotal,
  profit,
} from "@/lib/sale-utils";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { user?: string } =>
    typeof search.user === "string" && search.user ? { user: search.user } : {},
  head: () => ({
    meta: [{ title: "Admin — ProfitAI" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const { user: selected } = Route.useSearch();
  const isAdmin = isAdminEmail(user?.email);

  if (loading) {
    return (
      <AppLayout>
        <SkeletonRows count={6} className="mt-10" />
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <BackLink to="/more" className="mt-6" />
        <EmptyState>This page isn’t available.</EmptyState>
      </AppLayout>
    );
  }

  return <AppLayout>{selected ? <UserDetail userId={selected} /> : <UsersList />}</AppLayout>;
}

function UsersList() {
  const fetchUsers = useServerFn(listPlatformUsers);
  const [q, setQ] = useState("");
  const {
    data: users = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers({ signal: requestSignal(30_000) }),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(term) || (u.name ?? "").toLowerCase().includes(term),
    );
  }, [users, q]);

  return (
    <>
      <BackLink to="/more" className="mt-6" />
      <PageTitle
        className="mt-4"
        title="Admin"
        sub={
          isPending
            ? "Loading users…"
            : `${users.length} user${users.length === 1 ? "" : "s"} on the platform`
        }
        right={<ShieldCheck className="size-6 text-accent-text" strokeWidth={2.2} />}
      />

      <UnderlineSearch
        className="mt-[22px]"
        value={q}
        onChange={setQ}
        placeholder="Search by email or name"
      />

      <div className="mt-1.5">
        {isPending ? (
          <SkeletonRows count={6} />
        ) : error ? (
          <EmptyState>{friendlyError(error)}</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>No users match.</EmptyState>
        ) : (
          <ul>
            {filtered.map((u) => (
              <li key={u.id}>
                <Link
                  to="/admin"
                  search={{ user: u.id }}
                  className="flex items-center justify-between gap-3 border-b border-hairline py-[16px]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold">{u.email || u.id}</div>
                    <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {[
                        u.name,
                        `${u.salesCount} sale${u.salesCount === 1 ? "" : "s"}`,
                        `joined ${formatDate(u.createdAt)}`,
                        u.lastSignInAt
                          ? `last seen ${formatDate(u.lastSignInAt)}`
                          : "never signed in",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-faint" strokeWidth={2.2} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

type Tab = "sales" | "payments" | "contacts";

function UserDetail({ userId }: { userId: string }) {
  const fetchDetail = useServerFn(getPlatformUserData);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("sales");
  const [q, setQ] = useState("");
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchDetail({ data: { userId }, signal: requestSignal(30_000) }),
  });

  const sales = useMemo(() => data?.sales ?? [], [data]);
  const stats = useMemo(() => {
    const live = sales.filter((s) => !isRefunded(s));
    return {
      revenue: live.reduce((n, s) => n + lineTotal(s), 0),
      profit: sales.reduce((n, s) => n + profit(s), 0),
      due: live.reduce((n, s) => n + balanceDue(s), 0),
      count: sales.length,
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter(
      (s) =>
        s.productName.toLowerCase().includes(term) ||
        s.customerName.toLowerCase().includes(term) ||
        s.buyerName.toLowerCase().includes(term),
    );
  }, [sales, q]);

  const saleName = useMemo(() => new Map(sales.map((s) => [s.id, s.productName])), [sales]);

  return (
    <>
      <button
        type="button"
        onClick={() => navigate({ to: "/admin", search: {} })}
        className="mt-6 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
      >
        ‹ All users
      </button>

      {isPending ? (
        <SkeletonRows count={6} className="mt-6" />
      ) : error || !data ? (
        <EmptyState>{friendlyError(error)}</EmptyState>
      ) : (
        <>
          <PageTitle
            className="mt-4"
            title={<span className="break-all">{data.user.email || data.user.id}</span>}
            sub={[
              data.user.name,
              data.user.provider,
              `joined ${formatDate(data.user.createdAt)}`,
              data.user.lastSignInAt ? `last seen ${formatDate(data.user.lastSignInAt)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />

          <StatGrid cols={4} className="mt-[22px]">
            <QuadStat index={0} label="Sales" value={stats.count} />
            <QuadStat index={1} label="Revenue" value={formatMoney(stats.revenue)} />
            <QuadStat index={2} label="Profit" value={formatMoney(stats.profit)} />
            <QuadStat index={3} label="Due" value={formatMoney(stats.due)} />
          </StatGrid>

          <div className="mt-[22px] flex items-center justify-between gap-3">
            <TextTabs<Tab>
              tabs={[
                { id: "sales", label: `Sales (${sales.length})` },
                { id: "payments", label: `Payments (${data.payments.length})` },
                { id: "contacts", label: `Contacts (${data.contacts.length})` },
              ]}
              value={tab}
              onChange={setTab}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold"
              disabled={!sales.length}
              onClick={() =>
                downloadFile(
                  `sales-${(data.user.email || data.user.id).split("@")[0]}-${format(new Date(), "yyyy-MM-dd")}.csv`,
                  "﻿" + salesToCSV(sales),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <FileDown className="size-3.5" strokeWidth={2.4} />
              CSV
            </Button>
          </div>

          {tab === "sales" && (
            <>
              <UnderlineSearch
                className="mt-2"
                value={q}
                onChange={setQ}
                placeholder="Search this user's sales"
              />
              <div className="mt-1.5">
                <SalesList sales={filteredSales} emptyText="No sales." />
              </div>
            </>
          )}

          {tab === "payments" &&
            (data.payments.length === 0 ? (
              <EmptyState>No payments.</EmptyState>
            ) : (
              <ul className="mt-2">
                {data.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 border-b border-hairline py-[14px]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-bold">
                        {saleName.get(p.saleId) ?? "Sale"}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {[formatDate(p.paidAt), p.method, p.note].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="tabular shrink-0 text-[14px] font-bold">
                      {formatMoney(p.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "contacts" &&
            (data.contacts.length === 0 ? (
              <EmptyState>No contacts.</EmptyState>
            ) : (
              <ul className="mt-2">
                {[...data.contacts]
                  .sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .map((c) => (
                    <li key={c.id} className="border-b border-hairline py-[14px]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-[14px] font-bold">{c.displayName}</div>
                        <div className="shrink-0 text-[11px] font-semibold uppercase text-muted-foreground">
                          {c.kind}
                        </div>
                      </div>
                      {(c.tags.length > 0 || c.notes) && (
                        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                          {[c.tags.join(", "), c.notes].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            ))}
        </>
      )}
    </>
  );
}
