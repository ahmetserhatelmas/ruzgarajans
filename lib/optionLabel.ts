import type { TFunction } from 'i18next';

const GROUPS = [
  'education',
  'profession',
  'hair',
  'eyes',
  'sports',
  'dances',
  'model',
  'performance',
  'special',
  'insurance',
  'passportTypes',
  'gender',
] as const;

export type OptionGroup = (typeof GROUPS)[number];

export function optionLabel(t: TFunction, group: OptionGroup, key?: string | null) {
  if (!key) return '—';
  const path = `regForm.${group}.${key}`;
  const translated = t(path);
  return translated === path ? key : translated;
}

export function optionList(t: TFunction, group: OptionGroup, keys?: string[] | null) {
  if (!keys?.length) return '—';
  return keys.map((key) => optionLabel(t, group, key)).join(', ');
}

export function anyOptionLabel(t: TFunction, key?: string | null) {
  if (!key) return '—';
  for (const group of GROUPS) {
    const path = `regForm.${group}.${key}`;
    const translated = t(path);
    if (translated !== path) return translated;
  }
  return key;
}

export function anyOptionList(t: TFunction, keys?: string[] | null) {
  if (!keys?.length) return '—';
  return keys.map((key) => anyOptionLabel(t, key)).join(', ');
}
