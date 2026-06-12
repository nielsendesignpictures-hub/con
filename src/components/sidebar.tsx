"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  MapPin,
  Tags,
  Bell,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/handling", label: "Handling kræves", icon: AlertTriangle },
  { href: "/kontrakter", label: "Kontrakter", icon: FileText },
  { href: "/lokationer", label: "Lokationer", icon: MapPin },
  { href: "/kategorier", label: "Kategorier", icon: Tags },
  { href: "/notifikationer", label: "Notifikationer", icon: Bell },
];

export function Sidebar({
  isAdmin,
  userName,
  unreadCount,
  actionCount,
}: {
  isAdmin: boolean;
  userName: string;
  unreadCount: number;
  actionCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const badge =
          href === "/handling" ? actionCount : href === "/notifikationer" ? unreadCount : 0;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  href === "/handling"
                    ? "bg-status-red/20 text-status-red"
                    : "bg-primary/20 text-primary"
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
            pathname.startsWith("/admin")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <Shield size={16} />
          Administration
        </Link>
      )}
    </nav>
  );

  return (
    <>
      {/* Mobil topbar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <span className="text-sm font-semibold">Kontraktstyring</span>
        <button onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {open && (
        <div className="border-b border-border p-3 md:hidden">
          {nav}
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60"
          >
            <LogOut size={16} /> Log ud
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-3 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileText size={16} />
          </div>
          <div className="text-sm font-semibold">Kontraktstyring</div>
        </div>
        {nav}
        <div className="border-t border-border pt-3">
          <div className="truncate px-3 pb-2 text-xs text-muted-foreground">{userName}</div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <LogOut size={16} /> Log ud
          </button>
        </div>
      </aside>
    </>
  );
}
