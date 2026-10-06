"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { BarChart3, Camera, FilePlus2, LayoutDashboard, LogOut, Menu, Receipt, Settings, Sparkles, Users, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BUSINESSES, isBusinessId } from "@/lib/types";
import { sel } from "@/lib/ui";
import { Button } from "@/components/ui/button";

const NAV = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["create-bill", "Create Bill", FilePlus2],
  ["bills", "Bills History", Receipt],
  ["customers", "Customers", Users],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
] as const;
const ALL_OK = ["dashboard", "reports"];
const BRANDING = {
  "sam-studio": { tagline: "Every frame tells a story.", Icon: Camera },
  parlour: { tagline: "Beauty, beautifully managed.", Icon: Sparkles },
} as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>();
  const path = usePathname();
  const router = useRouter();
  const { user, role, businessIds, loading, error } = useAuth();
  const [open, setOpen] = useState(false);
  const parts = path.split("/");
  const section = parts[2] ?? "dashboard";
  const allowed = role === "owner" ? ["sam-studio", "parlour", "all"] : businessIds;

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.replace("/login");
    if (!role) return;
    if (!allowed.includes(businessId) || !(isBusinessId(businessId) || businessId === "all"))
      return void router.replace("/");
    const staffOk = section === "create-bill" || (section === "bills" && parts.length > 3 && !path.endsWith("/edit"));
    if (role === "staff" && !staffOk) return void router.replace(`/${businessId}/create-bill`);
    if (businessId === "all" && !ALL_OK.includes(section)) router.replace("/all/dashboard");
  }, [loading, user, role, businessId, section, path]); // eslint-disable-line

  // close the drawer on navigation
  useEffect(() => setOpen(false), [path]);

  // Esc closes the drawer, and the page behind it doesn't scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (loading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (user && !role) return <p className="p-8 text-sm">Your account has no role yet. Ask the owner to set you up.</p>;
  if (!user || !role) return null;

  const nav = NAV.filter(([k]) => role === "owner" || k === "create-bill").filter(
    ([k]) => businessId !== "all" || ALL_OK.includes(k)
  );
  const bizName = isBusinessId(businessId) ? BUSINESSES[businessId].name : "All businesses";
  const brand = isBusinessId(businessId) ? BRANDING[businessId] : null;
  const pageTitle = NAV.find(([k]) => k === section)?.[1] ?? "";

  const links = (mobile: boolean) =>
    nav.map(([k, label, Icon]) => (
      <Link
        key={k}
        href={`/${businessId}/${k}`}
        className={`mb-1 flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
          mobile ? "py-3" : "py-2.5"
        } ${section === k ? "bg-primary/10 font-semibold text-primary" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <Icon size={19} /> {label}
      </Link>
    ));

  return (
    <div data-biz={businessId} className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-60 shrink-0 border-r bg-white p-4 md:sticky md:top-0 md:block md:h-screen">
        <div className="mb-6 rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] p-4 text-white">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            {brand ? <brand.Icon size={22} /> : <LayoutDashboard size={22} />}
          </div>
          <p className="text-lg font-semibold leading-tight">{bizName}</p>
          <p className="mt-1 text-xs text-white/80">{brand?.tagline ?? "Billing dashboard"}</p>
        </div>
        {links(false)}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex items-center gap-2 border-b border-white/15 bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] px-3 py-2 text-white shadow-sm">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl text-white hover:bg-white/10 active:scale-95 md:hidden"
          >
            <Menu size={22} />
          </button>
          <p className="truncate text-base font-semibold text-white md:hidden">{pageTitle}</p>

          <select
            className={`${sel} ml-auto max-w-[170px] border-white/30 bg-white/10 font-medium text-white md:ml-0 md:max-w-[200px]`}
            value={businessId}
            onChange={(e) => {
              const v = e.target.value;
              router.push(`/${v}/${v === "all" && !ALL_OK.includes(section) ? "dashboard" : section}`);
            }}
          >
            {allowed.map((b) => (
              <option key={b} value={b} className="text-slate-900">
                {b === "all" ? "All businesses" : BUSINESSES[b as keyof typeof BUSINESSES].name}
              </option>
            ))}
          </select>

          <span className="ml-auto hidden text-xs text-white/80 md:block">
            {user.email} ({role})
          </span>
          <Button variant="outline" size="sm" className="hidden border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white md:inline-flex" onClick={() => signOut(auth)}>
            <LogOut size={16} /> Sign out
          </Button>
        </header>

        <main className="mx-auto max-w-5xl p-3 md:p-6">{children}</main>
      </div>

      {/* Mobile drawer: slides in from the left */}
      <div className={`no-print fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="relative bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] p-5 pt-8 text-white">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            >
              <X size={18} />
            </button>
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold">
              {brand ? <brand.Icon size={22} /> : <LayoutDashboard size={22} />}
            </div>
            <p className="text-lg font-semibold leading-tight">{bizName}</p>
            <p className="mt-0.5 text-xs text-white/80">{brand?.tagline ?? "Billing dashboard"}</p>
            <p className="mt-0.5 truncate text-xs opacity-80">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium capitalize">
              {role}
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">{links(true)}</nav>

          <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" className="h-11 w-full text-red-600" onClick={() => signOut(auth)}>
              <LogOut size={17} /> Sign out
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}