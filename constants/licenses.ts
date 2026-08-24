/** Turkish driving-licence classes stored in actor_profiles.driving_info. */
export const LICENSE_CLASSES = [
  'M',
  'A1',
  'A2',
  'A',
  'B1',
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'F',
  'G',
] as const;

export type LicenseClass = (typeof LICENSE_CLASSES)[number];

const NO_MARKERS = /^(hayır|hayir|no|yok)$/i;

export function parseDrivingLicenses(raw?: string | null): {
  yes: boolean | null;
  licenses: string[];
} {
  if (!raw?.trim()) return { yes: null, licenses: [] };
  const value = raw.trim();
  if (NO_MARKERS.test(value)) return { yes: false, licenses: [] };
  const licenses = value
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return { yes: true, licenses };
}

export function serializeDrivingLicenses(
  yes: boolean | null,
  licenses: string[],
  noLabel: string
): string | null {
  if (yes === null) return null;
  if (!yes) return noLabel;
  const unique = [...new Set(licenses.map((item) => item.trim()).filter(Boolean))];
  return unique.length ? unique.join(', ') : null;
}
