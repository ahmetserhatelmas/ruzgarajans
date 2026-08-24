"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Shield,
  UserCog,
  Users,
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

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar print:hidden">
      <div className="px-5 py-6">
        <img src="/brand-logo.png" alt="Rüzgâr Oyunculuk" className="mb-3 h-16 w-16 rounded-2xl object-cover" />
        <p className="font-heading text-2xl tracking-tight">Rüzgâr Oyunculuk</p>
        <p className="mt-1 text-xs text-muted-foreground">Admin paneli</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {LINKS.filter((link) => {
          if (!link.perm) return true;
          if (link.perm === "admins") return isSuperAdmin(profile);
          return canAdmin(profile, link.perm);
        }).map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="size-4" />
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
      <div className="border-t border-sidebar-border p-4">
        <p className="mb-2 truncate text-xs text-muted-foreground">{email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Çıkış
          </Button>
        </form>
      </div>
    </aside>
  );
}
