'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, Translations } from './types';
import ko from './locales/ko';
import en from './locales/en';
import zh from './locales/zh';
import ja from './locales/ja';

const dictionaries: Record<Locale, Translations> = { ko, en, zh, ja };

const LOCALE_STORAGE_KEY = 'faceHitmapLocale';

function detectLocale(): Locale {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && stored in dictionaries) return stored as Locale;
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    if (browserLang === 'ko') return 'ko';
    if (browserLang === 'zh') return 'zh';
    if (browserLang === 'ja') return 'ja';
    return 'en';
}

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Translations;
}

const I18nContext = createContext<I18nContextType>({
    locale: 'en',
    setLocale: () => { },
    t: en,
});

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        setLocaleState(detectLocale());
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        }
    }, []);

    const t = dictionaries[locale];

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}

export default I18nContext;
