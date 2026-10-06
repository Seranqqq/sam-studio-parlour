"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/firebase";
import { inr, rangeFor, type Preset } from "@/lib/format";
import { loadSummaries, type Agg } from "@/lib/summaries";
import Stat from "@/components/ui/Stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];
type Row = { name: string; value: number };
const rows = (m: Record<string, number> = {}): Row[] =>
  Object.entries(m).map(([name, value]) => ({ name: name.replace(/_/g, " "), value: Math.round(value) })).sort((a, b) => b.value - a.value);

function Box({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">{empty ? <p className="text-sm text-muted-foreground">No data</p> : children}</CardContent>
    </Card>
  );
}
const Bars = ({ title, data }: { title: string; data: Row[] }) => (
  <Box title={title} empty={!data.length}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
        <Bar dataKey="value" fill="#2563eb" /></BarChart>
    </ResponsiveContainer>
  </Box>
);
const Pie2 = ({ title, data }: { title: string; data: Row[] }) => (
  <Box title={title} empty={!data.some((d) => d.value)}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
    </ResponsiveContainer>
  </Box>
);

export default function Reports() {
  const { businessId } = useParams<{ businessId: string }>();
  const [preset, setPreset] = useState<Preset>("month");
  const [cf, setCf] = useState("");
  const [ct, setCt] = useState("");
  const [a, setA] = useState<Agg | null>(null);
  const [top, setTop] = useState<Row[]>([]);
  const [repeat, setRepeat] = useState<number | null>(null);
  const { from, to } = rangeFor(preset, cf, ct);

  useEffect(() => { loadSummaries(businessId, from, to).then(setA); }, [businessId, from, to]);
  useEffect(() => {
    const ids = businessId === "all" ? ["sam-studio", "parlour"] : [businessId];
    getDocs(query(collection(db, "customers"), where("businessId", "in", ids), orderBy("totalSpent", "desc"), limit(5)))
      .then((s) => setTop(s.docs.map((d) => ({ name: d.data().name, value: d.data().totalSpent }))));
    if (businessId === "sam-studio")
      getCountFromServer(query(collection(db, "customers"), where("businessId", "==", businessId), where("billCount", ">=", 2)))
        .then((c) => setRepeat(c.data().count));
    else setRepeat(null);
  }, [businessId]);

  const avg = a && a.billCount ? a.revenue / a.billCount : 0;
  const hours = Object.entries(a?.byHour ?? {}).map(([h, v]) => ({ name: `${h}:00`, value: Math.round(v), n: Number(h) })).sort((x, y) => x.n - y.n);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="flex flex-wrap items-center gap-2">
        {([["today", "Today"], ["7d", "7 days"], ["month", "This month"], ["custom", "Custom"]] as [Preset, string][]).map(([k, l]) => (
          <Button key={k} size="sm" variant={preset === k ? "default" : "outline"} onClick={() => setPreset(k)}>{l}</Button>))}
        {preset === "custom" && (<><Input className="w-40" type="date" value={cf} onChange={(e) => setCf(e.target.value)} />
          <Input className="w-40" type="date" value={ct} onChange={(e) => setCt(e.target.value)} /></>)}
        <span className="text-xs text-muted-foreground">{from} to {to}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total revenue" value={inr(a?.revenue ?? 0)} />
        <Stat label="Bills" value={a?.billCount ?? 0} sub={`${a?.gstCount ?? 0} GST · ${a?.normalCount ?? 0} normal`} />
        <Stat label="Average bill" value={inr(avg)} />
        <Stat label="GST collected" value={inr(a?.taxCollected ?? 0)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Box title="Revenue trend" empty={!a?.days.length}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={a?.days ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line dataKey="revenue" stroke="#2563eb" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </Box>
        <Pie2 title="Paid vs unpaid" data={[{ name: "Paid", value: Math.round(a?.paid ?? 0) }, { name: "Unpaid", value: Math.round(a?.unpaid ?? 0) }]} />
        <Pie2 title="Payment methods" data={rows(a?.byMethod)} />
        <Pie2 title="Normal vs GST bills" data={[{ name: "Normal", value: a?.normalCount ?? 0 }, { name: "GST", value: a?.gstCount ?? 0 }]} />
        <Bars title="Top customers (lifetime)" data={top} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">GST by rate</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {rows(a?.byGstRate).length === 0 && <p className="text-muted-foreground">No GST bills</p>}
            {Object.entries(a?.byGstRate ?? {}).map(([r, v]) => (
              <div key={r} className="flex justify-between"><span>{r.replace("_", ".")}%</span><span>{inr(v)}</span></div>))}
          </CardContent>
        </Card>
      </div>

      {businessId === "sam-studio" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Bars title="Revenue by package / session" data={rows(a?.byService)} />
          <Pie2 title="Advance vs balance vs full payments" data={rows(a?.byPayType)} />
          <Stat label="Repeat clients (2+ bills)" value={repeat ?? 0} />
        </div>
      )}
      {businessId === "parlour" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Bars title="Revenue by service" data={rows(a?.byService)} />
          <Bars title="Stylist performance" data={rows(a?.byStaff)} />
          <Bars title="Peak hours" data={hours} />
          <Stat label="Membership sales" value={inr(a?.byType?.membership ?? 0)} />
        </div>
      )}
    </div>
  );
}