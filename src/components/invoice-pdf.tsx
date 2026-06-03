import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ── Brand colours ──────────────────────────────────────────────────────────
const NAVY  = "#1B2A4B";
const GOLD  = "#C9960C";
const GOLD_LIGHT = "#FBF3DF";
const GRAY_BG = "#F7F8FA";
const GRAY_BORDER = "#E2E6ED";
const MUTED = "#6B7280";
const RED   = "#DC2626";
const GREEN = "#059669";
const WHITE = "#FFFFFF";

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtPKR(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

// ── StyleSheet ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1F2937",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  logo: { width: 80, height: 80, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  invoiceLabel: { fontSize: 28, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 2 },
  invoiceSubLabel: { fontSize: 9, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginTop: 2 },
  invoiceMeta: { fontSize: 9, color: MUTED, marginTop: 2 },
  invoiceMetaValue: { fontSize: 9, color: NAVY, fontFamily: "Helvetica-Bold" },

  // Divider
  divider: { height: 2, backgroundColor: NAVY, marginBottom: 18 },
  dividerThin: { height: 1, backgroundColor: GRAY_BORDER, marginVertical: 10 },

  // From / To
  twoCol: { flexDirection: "row", gap: 12, marginBottom: 20 },
  col: { flex: 1 },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, marginBottom: 5, textTransform: "uppercase" },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 },
  addressText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },

  // Status pill
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontSize: 8, fontFamily: "Helvetica-Bold" },
  pillPaid:    { backgroundColor: "#D1FAE5", color: "#065F46" },
  pillPartial: { backgroundColor: "#FEF3C7", color: "#92400E" },
  pillPending: { backgroundColor: "#FEE2E2", color: "#991B1B" },

  // Items table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 1,
  },
  tableHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  tableRowAlt: { backgroundColor: GRAY_BG },
  tableCell: { fontSize: 8.5, color: "#374151" },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "right" },
  colPrice: { width: 72, textAlign: "right" },
  colTotal: { width: 72, textAlign: "right" },

  // Totals
  totalsContainer: {
    marginTop: 12,
    marginLeft: "auto",
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: { fontSize: 9, color: MUTED },
  totalsValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1F2937" },
  totalsBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NAVY,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 4,
  },
  totalsBalanceLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  totalsBalanceValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD },
  totalsPaidValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN },

  // Payment history
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 8, marginTop: 18 },
  payRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  payRowAlt: { backgroundColor: GRAY_BG },
  payDate: { width: 64, fontSize: 8, color: MUTED },
  payType: { width: 80, fontSize: 8, color: "#374151" },
  payRef: { flex: 1, fontSize: 7.5, color: MUTED },
  payAmt: { width: 72, textAlign: "right", fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREEN },

  // Notes
  notesBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: GOLD_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    borderRadius: 2,
  },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: "#374151", lineHeight: 1.5 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    paddingTop: 8,
  },
  footerLeft: { fontSize: 8, color: MUTED },
  footerRight: { fontSize: 8, color: MUTED, textAlign: "right" },
  footerBrand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
});

// ── Types ──────────────────────────────────────────────────────────────────
export interface PdfInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PdfInvoicePayment {
  amount: number;
  date: string;
  payment_type: string;
  notes: string | null;
  txn_description: string | null;
  txn_credit: number | null;
}

export interface PdfInvoiceData {
  id: number;
  invoice_number: string | null;
  date: string;
  description: string | null;
  invoiced_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
  client_name: string;
  items: PdfInvoiceItem[];
  payments: PdfInvoicePayment[];
  logoBase64: string;
}

// ── PDF Document ───────────────────────────────────────────────────────────
export function InvoicePDF({ inv }: { inv: PdfInvoiceData }) {
  const outstanding = inv.invoiced_amount - (inv.paid_amount ?? 0);
  const status = inv.status ?? "pending";

  const pillStyle =
    status === "paid"    ? S.pillPaid :
    status === "partial" ? S.pillPartial : S.pillPending;

  const statusLabel =
    status === "paid"    ? "PAID" :
    status === "partial" ? "PARTIALLY PAID" : "PENDING";

  return (
    <Document
      title={`Invoice ${inv.invoice_number ?? inv.id} — ${inv.client_name}`}
      author="Supreme Packages"
    >
      <Page size="A4" style={S.page}>

        {/* ── HEADER ── */}
        <View style={S.header}>
          <Image src={inv.logoBase64} style={S.logo} />
          <View style={S.headerRight}>
            <Text style={S.invoiceLabel}>INVOICE</Text>
            {inv.invoice_number && (
              <Text style={S.invoiceSubLabel}>{inv.invoice_number}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
              <Text style={S.invoiceMeta}>Date: </Text>
              <Text style={S.invoiceMetaValue}>{fmtDate(inv.date)}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
              <Text style={S.invoiceMeta}>Invoice ID: </Text>
              <Text style={S.invoiceMetaValue}>#{inv.id}</Text>
            </View>
          </View>
        </View>

        {/* ── DIVIDER ── */}
        <View style={S.divider} />

        {/* ── FROM / TO ── */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <Text style={S.sectionLabel}>From</Text>
            <Text style={S.companyName}>Supreme Packages</Text>
            <Text style={S.addressText}>Pakistan</Text>
          </View>
          <View style={S.col}>
            <Text style={S.sectionLabel}>Bill To</Text>
            <Text style={S.companyName}>{inv.client_name}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={S.sectionLabel}>Status</Text>
            <Text style={[S.pill, pillStyle]}>{statusLabel}</Text>
            {outstanding > 0 && (
              <>
                <Text style={[S.invoiceMeta, { marginTop: 6 }]}>Balance Due</Text>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: RED }}>
                  PKR {fmtPKR(outstanding)}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── DESCRIPTION ── */}
        {inv.description && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 8.5, color: MUTED }}>{inv.description}</Text>
          </View>
        )}

        {/* ── ITEMS TABLE ── */}
        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderText, S.colDesc]}>Description</Text>
          <Text style={[S.tableHeaderText, S.colQty]}>Qty</Text>
          <Text style={[S.tableHeaderText, S.colPrice]}>Unit Price</Text>
          <Text style={[S.tableHeaderText, S.colTotal]}>Total</Text>
        </View>

        {inv.items.length > 0 ? inv.items.map((item, i) => (
          <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={[S.tableCell, S.colDesc]}>{item.description}</Text>
            <Text style={[S.tableCell, S.colQty]}>{item.quantity.toLocaleString()}</Text>
            <Text style={[S.tableCell, S.colPrice]}>PKR {fmtPKR(item.unit_price)}</Text>
            <Text style={[S.tableCell, S.colTotal, { fontFamily: "Helvetica-Bold" }]}>PKR {fmtPKR(item.total)}</Text>
          </View>
        )) : (
          <View style={S.tableRow}>
            <Text style={[S.tableCell, S.colDesc]}>{inv.description ?? "—"}</Text>
            <Text style={[S.tableCell, S.colQty]}>—</Text>
            <Text style={[S.tableCell, S.colPrice]}>—</Text>
            <Text style={[S.tableCell, S.colTotal, { fontFamily: "Helvetica-Bold" }]}>PKR {fmtPKR(inv.invoiced_amount)}</Text>
          </View>
        )}

        {/* ── TOTALS ── */}
        <View style={S.totalsContainer}>
          <View style={S.dividerThin} />
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>Subtotal</Text>
            <Text style={S.totalsValue}>PKR {fmtPKR(inv.invoiced_amount)}</Text>
          </View>
          {(inv.paid_amount ?? 0) > 0 && (
            <View style={S.totalsRow}>
              <Text style={S.totalsLabel}>Amount Received</Text>
              <Text style={S.totalsPaidValue}>PKR {fmtPKR(inv.paid_amount ?? 0)}</Text>
            </View>
          )}
          <View style={S.totalsBalanceRow}>
            <Text style={S.totalsBalanceLabel}>
              {outstanding <= 0 ? "PAID IN FULL" : "BALANCE DUE"}
            </Text>
            <Text style={[S.totalsBalanceValue, outstanding <= 0 ? { color: "#34D399" } : {}]}>
              PKR {fmtPKR(outstanding <= 0 ? inv.invoiced_amount : outstanding)}
            </Text>
          </View>
        </View>

        {/* ── PAYMENT HISTORY ── */}
        {inv.payments.length > 0 && (
          <View>
            <Text style={S.sectionTitle}>Payment History</Text>
            <View style={S.tableHeader}>
              <Text style={[S.tableHeaderText, { width: 64 }]}>Date</Text>
              <Text style={[S.tableHeaderText, { width: 80 }]}>Method</Text>
              <Text style={[S.tableHeaderText, { flex: 1 }]}>Reference / Notes</Text>
              <Text style={[S.tableHeaderText, { width: 72, textAlign: "right" }]}>Amount</Text>
            </View>
            {inv.payments.map((p, i) => {
              const ref = [p.txn_description, p.notes].filter(Boolean).join(" · ");
              return (
                <View key={i} style={[S.payRow, i % 2 === 1 ? S.payRowAlt : {}]}>
                  <Text style={S.payDate}>{fmtDate(p.date)}</Text>
                  <Text style={S.payType}>
                    {p.payment_type === "bank_transfer" ? "Bank Transfer" : "Cash"}
                  </Text>
                  <Text style={S.payRef}>{ref || "—"}</Text>
                  <Text style={S.payAmt}>PKR {fmtPKR(p.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── NOTES ── */}
        {inv.notes && (
          <View style={S.notesBox}>
            <Text style={S.notesLabel}>NOTES</Text>
            <Text style={S.notesText}>{inv.notes}</Text>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={S.footer} fixed>
          <View>
            <Text style={S.footerBrand}>Supreme Packages</Text>
            <Text style={S.footerLeft}>Thank you for your business!</Text>
          </View>
          <Text style={S.footerRight}>
            Generated {fmtDate(new Date().toISOString().slice(0, 10))}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
