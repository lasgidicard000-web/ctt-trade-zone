import jsPDF from "jspdf";
import { format } from "date-fns";

export interface PlanActivationReceiptData {
  investmentId: string;
  templateId: string | null;
  userId: string;
  accountName: string;
  accountEmail: string;
  planName: string;
  planId: string;
  tierRank: number;
  principal: number;
  durationDays: number;
  startedAt: string;
  endsAt: string;
  todayRoi: number | null;
  avgRoi: number;
  roiMin: number;
  roiMax: number;
  accrued: number;
  withdrawalFeePct: number;
  dailyWithdrawalCap: number;
  prioritySupport: boolean;
  premiumFeatures: boolean;
  communityAccess: boolean;
}

const fmtUsd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const pct = (v: number) => `${(v * 100).toFixed(4)}%`;

export const generatePlanActivationReceipt = (data: PlanActivationReceiptData) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 48;
  const right = pageWidth - 48;
  let y = 64;

  doc.setFillColor(23, 32, 64);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CTTTRADEZONE", left, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${data.planName} Activation Receipt`, left, 66);
  doc.setFontSize(9);
  doc.text(`Issued ${format(new Date(), "MMM dd, yyyy HH:mm 'UTC'")}`, right, 66, {
    align: "right",
  });

  y = 132;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 120);
    doc.text(label, left, y);
    doc.setTextColor(20, 20, 25);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11.5 : 10);
    const lines = doc.splitTextToSize(value, right - left - 200);
    doc.text(lines, left + 200, y);
    y += 15 * lines.length + 3;
  };

  const section = (title: string) => {
    y += 6;
    doc.setDrawColor(225, 228, 235);
    doc.line(left, y - 11, right, y - 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 64);
    doc.text(title, left, y);
    y += 20;
  };

  section("Account");
  row("Account name", data.accountName || "-");
  row("Account email", data.accountEmail || "-");

  section("Plan activation");
  row("Plan", `${data.planName} (tier ${data.tierRank})`, true);
  row("Principal used", fmtUsd(data.principal), true);
  row("Duration", `${data.durationDays} days`);
  row("Activated", format(new Date(data.startedAt), "MMM dd, yyyy HH:mm"));
  row("Cycle ends", format(new Date(data.endsAt), "MMM dd, yyyy HH:mm"));

  section("Rate roll & performance");
  row("Today's rolled rate", data.todayRoi !== null ? pct(data.todayRoi) : "Pending roll", true);
  row("Average rate to date", pct(data.avgRoi));
  row("Rate band", `${pct(data.roiMin)} – ${pct(data.roiMax)} daily`);
  row("Accrued profit", fmtUsd(data.accrued), true);
  row("Current total value", fmtUsd(data.principal + data.accrued), true);

  section("Tier entitlements");
  row("Withdrawal fee", pct(data.withdrawalFeePct));
  row("Daily withdrawal cap", fmtUsd(data.dailyWithdrawalCap));
  row("Priority support", data.prioritySupport ? "Enabled" : "Not included");
  row("Premium features", data.premiumFeatures ? "Enabled" : "Not included");
  row("Community access", data.communityAccess ? "Enabled" : "Not included");

  section("Audit references");
  row("Investment ID", data.investmentId);
  row("Plan template ID", data.templateId || "Not linked");
  row("Account ID", data.userId);

  y += 12;
  doc.setDrawColor(225, 228, 235);
  doc.line(left, y, right, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 130);
  const disclaimer = doc.splitTextToSize(
    "This receipt is generated automatically from the CTTTRADEZONE ledger. Daily rates are variable and rolled within the plan band; accrued values are indicative at the time of issue. Retain the investment ID for any support enquiries.",
    right - left
  );
  doc.text(disclaimer, left, y);

  doc.save(`ctttradezone-${data.planId}-activation-${data.investmentId.slice(0, 8)}.pdf`);
};
