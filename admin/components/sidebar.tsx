"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  FileText,
  KeyRound,
  LayoutDashboard,
  Menu,
  Megaphone,
  MessageSquare,
  Shield,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { canAdmin, isSuperAdmin, type AdminPerm } from "@/lib/admin-perms";
import type { Profile } from "@/lib/types";

const LINKS: { href: string; label: string; icon: typeof Users; perm?: AdminPerm | "admins" }[] = [
  { href: "/", label: "Özet", icon: LayoutDashboard },
  { href: "/actors", label: "Oyuncular", icon: Users, perm: "actors" },
  { href: "/casts", label: "Cast ilanları", icon: Clapperboard, perm: "casts" },
  { href: "/applications", label: "Başvurular", icon: FileText, perm: "applications" },
  { href: "/messages", label: "Mesajlar", icon: MessageSquare, perm: "messages" },
  { href: "/announcements", label: "Duyurular", icon: Megaphone, perm: "announcements" },
  { href: "/directors", label: "Cast direktörleri", icon: UserCog, perm: "directors" },
  { href: "/admins", label: "Yöneticiler", icon: Shield, perm: "admins" },
  { href: "/account", label: "Şifre", icon: KeyRound },
];

export function Sidebar({
  email,
  pendingCount,
  profile,
}: {
  email?: string | null;
  pendingCount: number;
  profile: Pick<Profile, "role" | "is_super_admin" | "admin_permissions"> | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const nav = (
    <>
      <div className="shrink-0 px-5 py-6">
        <img
          src="/brand-logo.png"
          alt="Rüzgar Oyunculuk"
          className="mb-3 h-14 w-14 rounded-2xl object-cover md:h-16 md:w-16"
        />
        <p className="font-heading text-2xl tracking-tight">Rüzgar Oyunculuk</p>
        <p className="mt-1 text-xs text-muted-foreground">Admin paneli</p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
        {LINKS.filter((link) => {
          if (!link.perm) return true;
          if (link.perm === "admins") return isSuperAdmin(profile);
          return canAdmin(profile, link.perm);
        }).map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{link.label}</span>
              {link.href === "/actors" && pendingCount > 0 ? (
                <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-4">
        <p className="mb-2 truncate text-xs text-muted-foreground">{email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Çıkış
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar/95 px-3 py-3 backdrop-blur md:hidden print:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Menüyü aç"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <img src="/brand-logo.png" alt="" className="h-9 w-9 rounded-lg object-cover" />
        <p className="min-w-0 flex-1 truncate font-heading text-lg leading-tight">Rüzgar Oyunculuk</p>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-50 bg-black/45 md:hidden print:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,88vw)] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-transform duration-200 print:hidden md:w-64 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex shrink-0 justify-end p-3 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>
        {nav}
      </aside>
      <div className="hidden shrink-0 print:hidden md:block md:w-64" aria-hidden />
    </>
  );
}
