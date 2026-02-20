import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './locales/nl/translation.json';
import en from './locales/en/translation.json';

const savedLanguage = localStorage.getItem('i18nextLng') || 'nl';

i18n.use(initReactI18next).init({
    resources: {
        nl: { translation: nl },
        en: { translation: en }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (lng) => {
    localStorage.setItem('i18nextLng', lng);
});

export default i18n;
