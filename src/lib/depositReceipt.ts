import jsPDF from "jspdf";
import { format } from "date-fns";

export interface DepositReceiptData {
  id: string;
  coinSymbol: string;
  amount: number;
  walletAddress: string;
  transactionHash: string | null;
  status: string;
  confirmations: number;
  createdAt: string;
  confirmedAt: string | null;
  notes: string | null;
  usdRate: number | null;
  accountName: string;
  accountEmail: string;
}

const fmtUsd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const generateDepositReceipt = (data: DepositReceiptData) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 48;
  const right = pageWidth - 48;
  let y = 64;

  // Header
  doc.setFillColor(23, 32, 64);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CTTTRADEZONE", left, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Deposit Transaction Receipt", left, 66);
  doc.setFontSize(9);
  doc.text(
    `Issued ${format(new Date(), "MMM dd, yyyy HH:mm 'UTC'")}`,
    right,
    66,
    { align: "right" }
  );

  y = 140;
  doc.setTextColor(30, 30, 30);

  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 120);
    doc.text(label, left, y);
    doc.setTextColor(20, 20, 25);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    const lines = doc.splitTextToSize(value, right - left - 190);
    doc.text(lines, left + 190, y);
    y += 18 * lines.length + 6;
  };

  const section = (title: string) => {
    y += 6;
    doc.setDrawColor(225, 228, 235);
    doc.line(left, y - 12, right, y - 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 64);
    doc.text(title, left, y);
    y += 22;
  };

  section("Account");
  row("Account name", data.accountName || "-");
  row("Account email", data.accountEmail || "-");

  section("Deposit details");
  row("Asset", data.coinSymbol);
  row("Amount credited", `${Number(data.amount).toFixed(8)} ${data.coinSymbol}`, true);
  row(
    "USD equivalent",
    data.usdRate
      ? `${fmtUsd(Number(data.amount) * data.usdRate)} (rate ${fmtUsd(data.usdRate)} / ${data.coinSymbol})`
      : "Rate unavailable",
    true
  );
  row("Status", data.status.toUpperCase());
  row("Confirmations", `${data.confirmations}/6`);
  row("Initiated", format(new Date(data.createdAt), "MMM dd, yyyy HH:mm"));
  row(
    "Confirmed",
    data.confirmedAt ? format(new Date(data.confirmedAt), "MMM dd, yyyy HH:mm") : "Pending"
  );
  if (data.notes) row("Notes", data.notes);

  section("Audit references");
  row("Deposit record ID", data.id);
  row("Destination address", data.walletAddress);
  row("Transaction hash", data.transactionHash || "Not provided");

  y += 16;
  doc.setDrawColor(225, 228, 235);
  doc.line(left, y, right, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 130);
  const disclaimer = doc.splitTextToSize(
    "This receipt is generated automatically from the CTTTRADEZONE ledger. USD values are indicative and based on the market rate at the time of issue. Retain the deposit record ID and transaction hash for any support enquiries.",
    right - left
  );
  doc.text(disclaimer, left, y);

  doc.save(`ctttradezone-deposit-${data.coinSymbol}-${data.id.slice(0, 8)}.pdf`);
};
