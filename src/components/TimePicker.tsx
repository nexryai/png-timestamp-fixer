import { useEffect, useRef, useState } from "react";

import { IconCheck, IconChevronDown, IconClock } from "@tabler/icons-react";

import { useI18n } from "../i18n";

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
}

function parseTime(value: string): [number, number, number] {
    const [hour = 0, minute = 0, second = 0] = value.split(":").map(Number);
    return [hour, minute, second];
}

const ranges = [Array.from({ length: 24 }, (_, value) => value), Array.from({ length: 60 }, (_, value) => value), Array.from({ length: 60 }, (_, value) => value)] as const;
export default function TimePicker({ value, onChange }: TimePickerProps) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = parseTime(value);
    const labels = [t("hour"), t("minute"), t("second")];

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

    const updatePart = (partIndex: number, nextValue: number) => {
        const next = [...selected];
        next[partIndex] = nextValue;
        onChange(next.map((part) => String(part).padStart(2, "0")).join(":"));
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                id="dialog-time"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
                <IconClock className="text-muted-foreground" size={16} stroke={1.9} aria-hidden="true" />
                <span className="flex-1 text-left tabular-nums">{value || t("chooseTime")}</span>
                <IconChevronDown className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} size={15} stroke={2} aria-hidden="true" />
            </button>

            {isOpen && (
                <div role="dialog" aria-label={t("chooseTime")} className="absolute left-0 top-[calc(100%+0.4rem)] z-[60] w-full min-w-64 rounded-md border border-border/80 bg-background/85 p-3 shadow-lg shadow-black/10 backdrop-blur-xl animate-[fadeIn_0.12s_ease-out]">
                    <div className="grid grid-cols-3 gap-2">
                        {ranges.map((values, partIndex) => (
                            <div key={labels[partIndex]}>
                                <p className="mb-1.5 text-center text-[0.7rem] font-medium text-muted-foreground">{labels[partIndex]}</p>
                                <div className="h-36 overflow-y-auto rounded-sm border border-border/70 bg-background/40 p-1">
                                    {values.map((itemValue) => (
                                        <button
                                            key={itemValue}
                                            type="button"
                                            onClick={() => updatePart(partIndex, itemValue)}
                                            className={`flex w-full cursor-pointer items-center rounded-sm px-2 py-1 text-sm tabular-nums outline-none transition-colors hover:bg-accent focus-visible:bg-accent ${selected[partIndex] === itemValue ? "bg-accent font-medium" : ""}`}
                                        >
                                            <span className="flex-1">{String(itemValue).padStart(2, "0")}</span>
                                            {selected[partIndex] === itemValue && <IconCheck size={13} stroke={2.2} aria-hidden="true" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="mt-3 flex h-8 w-full cursor-pointer items-center justify-center rounded-sm bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {t("done")}
                    </button>
                </div>
            )}
        </div>
    );
}
