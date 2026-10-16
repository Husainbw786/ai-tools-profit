import { createClientOnlyFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { groupByProduct, type MonthRow } from "@/lib/insights-utils";
import {
  amountCollected,
  balanceDue,
  effectiveRevenue,
  lineCost,
  lineTotal,
  marginPct,
  profit,
  statusLabel,
  warrantyEnd,
  type Sale,
} from "@/lib/sale-utils";

// The PDF stack (jspdf, jspdf-autotable and their canvas/svg dependencies) is
// ~1 MB and only ever runs in the browser. `createClientOnlyFn` strips this
// loader from the server build so it no longer bloats the serverless function.
const loadPdfLibs = createClientOnlyFn(async () => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
});

const toCSVCell = (v: string | number | null | undefined) => {
  let s = String(v ?? "");
  // Text starting with = + - @ would run as a formula in Excel/Sheets.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCSV = (rows: Array<Array<string | number | null | undefined>>) =>
  rows.map((row) => row.map(toCSVCell).join(",")).join("\n");

const isoDay = (d: string | Date) => format(new Date(d), "yyyy-MM-dd");
const round2 = (n: number) => Math.round(n * 100) / 100;

export function monthlyPnLToCSV(rows: MonthRow[]): string {
  const header = ["Month", "Sales", "Revenue", "Cost", "Profit", "Unpaid Count", "Unpaid Amount"];
  const body = rows.map((r) => [
    r.monthLabel,
    r.count,
    r.revenue,
    r.cost,
    r.profit,
    r.unpaidCount,
    r.unpaidAmount,
  ]);
  return toCSV([header, ...body]);
}

/** Every sale with all of its fields and derived amounts, oldest first. */
export function salesToCSV(sales: Sale[]): string {
  const header = [
    "Sale ID",
    "Date",
    "Product",
    "Plan (months)",
    "Quantity",
    "Customer",
    "Customer Number",
    "Dealer",
    "Dealer Number",
    "Buy Price",
    "Sell Price",
    "Line Total",
    "Line Cost",
    "Revenue",
    "Profit",
    "Margin %",
    "Status",
    "Collected",
    "Balance Due",
    "Warranty",
    "Valid Till",
    "Refunded On",
    "Refund Amount",
    "Refund Reason",
    "Notes",
    "Created At",
  ];
  const body = [...sales]
    .sort((a, b) => a.warrantyStart.localeCompare(b.warrantyStart))
    .map((s) => [
      s.id,
      isoDay(s.warrantyStart),
      s.productName,
      s.durationMonths,
      s.quantity || 1,
      s.customerName,
      s.customerNumber,
      s.buyerName,
      s.dealerNumber,
      s.buyPrice,
      s.sellPrice,
      lineTotal(s),
      lineCost(s),
      round2(effectiveRevenue(s)),
      round2(profit(s)),
      round2(marginPct(s)),
      statusLabel(s),
      round2(amountCollected(s)),
      round2(balanceDue(s)),
      s.hasWarranty ? "Yes" : "No",
      isoDay(warrantyEnd(s)),
      s.refundedAt ? isoDay(s.refundedAt) : "",
      s.refundAmount,
      s.refundReason,
      s.notes,
      s.createdAt,
    ]);
  return toCSV([header, ...body]);
}

export function downloadFile(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function monthlyPnLToPDF(rows: MonthRow[], filename: string) {
  const libs = await loadPdfLibs();
  if (!libs) throw new Error("PDF export is only available in the browser");
  const { jsPDF, autoTable } = libs;
  const doc = new jsPDF();
  const title = "Monthly Profit & Loss";
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleDateString("en-IN")}`, 14, 22);

  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.cost += r.cost;
      acc.profit += r.profit;
      acc.unpaidAmount += r.unpaidAmount;
      acc.count += r.count;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, unpaidAmount: 0, count: 0 },
  );

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;

  autoTable(doc, {
    startY: 28,
    head: [["Month", "Sales", "Revenue", "Cost", "Profit", "Unpaid"]],
    body: rows.map((r) => [
      r.monthLabel,
      r.count,
      fmt(r.revenue),
      fmt(r.cost),
      fmt(r.profit),
      r.unpaidAmount > 0 ? fmt(r.unpaidAmount) : "-",
    ]),
    foot: [
      [
        "Total",
        totals.count,
        fmt(totals.revenue),
        fmt(totals.cost),
        fmt(totals.profit),
        totals.unpaidAmount > 0 ? fmt(totals.unpaidAmount) : "-",
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 40] },
    footStyles: { fillColor: [240, 240, 245], textColor: 20, fontStyle: "bold" },
  });

  doc.save(filename);
}

// jspdf-autotable records where the last table ended but does not type it.
const lastTableY = (doc: object) =>
  (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20;

/**
 * Detailed statement for one month: summary figures, every sale in the month
 * and a per-product breakdown.
 */
export async function monthDetailToPDF(month: MonthRow, sales: Sale[], filename: string) {
  const libs = await loadPdfLibs();
  if (!libs) throw new Error("PDF export is only available in the browser");
  const { jsPDF, autoTable } = libs;
  const doc = new jsPDF({ orientation: "landscape" });
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
  const day = (d: string | Date) => format(new Date(d), "dd MMM yyyy");
  const rows = [...sales].sort((a, b) => a.warrantyStart.localeCompare(b.warrantyStart));

  doc.setFontSize(16);
  doc.text(`Monthly Statement — ${month.monthLabel}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleDateString("en-IN")}`, 14, 22);

  const units = rows.reduce((a, s) => a + (s.quantity || 1), 0);
  const collected = rows.reduce((a, s) => a + amountCollected(s), 0);
  const refunded = rows.filter((s) => s.refundedAt);
  const margin = month.cost > 0 ? (month.profit / month.cost) * 100 : 0;

  autoTable(doc, {
    startY: 28,
    theme: "grid",
    head: [
      ["Sales", "Units", "Revenue", "Cost", "Profit", "Margin", "Collected", "Unpaid", "Refunds"],
    ],
    body: [
      [
        month.count,
        units,
        fmt(month.revenue),
        fmt(month.cost),
        fmt(month.profit),
        `${margin.toFixed(0)}%`,
        fmt(collected),
        month.unpaidAmount > 0 ? `${fmt(month.unpaidAmount)} (${month.unpaidCount})` : "-",
        refunded.length ? String(refunded.length) : "-",
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 40] },
  });

  const totals = rows.reduce(
    (acc, s) => {
      acc.total += lineTotal(s);
      acc.cost += lineCost(s);
      acc.profit += profit(s);
      acc.paid += amountCollected(s);
      acc.due += balanceDue(s);
      return acc;
    },
    { total: 0, cost: 0, profit: 0, paid: 0, due: 0 },
  );

  doc.setFontSize(12);
  const afterSummary = lastTableY(doc) + 10;
  doc.text("All entries", 14, afterSummary);
  autoTable(doc, {
    startY: afterSummary + 3,
    head: [
      [
        "Date",
        "Product",
        "Plan",
        "Qty",
        "Customer",
        "Dealer",
        "Buy",
        "Sell",
        "Total",
        "Profit",
        "Paid",
        "Due",
        "Status",
        "Notes",
      ],
    ],
    body: rows.map((s) => [
      day(s.warrantyStart),
      s.productName,
      `${s.durationMonths}m`,
      s.quantity || 1,
      [s.customerName, s.customerNumber].filter(Boolean).join("\n") || "-",
      [s.buyerName, s.dealerNumber].filter(Boolean).join("\n") || "-",
      fmt(s.buyPrice),
      fmt(s.sellPrice),
      fmt(lineTotal(s)),
      fmt(profit(s)),
      fmt(amountCollected(s)),
      balanceDue(s) > 0 ? fmt(balanceDue(s)) : "-",
      s.refundedAt
        ? `Refunded ${fmt(s.refundAmount ?? amountCollected(s))}${s.refundReason ? `\n${s.refundReason}` : ""}`
        : statusLabel(s),
      s.notes || "",
    ]),
    foot: [
      [
        "Total",
        "",
        "",
        units,
        "",
        "",
        "",
        "",
        fmt(totals.total),
        fmt(totals.profit),
        fmt(totals.paid),
        totals.due > 0 ? fmt(totals.due) : "-",
        "",
        "",
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
    columnStyles: { 1: { cellWidth: 32 }, 13: { cellWidth: 38 } },
    headStyles: { fillColor: [30, 30, 40] },
    footStyles: { fillColor: [240, 240, 245], textColor: 20, fontStyle: "bold" },
  });

  const products = groupByProduct(rows).sort((a, b) => b.profit - a.profit);
  if (products.length) {
    const afterEntries = lastTableY(doc) + 10;
    doc.setFontSize(12);
    doc.text("By product", 14, afterEntries);
    autoTable(doc, {
      startY: afterEntries + 3,
      head: [["Product", "Sales", "Units", "Revenue", "Cost", "Profit", "Margin"]],
      body: products.map((g) => [
        g.key,
        g.count,
        g.units,
        fmt(g.revenue),
        fmt(g.cost),
        fmt(g.profit),
        `${g.marginPct.toFixed(0)}%`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 40] },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `${month.monthLabel} · Page ${i} of ${pages}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" },
    );
  }

  doc.save(filename);
}
