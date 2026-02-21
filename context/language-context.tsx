"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "@/lib/i18n/en.json";
import es from "@/lib/i18n/es.json";
import hi from "@/lib/i18n/hi.json";
import pt from "@/lib/i18n/pt.json";
import zh from "@/lib/i18n/zh.json";
import fr from "@/lib/i18n/fr.json";

export type LangCode = "en" | "es" | "hi" | "pt" | "zh" | "fr";

export const LANGUAGES: { code: LangCode; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
    { code: "pt", label: "Português", flag: "🇧🇷" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
];

const TRANSLATIONS: Record<LangCode, Record<string, string>> = { en, es, hi, pt, zh, fr };

type TranslationKeys = keyof typeof en;

interface LanguageContextValue {
    lang: LangCode;
    setLang: (lang: LangCode) => void;
    t: (key: TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
    lang: "en",
    setLang: () => { },
    t: (key) => en[key] ?? key,
});

const STORAGE_KEY = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<LangCode>("en");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
        if (stored && TRANSLATIONS[stored]) setLangState(stored);
    }, []);

    const setLang = useCallback((newLang: LangCode) => {
        console.log("[i18n] setLang called:", newLang);
        setLangState(newLang);
        localStorage.setItem(STORAGE_KEY, newLang);
    }, []);

    const t = useCallback(
        (key: TranslationKeys): string => {
            const result = TRANSLATIONS[lang]?.[key] ?? en[key] ?? key;
            return result;
        },
        [lang]
    );

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

export function useTranslation() {
    const { t } = useContext(LanguageContext);
    return { t };
}
