import { useEffect, useRef, useState } from "react";

import { IconCheck, IconChevronDown, IconLanguage } from "@tabler/icons-react";

import { useI18n } from "../i18n";
import { languageOptions } from "../translations";

export default function LanguageSelector() {
    const { language, setLanguage, t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = languageOptions.find((option) => option.value === language) ?? languageOptions[0];

    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-label={t("languageLabel")}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background/80 px-2.5 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
                <IconLanguage size={17} stroke={1.9} aria-hidden="true" />
                <span className="hidden sm:inline">{selected.shortLabel}</span>
                <IconChevronDown className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} size={14} stroke={2} aria-hidden="true" />
            </button>

            {isOpen && (
                <div role="listbox" aria-label={t("languageLabel")} className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-40 rounded-md border border-border/80 bg-background/85 p-1 shadow-lg shadow-black/10 backdrop-blur-xl animate-[fadeIn_0.12s_ease-out]">
                    {languageOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={option.value === language}
                            onClick={() => {
                                setLanguage(option.value);
                                setIsOpen(false);
                            }}
                            className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent aria-selected:bg-accent"
                        >
                            <span className="flex-1">{option.label}</span>
                            {option.value === language && <IconCheck size={15} stroke={2.2} aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
