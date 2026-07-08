import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { buildResources } from './texts.js';

const STORAGE_KEY = 'sailingloc_lang';
const storedLang = localStorage.getItem(STORAGE_KEY);
const { fr, en } = buildResources();

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: storedLang === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
