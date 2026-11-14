"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Camera, FilePlus2, LayoutDashboard, Loader2, LogOut, Menu, Receipt, Settings, Sparkles, Users, X } from "lucide-react";
import { BUSINESSES, isBusinessId } from "@/lib/types";
import { useBusinessId } from "@/lib/use-business-id";
import { useAuth } from "@/lib/auth-context";
import { sel } from "@/lib/ui";

const NAV = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["create-bill", "Create Bill", FilePlus2],
  ["bills", "Bills History", Receipt],
  ["customers", "Customers", Users],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
] as const;
const ALL_OK = ["dashboard", "reports"];
const BUSINESS_OPTIONS = ["sam-studio", "parlour", "all"] as const;
const BRANDING = {
  "sam-studio": { Icon: Camera },
  parlour: { Icon: Sparkles },
} as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, logout } = useAuth();
  const businessId = useBusinessId();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const parts = path.split("/");
  const section = parts[2] ?? "dashboard";

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(path)}`);
    }
  }, [authLoading, user, router, path]);

  useEffect(() => {
    if (!isBusinessId(businessId) && businessId !== "all") {
      router.replace("/sam-studio/dashboard");
      return;
    }
    if (businessId === "all" && !ALL_OK.includes(section)) router.replace("/all/dashboard");
  }, [router, businessId, section]);

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

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
            <Image
              src="/logos/Samstudiologo.jpg.jpeg"
              alt="Sam Studio Logo"
              width={64}
              height={64}
              className="size-full object-cover"
              priority
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Loader2 className="size-4 animate-spin text-slate-700" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  const nav = NAV.filter(([k]) => businessId !== "all" || ALL_OK.includes(k));
  const bizName = isBusinessId(businessId) ? BUSINESSES[businessId].name : "All businesses";
  const logo = isBusinessId(businessId) ? BUSINESSES[businessId].logo : null;
  const brand = isBusinessId(businessId) ? BRANDING[businessId] : null;
  const pageTitle = NAV.find(([k]) => k === section)?.[1] ?? "";

  const links = (mobile: boolean) =>
    nav.map(([k, label, Icon]) => (
      <Link
        key={k}
        href={`/${encodeURIComponent(businessId)}/${k}`}
        className={`mb-1 flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${mobile ? "py-3" : "py-2.5"
          } ${section === k ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}
      >
        <Icon size={19} /> {label}
      </Link>
    ));

  return (
    <div
      data-biz={businessId}
      className="min-h-screen bg-background text-foreground md:flex"
    >
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-60 shrink-0 border-r bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="mb-6 rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] p-4 text-white">
          <div className="mb-3 flex size-20 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/15">
            {logo ? <Image src={logo} alt={`${bizName} logo`} width={44} height={44} className="size-full object-cover" /> : <LayoutDashboard size={45} />}
          </div>
          <p className="text-lg font-semibold leading-tight">{bizName}</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto">{links(false)}</nav>

        {/* User session & Logout */}
        <div className="mt-auto border-t border-slate-100 pt-3">
          <div className="mb-2 px-3">
            <p className="truncate text-xs font-medium text-muted-foreground" title={user.email ?? ""}>
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-95 cursor-pointer"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
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

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <select
              className={`${sel} max-w-[170px] border-white/30 bg-white/10 font-medium text-white md:max-w-[200px]`}
              value={businessId}
              onChange={(e) => {
                const v = e.target.value;
                router.push(`/${encodeURIComponent(v)}/${v === "all" && !ALL_OK.includes(section) ? "dashboard" : section}`);
              }}
            >
              {BUSINESS_OPTIONS.map((b) => (
                <option key={b} value={b} className="text-slate-900">
                  {b === "all" ? "All businesses" : BUSINESSES[b as keyof typeof BUSINESSES].name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="mx-auto max-w-5xl p-3 md:p-6">{children}</main>
      </div>

      {/* Mobile drawer: slides in from the left */}
      <div className={`no-print fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"
            }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"
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
            <div className="mb-3 flex size-12 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/15 text-lg font-bold">
              {logo ? <Image src={logo} alt={`${bizName} logo`} width={48} height={48} className="size-full object-cover" /> : <LayoutDashboard size={22} />}
            </div>
            <p className="text-lg font-semibold leading-tight">{bizName}</p>
            <p className="mt-0.5 text-xs text-white/80">{"Billing dashboard"}</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">{links(true)}</nav>

          {/* Mobile User session & Logout */}
          <div className="border-t border-slate-100 p-4">
            <p className="mb-2 truncate text-xs font-medium text-muted-foreground">
              {user.email}
            </p>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-95"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
