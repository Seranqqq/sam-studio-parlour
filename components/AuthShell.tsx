"use client";
import { useEffect, useState } from "react";
import { Camera, Sparkles } from "lucide-react";

type Brand = "sam-studio" | "parlour";
const BRANDS = {
  "sam-studio": { name: "Sam Studio", tag: "Every frame tells a story.", Icon: Camera },
  "parlour": { name: "Parlour", tag: "Beauty, beautifully managed.", Icon: Sparkles },
} as const;

export default function AuthShell({
  title, subtitle, children, singleLogin = false,
}: { title: string; subtitle: string; children: React.ReactNode; singleLogin?: boolean }) {
  const [brand, setBrand] = useState<Brand>("sam-studio");

  useEffect(() => {
    try {
      const b = localStorage.getItem("brand");
      if (b === "sam-studio" || b === "parlour") setBrand(b);
    } catch {}
  }, []);

  const pick = (b: Brand) => {
    setBrand(b);
    try { localStorage.setItem("brand", b); } catch {}
  };
  const { name, tag, Icon } = BRANDS[brand];

  if (singleLogin) {
    return (
      <div data-biz="sam-studio" className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
          <div className="mb-5 flex items-center justify-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon size={22} />
            </div>
            <p className="text-xl font-semibold tracking-tight">Sam Studio &amp; Parlour</p>
          </div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div data-biz={brand} className="min-h-screen bg-slate-50 md:grid md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] px-6 pb-14 pt-8 text-white md:p-12">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-10 size-64 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon size={22} />
          </div>
          <p className="text-xl font-semibold tracking-tight">{name}</p>
        </div>
        <div className="relative hidden md:block">
          <p className="text-4xl font-semibold leading-tight">{tag}</p>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            Create bills, send them on WhatsApp and see your daily sales, all in one place.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative -mt-6 flex justify-center rounded-t-3xl bg-slate-50 px-4 pb-10 pt-6 md:mt-0 md:items-center md:rounded-none md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 text-sm font-medium">
            {(Object.keys(BRANDS) as Brand[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => pick(b)}
                className={`rounded-lg py-2 transition-all ${
                  brand === b ? "bg-white text-primary shadow-sm" : "text-slate-600"
                }`}
              >
                {BRANDS[b].name}
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}