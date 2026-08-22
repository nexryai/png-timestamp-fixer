import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { type Language, type TranslationKey, translations } from "./translations";

export type { Language, TranslationKey } from "./translations";

const STORAGE_KEY = "png-timestamp-fixer-language";

export function resolveLanguage(languages: readonly string[]): Language {
    for (const language of languages) {
        const normalized = language.toLowerCase().replace("_", "-");
        if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
        if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN";
        if (normalized === "en" || normalized.startsWith("en-")) return "en";
    }
    return "en";
}

function getInitialLanguage(): Language {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "zh-CN" || stored === "ja") return stored;
        return resolveLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
    } catch {
        return "en";
    }
}

interface I18nContextValue {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(getInitialLanguage);

    useEffect(() => {
        document.documentElement.lang = language;
        document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", translations[language].documentDescription);
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch {
            // Language selection still works when storage is unavailable.
        }
    }, [language]);

    const value = useMemo<I18nContextValue>(() => {
        const t = (key: TranslationKey, values?: Record<string, string | number>) => {
            let text = translations[language][key];
            if (!values) return text;
            for (const [name, replacement] of Object.entries(values)) {
                text = text.replaceAll(`{${name}}`, String(replacement));
            }
            return text;
        };
        return { language, setLanguage, t };
    }, [language]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);
    if (!context) throw new Error("useI18n must be used within I18nProvider");
    return context;
}
