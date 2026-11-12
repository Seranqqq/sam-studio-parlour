"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/firebase";
import { addDays, dateParts, inr } from "@/lib/format";
import { useBusinessId } from "@/lib/use-business-id";
import { receiptNumberForBill, type Bill } from "@/lib/types";
import Stat from "@/components/ui/Stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TodayTotals {
  revenue: number;
  billCount: number;
  gstCount: number;
  normalCount: number;
  cash: number;
  upi: number;
}

interface DashboardData {
  today: TodayTotals;
  week: { date: string; revenue: number; bills: number }[];
  staff: { name: string; revenue: number; services: number; bills: number }[];
  recent: Bill[];
}

export default function Dashboard() {
  const businessId = useBusinessId();
  const [today, setToday] = useState<TodayTotals | null>(null);
  const [week, setWeek] = useState<{ date: string; revenue: number; bills: number }[]>([]);
  const [staff, setStaff] = useState<DashboardData["staff"]>([]);
  const [recent, setRecent] = useState<Bill[]>([]);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (): Promise<DashboardData> => {
    const t = dateParts(Date.now()).dateKey;
    const start = addDays(t, -6);
    const businesses = businessId === "all" ? ["sam-studio", "parlour"] : [businessId];
    const [weekSnapshot, ...recentSnapshots] = await Promise.all([
      getDocs(query(collection(db, "bills"), where("dateKey", ">=", start), where("dateKey", "<=", t))),
      ...businesses.map((id) => getDocs(query(collection(db, "bills"), where("businessId", "==", id),
        orderBy("createdAt", "desc"), limit(5)))),
    ]);
    const bills = weekSnapshot.docs
      .map((d) => ({ ...(d.data() as Bill), id: d.id }))
      .filter((bill) => businesses.includes(bill.businessId) && bill.status !== "cancelled");
    const daily = new Map<string, { date: string; revenue: number; bills: number }>();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(start, offset);
      daily.set(date, { date, revenue: 0, bills: 0 });
    }
    const totals: TodayTotals = { revenue: 0, billCount: 0, gstCount: 0, normalCount: 0, cash: 0, upi: 0 };
    const staffTotals = new Map<string, { revenue: number; services: number; bills: Set<string> }>();
    bills.forEach((bill) => {
      const day = daily.get(bill.dateKey);
      if (day) {
        day.revenue += bill.total;
        day.bills += 1;
      }
      if (bill.businessId === "parlour") {
        bill.items.forEach((item) => {
          const name = item.staff?.trim() || "Unassigned";
          const performance = staffTotals.get(name) ?? { revenue: 0, services: 0, bills: new Set<string>() };
          performance.revenue += item.qty * item.price - item.discount;
          performance.services += item.qty;
          performance.bills.add(bill.id);
          staffTotals.set(name, performance);
        });
      }
      if (bill.dateKey === t) {
        totals.revenue += bill.total;
        totals.billCount += 1;
        if (bill.paymentMethod === "cash") totals.cash += bill.total;
        if (bill.paymentMethod === "upi") totals.upi += bill.total;
        if (bill.billType === "gst") totals.gstCount += 1;
        else totals.normalCount += 1;
      }
    });
    return {
      today: totals,
      week: [...daily.values()],
      staff: [...staffTotals.entries()]
        .map(([name, performance]) => ({
          name,
          revenue: performance.revenue,
          services: performance.services,
          bills: performance.bills.size,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      recent: recentSnapshots.flatMap((snapshot) => snapshot.docs.map((d) => ({ ...(d.data() as Bill), id: d.id })))
        .sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    };
  }, [businessId]);

  useEffect(() => {
    let active = true;
    void fetchDashboard().then((data) => {
      if (!active) return;
      setError("");
      setToday(data.today);
      setWeek(data.week);
      setStaff(data.staff);
      setRecent(data.recent);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Could not load dashboard");
    });
    return () => { active = false; };
  }, [fetchDashboard]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Today's revenue" value={inr(today?.revenue ?? 0)} />
        <Stat label="Bills today" value={today?.billCount ?? 0} sub={`${today?.gstCount ?? 0} GST · ${today?.normalCount ?? 0} normal`} />
        <Stat label="Cash today" value={inr(today?.cash ?? 0)} />
        <Stat label="UPI today" value={inr(today?.upi ?? 0)} />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Last 7 days</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={week}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line dataKey="revenue" stroke="var(--chart-primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {businessId === "parlour" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Staff performance · Last 7 days</CardTitle></CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff services in the last 7 days.</p>
            ) : (
              <div className="space-y-3">
                {staff.map((member) => (
                  <div key={member.name} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.services} services · {member.bills} bills</p>
                    </div>
                    <p className="shrink-0 font-semibold">{inr(member.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent bills</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.map((b) => (
              <Link key={b.id} href={`/${businessId}/bills/${b.id}`} className="flex items-center justify-between text-sm">
                <span>{receiptNumberForBill(b)} · {b.customer.name}</span>
                <span className="flex items-center gap-2">{inr(b.total)} <Badge variant="outline">{b.status}</Badge></span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}