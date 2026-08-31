import type { Profile } from "@/lib/types";

export const ADMIN_PERMS = [
  "actors",
  "casts",
  "applications",
  "messages",
  "announcements",
  "directors",
  "export_actors",
  "export_applications",
  "actor_approvals",
] as const;

export type AdminPerm = (typeof ADMIN_PERMS)[number];

export const ADMIN_PERM_LABELS: Record<AdminPerm, string> = {
  actors: "Oyuncular",
  casts: "Cast ilanları",
  applications: "Başvurular",
  messages: "Mesajlar",
  announcements: "Duyurular",
  directors: "Cast direktörleri",
  export_actors: "Oyuncu profili indirme",
  export_applications: "Başvuru indirme",
  actor_approvals: "Üyelik onayları",
};

export const ADMIN_PERM_GROUPS: { title: string; perms: AdminPerm[] }[] = [
  {
    title: "Bölümler",
    perms: ["actors", "casts", "applications", "messages", "announcements", "directors"],
  },
  {
    title: "İşlemler",
    perms: ["export_actors", "export_applications", "actor_approvals"],
  },
];

export function canAdmin(
  profile: Pick<Profile, "role" | "is_super_admin" | "admin_permissions"> | null,
  perm: AdminPerm,
) {
  if (!profile || profile.role !== "admin") return false;
  if (profile.is_super_admin) return true;
  return (profile.admin_permissions ?? []).includes(perm);
}

export function isSuperAdmin(profile: Pick<Profile, "role" | "is_super_admin"> | null) {
  return profile?.role === "admin" && Boolean(profile.is_super_admin);
}
