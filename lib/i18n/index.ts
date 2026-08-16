import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tr from './tr';
import en from './en';

export const LANGUAGE_KEY = 'ruzgar.locale';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

export async function initI18n(preferred?: string | null) {
  let lng = preferred ?? null;
  if (!lng) {
    lng = await AsyncStorage.getItem(LANGUAGE_KEY);
  }
  if (!lng) {
    const device = Localization.getLocales()[0]?.languageCode;
    lng = device === 'en' ? 'en' : 'tr';
  }

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'tr',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
  } else if (lng !== i18n.language) {
    await i18n.changeLanguage(lng);
  }

  return i18n;
}

export async function setAppLanguage(lng: 'tr' | 'en') {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
