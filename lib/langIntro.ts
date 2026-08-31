import { Alert, InteractionManager } from 'react-native';
import type { TFunction } from 'i18next';
import { languageLabel, parseLanguageSkills } from '@/constants/languages';

export const LANG_INTRO_KIND = 'lang_intro' as const;
export const LANG_INTRO_MAX = 2;

export function foreignLanguageCodes(raw?: string[] | null): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const row of parseLanguageSkills(raw)) {
    const code = row.code.trim().toLowerCase();
    if (!code || code === 'tr' || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

export function pickLangIntroThen(
  t: TFunction,
  locale: string,
  languages: string[] | null | undefined,
  onPick: (lang?: string) => void
) {
  const codes = foreignLanguageCodes(languages);
  if (codes.length === 0) {
    onPick();
    return;
  }
  if (codes.length === 1) {
    onPick(codes[0]);
    return;
  }
  Alert.alert(t('media.videos.langIntroPick'), undefined, [
    ...codes.slice(0, 4).map((code) => ({
      text: languageLabel(code, locale),
      onPress: () => onPick(code),
    })),
    { text: t('common.cancel'), style: 'cancel' as const },
  ]);
}

export function offerLangIntroRecord(opts: {
  t: TFunction;
  count: number;
  onRecord: () => void;
  onSkip: () => void;
}) {
  if (opts.count >= LANG_INTRO_MAX) {
    opts.onSkip();
    return;
  }
  Alert.alert(opts.t('media.videos.langIntroAskTitle'), opts.t('media.videos.langIntroAskBody'), [
    { text: opts.t('common.notNow'), style: 'cancel', onPress: opts.onSkip },
    { text: opts.t('media.videos.langIntroRecord'), onPress: opts.onRecord },
  ]);
}

/** Leave the record screen first; ask only after that screen is gone. */
export function offerLangIntroAfterLeave(opts: {
  t: TFunction;
  count: number;
  leave: () => void;
  onRecord: () => void;
}) {
  opts.leave();
  if (opts.count >= LANG_INTRO_MAX) return;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      Alert.alert(opts.t('media.videos.langIntroAskTitle'), opts.t('media.videos.langIntroAskBody'), [
        { text: opts.t('common.notNow'), style: 'cancel' },
        { text: opts.t('media.videos.langIntroRecord'), onPress: opts.onRecord },
      ]);
    }, 350);
  });
}
