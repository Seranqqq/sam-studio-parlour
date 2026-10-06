import { jsPDF } from "jspdf";
import type { Bill } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";

const money = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`;

export function downloadInvoicePdf(bill: Bill) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 16;
  const right = pageWidth - left;
  let y = 18;

  const addText = (text: string, x: number, yPos: number, maxWidth = right - left) => {
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    pdf.text(lines, x, yPos);
    return lines.length * 5;
  };
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      pdf.addPage();
      y = 18;
    }
  };
  const line = () => {
    pdf.setDrawColor(210);
    pdf.line(left, y, right, y);
    y += 6;
  };
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  y += addText(bill.business.name, left, y, 110);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  if (bill.business.address) y += addText(bill.business.address, left, y, 110);
  if (bill.business.phone) y += addText(`Phone: ${bill.business.phone}`, left, y, 110);
  if (bill.billType === "gst" && bill.business.gstin) y += addText(`GSTIN: ${bill.business.gstin}`, left, y, 110);

  const title = bill.billType === "gst" ? "TAX INVOICE" : "BILL";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, right, 20, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(bill.receiptNumber ?? bill.billNumber, right, 27, { align: "right" });
  pdf.text(fmtDateTime(bill.createdAt), right, 33, { align: "right" });
  if (bill.status === "cancelled") {
    pdf.setTextColor(190, 35, 35);
    pdf.text("CANCELLED", right, 39, { align: "right" });
    pdf.setTextColor(0);
  }

  y = Math.max(y, 48);
  line();
  pdf.setFont("helvetica", "bold");
  pdf.text(`Bill to: ${bill.customer.name || "Walk-in"}`, left, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  if (bill.customer.phone) y += addText(`Phone: ${bill.customer.phone}`, left, y);
  if (bill.billType === "gst" && bill.customer.gstin) y += addText(`GSTIN: ${bill.customer.gstin}`, left, y);
  if (bill.billType === "gst" && bill.customer.state) y += addText(`Place of supply: ${bill.customer.state}`, left, y);
  y += 3;

  const columns = bill.billType === "gst"
    ? { item: left, hsn: 86, qty: 119, price: 139, discount: 160, amount: right }
    : { item: left, hsn: 86, qty: 125, price: 151, discount: 173, amount: right };
  const drawTableHeader = () => {
    ensureSpace(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("ITEM", columns.item, y);
    if (bill.billType === "gst") pdf.text("HSN/SAC", columns.hsn, y);
    pdf.text("QTY", columns.qty, y, { align: "right" });
    pdf.text("PRICE", columns.price, y, { align: "right" });
    pdf.text("DISC.", columns.discount, y, { align: "right" });
    pdf.text("AMOUNT", columns.amount, y, { align: "right" });
    y += 3;
    pdf.setDrawColor(120);
    pdf.line(left, y, right, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
  };
  drawTableHeader();

  bill.items.forEach((item) => {
    const description = item.staff ? `${item.name} (${item.staff})` : item.name;
    const itemLines = pdf.splitTextToSize(description, bill.billType === "gst" ? 58 : 78) as string[];
    const rowHeight = Math.max(6, itemLines.length * 4.5);
    if (y + rowHeight > pageHeight - 32) {
      pdf.addPage();
      y = 18;
      drawTableHeader();
    }
    pdf.text(itemLines, columns.item, y);
    if (bill.billType === "gst" && item.hsn) pdf.text(item.hsn, columns.hsn, y);
    pdf.text(String(item.qty), columns.qty, y, { align: "right" });
    pdf.text(money(item.price), columns.price, y, { align: "right" });
    pdf.text(money(item.discount), columns.discount, y, { align: "right" });
    pdf.text(money(item.qty * item.price - item.discount), columns.amount, y, { align: "right" });
    y += rowHeight;
  });

  y += 2;
  line();
  const totalsLeft = right - 65;
  const totalField = (label: string, value: number, bold = false) => {
    ensureSpace(7);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.text(label, totalsLeft, y);
    pdf.text(money(value), right, y, { align: "right" });
    y += 6;
  };
  totalField("Subtotal", bill.subtotal);
  if (bill.discount > 0) totalField("Discount", -bill.discount);
  if (bill.billType === "gst") {
    totalField("Taxable value", bill.taxable);
    if (bill.interState) totalField("IGST", bill.igst);
    else {
      totalField("CGST", bill.cgst);
      totalField("SGST", bill.sgst);
    }
  }
  if (bill.roundOff !== 0) totalField("Round off", bill.roundOff);
  totalField("TOTAL", bill.total, true);
  totalField(`Paid (${bill.paymentMethod.toUpperCase()})`, bill.paidAmount);
  const due = bill.total - bill.paidAmount;
  if (due > 0 && bill.status !== "cancelled") totalField("Balance due", due);
  if (bill.notes) {
    y += 3;
    pdf.setFont("helvetica", "normal");
    y += addText(`Note: ${bill.notes}`, left, y);
  }
  ensureSpace(12);
  y += 5;
  pdf.setFontSize(8);
  pdf.setTextColor(110);
  pdf.text("Thank you for your business!", pageWidth / 2, y, { align: "center" });

  const filename = (bill.receiptNumber ?? bill.billNumber).replace(/[^\w-]/g, "_");
  pdf.save(`${filename}.pdf`);
}
