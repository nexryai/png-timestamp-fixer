import { useEffect, useMemo, useRef, useState } from "react";

import { IconCheck, IconChevronDown, IconClock } from "@tabler/icons-react";

interface TimezoneSelectorProps {
    value: number;
    onChange: (offset: number) => void;
}

function getTimezoneOptions(): { label: string; offset: number }[] {
    const options: { label: string; offset: number }[] = [];
    for (let h = -12; h <= 14; h++) {
        const sign = h >= 0 ? "+" : "";
        options.push({ label: `UTC${sign}${h}`, offset: h });
    }
    return options;
}

/** Get the browser's default timezone offset in hours (e.g., +9 for JST) */
export function getBrowserTimezoneOffset(): number {
    return -(new Date().getTimezoneOffset() / 60);
}

export default function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
    const options = useMemo(() => getTimezoneOptions(), []);
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedLabel = options.find((option) => option.offset === value)?.label ?? `UTC${value >= 0 ? "+" : ""}${value}`;

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [isOpen]);

    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='option']"));
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

        if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            rootRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='listbox']")?.focus();
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            items[(currentIndex + 1) % items.length]?.focus();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            items[(currentIndex - 1 + items.length) % items.length]?.focus();
        } else if (event.key === "Home") {
            event.preventDefault();
            items[0]?.focus();
        } else if (event.key === "End") {
            event.preventDefault();
            items.at(-1)?.focus();
        }
    };

    const openMenu = () => {
        setIsOpen(true);
        requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>("[role='option'][aria-selected='true']")?.focus());
    };

    return (
        <div className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <label htmlFor="timezone-select" className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-foreground">
                <IconClock size={17} stroke={1.9} aria-hidden="true" />
                タイムゾーン
            </label>
            <div ref={rootRef} className="relative flex-1">
                <button
                    id="timezone-select"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
                    onKeyDown={(event) => {
                        if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                            event.preventDefault();
                            openMenu();
                        }
                    }}
                    className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                    <span>{selectedLabel}</span>
                    <IconChevronDown className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} size={15} stroke={2} aria-hidden="true" />
                </button>

                {isOpen && (
                    <div
                        role="listbox"
                        aria-label="タイムゾーン"
                        onKeyDown={handleMenuKeyDown}
                        className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-56 overflow-y-auto rounded-md border border-border/80 bg-background/80 p-1 shadow-lg shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 animate-[fadeIn_0.12s_ease-out]"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.offset}
                                type="button"
                                role="option"
                                aria-selected={opt.offset === value}
                                onClick={() => {
                                    onChange(opt.offset);
                                    setIsOpen(false);
                                    rootRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='listbox']")?.focus();
                                }}
                                className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent aria-selected:bg-accent"
                            >
                                <span className="flex-1">{opt.label}</span>
                                {opt.offset === value && <IconCheck className="text-foreground" size={15} stroke={2.2} aria-hidden="true" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
