import type { MonthRow } from "@/lib/insights-utils";

const toCSVCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function monthlyPnLToCSV(rows: MonthRow[]): string {
  const header = ["Month", "Sales", "Revenue", "Cost", "Profit", "Unpaid Count", "Unpaid Amount"];
  const body = rows.map((r) => [
    r.monthLabel,
    r.count,
    r.revenue,
    r.cost,
    r.profit,
    r.unpaidCount,
    r.dueAmount,
  ]);
  return [header, ...body].map((row) => row.map(toCSVCell).join(",")).join("\n");
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
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
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
      acc.dueAmount += r.dueAmount;
      acc.count += r.count;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, dueAmount: 0, count: 0 },
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
      r.dueAmount > 0 ? fmt(r.dueAmount) : "-",
    ]),
    foot: [[
      "Total",
      totals.count,
      fmt(totals.revenue),
      fmt(totals.cost),
      fmt(totals.profit),
      totals.dueAmount > 0 ? fmt(totals.dueAmount) : "-",
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 40] },
    footStyles: { fillColor: [240, 240, 245], textColor: 20, fontStyle: "bold" },
  });

  doc.save(filename);
}