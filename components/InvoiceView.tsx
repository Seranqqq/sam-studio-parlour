import type { Bill } from "@/lib/types";
import { fmtDateTime, inr } from "@/lib/format";

export default function InvoiceView({ bill: b }: { bill: Bill }) {
  const gst = b.billType === "gst";
  const due = b.total - b.paidAmount;
  return (
    <div className="rounded-lg border bg-white p-4 text-sm text-black print:border-0 print:p-0">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{b.business.name}</h2>
          {b.business.address && <p>{b.business.address}</p>}
          {b.business.phone && <p>Ph: {b.business.phone}</p>}
          {gst && b.business.gstin && <p>GSTIN: {b.business.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold">{gst ? "TAX INVOICE" : "BILL"}</p>
          <p>{b.receiptNumber ?? "—"}</p>
          <p>{fmtDateTime(b.createdAt)}</p>
          {b.status === "cancelled" && <p className="font-bold text-red-600">CANCELLED</p>}
        </div>
      </div>

      <div className="mt-3 border-t pt-3">
        <p className="font-medium">Bill to: {b.customer.name}</p>
        {b.customer.phone && <p>Ph: {b.customer.phone}</p>}
        {gst && b.customer.gstin && <p>GSTIN: {b.customer.gstin}</p>}
        {gst && b.customer.state && <p>Place of supply: {b.customer.state}</p>}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="py-1">Item</th>{gst && <th>HSN/SAC</th>}<th className="text-right">Qty</th>
              <th className="text-right">Price</th><th className="text-right">Disc</th>
              {gst && <th className="text-right">GST</th>}<th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {b.items.map((it, i) => (
              <tr key={i} className="border-b">
                <td className="py-1">{it.name}{it.staff ? <span className="text-xs text-slate-500"> ({it.staff})</span> : null}</td>
                {gst && <td>{it.hsn}</td>}
                <td className="text-right">{it.qty}</td>
                <td className="text-right">{inr(it.price)}</td>
                <td className="text-right">{inr(it.discount)}</td>
                {gst && <td className="text-right">{it.gstRate}%</td>}
                <td className="text-right">{inr(it.qty * it.price - it.discount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-3 w-full max-w-xs space-y-1">
        <Row l="Subtotal" v={inr(b.subtotal)} />
        {b.discount > 0 && <Row l="Discount" v={`- ${inr(b.discount)}`} />}
        {gst && <Row l="Taxable value" v={inr(b.taxable)} />}
        {gst && !b.interState && (<><Row l="CGST" v={inr(b.cgst)} /><Row l="SGST" v={inr(b.sgst)} /></>)}
        {gst && b.interState && <Row l="IGST" v={inr(b.igst)} />}
        {b.roundOff !== 0 && <Row l="Round off" v={inr(b.roundOff)} />}
        <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span>{inr(b.total)}</span></div>
        <Row l={`Paid (${b.paymentMethod.toUpperCase()})`} v={inr(b.paidAmount)} />
        {due > 0 && b.status !== "cancelled" && <Row l="Balance due" v={inr(due)} />}
      </div>
      {b.notes && <p className="mt-3 text-slate-600">Note: {b.notes}</p>}
      <p className="mt-4 text-center text-xs text-slate-500">Thank you for your business!</p>
    </div>
  );
}

const Row = ({ l, v }: { l: string; v: string }) => (
  <div className="flex justify-between"><span>{l}</span><span>{v}</span></div>
);