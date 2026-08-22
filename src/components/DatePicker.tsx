import { useEffect, useMemo, useRef, useState } from "react";

import { IconCalendar, IconChevronDown, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : new Date();
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value));
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = parseDate(value);

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

    useEffect(() => {
        if (value) setVisibleMonth(parseDate(value));
    }, [value]);

    const days = useMemo(() => {
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return {
            firstWeekday,
            values: Array.from({ length: daysInMonth }, (_, index) => index + 1),
        };
    }, [visibleMonth]);

    const moveMonth = (amount: number) => {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                id="dialog-date"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
                <IconCalendar className="text-muted-foreground" size={16} stroke={1.9} aria-hidden="true" />
                <span className="flex-1 text-left">{value || "日付を選択"}</span>
                <IconChevronDown className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} size={15} stroke={2} aria-hidden="true" />
            </button>

            {isOpen && (
                <div role="dialog" aria-label="日付を選択" className="absolute left-0 top-[calc(100%+0.4rem)] z-[60] w-72 rounded-md border border-border/80 bg-background/85 p-3 shadow-lg shadow-black/10 backdrop-blur-xl animate-[fadeIn_0.12s_ease-out]">
                    <div className="mb-3 flex items-center justify-between">
                        <button type="button" aria-label="前の月" onClick={() => moveMonth(-1)} className="flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent">
                            <IconChevronLeft size={16} stroke={2} aria-hidden="true" />
                        </button>
                        <p className="text-sm font-medium">
                            {visibleMonth.getFullYear()}年 {visibleMonth.getMonth() + 1}月
                        </p>
                        <button type="button" aria-label="次の月" onClick={() => moveMonth(1)} className="flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent">
                            <IconChevronRight size={16} stroke={2} aria-hidden="true" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                        {WEEKDAYS.map((weekday) => (
                            <span key={weekday} className="flex h-7 items-center justify-center text-[0.7rem] font-medium text-muted-foreground">
                                {weekday}
                            </span>
                        ))}
                        {days.values.map((day) => {
                            const isSelected = selected.getFullYear() === visibleMonth.getFullYear() && selected.getMonth() === visibleMonth.getMonth() && selected.getDate() === day;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    style={day === 1 ? { gridColumnStart: days.firstWeekday + 1 } : undefined}
                                    onClick={() => {
                                        onChange(formatDate(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
                                        setIsOpen(false);
                                    }}
                                    className={`flex size-8 cursor-pointer items-center justify-center justify-self-center rounded-sm text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
