const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const HEADERS = [
  "id",
  "product_name",
  "duration_months",
  "buyer_name",
  "customer_name",
  "customer_number",
  "dealer_number",
  "buy_price",
  "sell_price",
  "warranty_start",
  "has_warranty",
  "notes",
  "created_at",
  "updated_at",
  "payment_status",
  "quantity",
  "amount_paid",
  "refunded_at",
  "refund_amount",
  "refund_reason",
];

// Last column letter of the sheet, kept in step with HEADERS.
const LAST_COL = String.fromCharCode("A".charCodeAt(0) + HEADERS.length - 1);

type SaleRow = {
  id: string;
  product_name: string;
  duration_months: number;
  buyer_name: string | null;
  customer_name: string | null;
  customer_number: string | null;
  dealer_number: string | null;
  buy_price: number | string;
  sell_price: number | string;
  warranty_start: string;
  has_warranty: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_status?: string | null;
  quantity?: number | null;
  refunded_at?: string | null;
  refund_amount?: number | string | null;
  refund_reason?: string | null;
};

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !connKey) throw new Error("Google Sheets connector not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

function sheetId() {
  const id = process.env.SALES_SHEET_ID;
  if (!id) throw new Error("SALES_SHEET_ID not set");
  return id;
}

function asText(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  if (!s) return "";
  // Leading + or = would be parsed as a formula by USER_ENTERED → #ERROR.
  // Prefix with apostrophe to force text (Sheets hides the apostrophe).
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function rowFor(sale: SaleRow, amountPaid = 0): (string | number | boolean)[] {
  return [
    sale.id,
    sale.product_name,
    sale.duration_months,
    sale.buyer_name ?? "",
    sale.customer_name ?? "",
    asText(sale.customer_number),
    asText(sale.dealer_number),
    Number(sale.buy_price),
    Number(sale.sell_price),
    sale.warranty_start,
    sale.has_warranty,
    sale.notes ?? "",
    sale.created_at,
    sale.updated_at,
    sale.payment_status ?? "paid",
    sale.quantity ?? 1,
    Number(amountPaid),
    sale.refunded_at ?? "",
    sale.refund_amount != null ? Number(sale.refund_amount) : "",
    sale.refund_reason ?? "",
  ];
}

async function gw(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
    // Never let a slow connector gateway hold a request open indefinitely.
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status}: ${body}`);
  }
  return res.json();
}

async function listTabs(): Promise<Set<string>> {
  const data = await gw(`/spreadsheets/${sheetId()}?fields=sheets.properties.title`);
  return new Set<string>((data.sheets ?? []).map((s: any) => s.properties.title));
}

async function addTab(name: string) {
  await gw(`/spreadsheets/${sheetId()}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: name } } }],
    }),
  });
  await writeHeaders(name);
}

async function writeHeaders(name: string) {
  await gw(
    `/spreadsheets/${sheetId()}/values/${encodeRange(`${quoteTab(name)}!A1:${LAST_COL}1`)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [HEADERS] }) },
  );
}

// Sheet names can contain @ and . but if they contain special chars we wrap in quotes
function quoteTab(name: string) {
  return name.includes(" ") || name.includes("'") ? `'${name.replace(/'/g, "''")}'` : name;
}

function encodeRange(range: string) {
  // Don't encode the ! or : — only encode the sheet name part
  return range;
}

// Tabs seen by this warm instance; saves a full tab listing per write.
const knownTabs = new Set<string>();

export async function ensureUserTab(tabName: string) {
  if (knownTabs.has(tabName)) return;
  const tabs = await listTabs();
  if (!tabs.has(tabName)) await addTab(tabName);
  // Existing tabs were created with fewer columns; refresh the header row once
  // per warm instance so new columns are labelled.
  else await writeHeaders(tabName);
  knownTabs.add(tabName);
}

async function findRowIndex(tabName: string, id: string): Promise<number | null> {
  const data = await gw(`/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A:A`);
  const values: string[][] = data.values ?? [];
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === id) return i + 1; // 1-based
  }
  return null;
}

export async function appendSaleRow(tabName: string, sale: SaleRow, amountPaid = 0) {
  try {
    await ensureUserTab(tabName);
    await gw(
      `/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A:${LAST_COL}:append?valueInputOption=USER_ENTERED`,
      { method: "POST", body: JSON.stringify({ values: [rowFor(sale, amountPaid)] }) },
    );
  } catch (e) {
    console.warn("[sheets] appendSaleRow failed:", (e as Error).message);
  }
}

export async function upsertSaleRow(tabName: string, sale: SaleRow, amountPaid = 0) {
  try {
    await ensureUserTab(tabName);
    const idx = await findRowIndex(tabName, sale.id);
    if (idx === null) {
      await gw(
        `/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A:${LAST_COL}:append?valueInputOption=USER_ENTERED`,
        { method: "POST", body: JSON.stringify({ values: [rowFor(sale, amountPaid)] }) },
      );
    } else {
      await gw(
        `/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A${idx}:${LAST_COL}${idx}?valueInputOption=USER_ENTERED`,
        { method: "PUT", body: JSON.stringify({ values: [rowFor(sale, amountPaid)] }) },
      );
    }
  } catch (e) {
    console.warn("[sheets] upsertSaleRow failed:", (e as Error).message);
  }
}

export async function deleteSaleRow(tabName: string, id: string) {
  try {
    const idx = await findRowIndex(tabName, id);
    if (idx === null) return;
    await gw(
      `/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A${idx}:${LAST_COL}${idx}:clear`,
      {
        method: "POST",
        body: "{}",
      },
    );
  } catch (e) {
    console.warn("[sheets] deleteSaleRow failed:", (e as Error).message);
  }
}

export async function replaceUserSheet(
  tabName: string,
  sales: SaleRow[],
  paidBySale: Map<string, number> = new Map(),
) {
  await ensureUserTab(tabName);
  // Clear everything below the headers, then write all rows
  await gw(`/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A2:${LAST_COL}:clear`, {
    method: "POST",
    body: "{}",
  });
  if (sales.length === 0) return;
  await gw(
    `/spreadsheets/${sheetId()}/values/${quoteTab(tabName)}!A2:${LAST_COL}${sales.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values: sales.map((s) => rowFor(s, paidBySale.get(s.id) ?? 0)) }),
    },
  );
}

export async function resolveTabName(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  return email || userId;
}
