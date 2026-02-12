import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, languages, isRTL, getTranslation } from '../i18n/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('clockln_language') || 'en';
  });

  const [direction, setDirection] = useState(() => {
    const savedLang = localStorage.getItem('clockln_language') || 'en';
    return isRTL(savedLang) ? 'rtl' : 'ltr';
  });

  const setLanguage = useCallback((langCode) => {
    setLanguageState(langCode);
    localStorage.setItem('clockln_language', langCode);
    
    const rtl = isRTL(langCode);
    setDirection(rtl ? 'rtl' : 'ltr');
    
    // Update document direction
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = langCode.replace('_', '-');
  }, []);

  useEffect(() => {
    // Set initial direction
    const rtl = isRTL(language);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language.replace('_', '-');
  }, [language]);

  const t = useCallback((key) => {
    return getTranslation(language, key);
  }, [language]);

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        direction,
        isRTL: direction === 'rtl',
        t,
        languages,
        currentLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
