import type { Profile } from '@/types/database';

export const ADMIN_PERMS = [
  'actors',
  'casts',
  'applications',
  'messages',
  'announcements',
  'directors',
] as const;

export type AdminPerm = (typeof ADMIN_PERMS)[number];

export function canAdmin(
  profile: Pick<Profile, 'role' | 'is_super_admin' | 'admin_permissions'> | null | undefined,
  perm: AdminPerm
) {
  if (!profile || profile.role !== 'admin') return false;
  if (profile.is_super_admin) return true;
  return (profile.admin_permissions ?? []).includes(perm);
}
