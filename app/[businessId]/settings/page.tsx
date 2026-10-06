"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import { sel } from "@/lib/ui";
import { isBusinessId, type Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  if (!isBusinessId(businessId)) return <p>Pick a single business.</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Profile businessId={businessId} />
      <Services businessId={businessId} />
    </div>
  );
}

function Profile({ businessId }: { businessId: string }) {
  const [p, setP] = useState<any>({ name: "", gstin: "", address: "", state: "", phone: "", defaultTaxRate: 18 });
  const [msg, setMsg] = useState("");
  useEffect(() => { getDoc(doc(db, "businesses", businessId)).then((s) => s.exists() && setP((x: any) => ({ ...x, ...s.data() }))); }, [businessId]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });
  async function save() {
    const { name, gstin, address, state, phone, defaultTaxRate } = p;
    await updateDoc(doc(db, "businesses", businessId), { name, gstin, address, state, phone, defaultTaxRate: Number(defaultTaxRate) });
    setMsg("Saved");
  }
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div><Label>Name</Label><Input value={p.name} onChange={set("name")} /></div>
        <div><Label>GSTIN</Label><Input value={p.gstin} onChange={set("gstin")} /></div>
        <div><Label>State</Label><Input value={p.state} onChange={set("state")} /></div>
        <div><Label>Phone</Label><Input value={p.phone} onChange={set("phone")} /></div>
        <div className="sm:col-span-2"><Label>Address</Label><Input value={p.address} onChange={set("address")} /></div>
        <div><Label>Default GST %</Label><Input type="number" value={p.defaultTaxRate} onChange={set("defaultTaxRate")} /></div>
        <div className="flex items-end gap-3"><Button onClick={save}>Save</Button><span className="text-sm text-green-700">{msg}</span></div>
      </CardContent>
    </Card>
  );
}

function Services({ businessId }: { businessId: string }) {
  const [list, setList] = useState<Service[]>([]);
  const [f, setF] = useState({ name: "", price: "", type: "service", hsn: "", gstRate: "18" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const s = await getDocs(query(collection(db, "services"), where("businessId", "==", businessId)));
    setList(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Service));
  }, [businessId]);
  useEffect(() => { load(); }, [load]);
  async function add() {
    setError("");
    const price = Number(f.price);
    if (!f.name.trim()) return setError("Enter a name");
    if (!f.price.trim() || !Number.isFinite(price) || price < 0) return setError("Enter a valid price");
    try {
      if (editingId) {
        await updateDoc(doc(db, "services", editingId), {
          name: f.name.trim(), price, type: f.type, hsn: f.hsn, gstRate: Number(f.gstRate),
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, "services"), { businessId, name: f.name.trim(), price, type: f.type, hsn: f.hsn, gstRate: Number(f.gstRate), active: true });
      }
      setF({ name: "", price: "", type: "service", hsn: "", gstRate: "18" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save item");
    }
  }
  function editItem(item: Service) {
    setEditingId(item.id);
    setF({
      name: item.name,
      price: String(item.price),
      type: item.type,
      hsn: item.hsn ?? "",
      gstRate: String(item.gstRate),
    });
  }
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Services, products, packages, memberships</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <Input className="col-span-2" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input type="number" placeholder="Price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <select className={sel} value={f.type} disabled={!!editingId} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="service">Service</option><option value="product">Product</option>
            <option value="package">Package</option><option value="membership">Membership</option></select>
          <Input placeholder="HSN/SAC" value={f.hsn} onChange={(e) => setF({ ...f, hsn: e.target.value })} />
          <select className={sel} value={f.gstRate} onChange={(e) => setF({ ...f, gstRate: e.target.value })}>
            {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={add}>{editingId ? "Save changes" : "Add"}</Button>
          {editingId && (
            <Button variant="outline" onClick={() => {
              setEditingId(null);
              setF({ name: "", price: "", type: "service", hsn: "", gstRate: "18" });
            }}>Cancel</Button>
          )}
        </div>
        {list.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span className={s.active ? "" : "text-muted-foreground line-through"}>{s.name} · {s.type} · {inr(s.price)} · {s.gstRate}%</span>
            <span className="space-x-2">
              <button type="button" className="text-blue-600" onClick={() => editItem(s)}>Edit</button>
              <button className="text-blue-600" onClick={async () => { await updateDoc(doc(db, "services", s.id), { active: !s.active }); load(); }}>{s.active ? "Disable" : "Enable"}</button>
              <button className="text-red-600" onClick={async () => { await deleteDoc(doc(db, "services", s.id)); load(); }}>Delete</button>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
