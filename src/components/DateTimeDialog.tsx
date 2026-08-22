import { useEffect, useState } from "react";

import { IconCalendar, IconCheck, IconFile, IconPlayerSkipForward } from "@tabler/icons-react";

import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";

interface DateTimeDialogProps {
    filename: string;
    imageUrl: string;
    onConfirm: (exifTime: string) => void;
    onSkip: () => void;
}

/**
 * Dialog for manually setting datetime when automatic detection fails.
 * Left side: datetime input form / Right side: image preview
 */
export default function DateTimeDialog({ filename, imageUrl, onConfirm, onSkip }: DateTimeDialogProps) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    useEffect(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        setDate(`${y}-${m}-${d}`);
        setTime(`${hh}:${mm}:${ss}`);
    }, []);

    const handleConfirm = () => {
        if (!date || !time) return;
        const exifTime = `${date.replace(/-/g, ":")} ${time}`;
        onConfirm(exifTime);
    };

    const isValid = date.length > 0 && time.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-400/35 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease]" onClick={(e) => e.target === e.currentTarget && onSkip()}>
            <div role="dialog" aria-modal="true" aria-labelledby="datetime-dialog-title" className="max-h-[90vh] w-full max-w-3xl animate-[scaleIn_0.2s_ease-out] overflow-auto rounded-xl border border-border bg-card shadow-xl">
                {/* Header */}
                <div className="border-b border-border px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                            <IconCalendar size={18} stroke={1.8} aria-hidden="true" />
                        </div>
                        <div>
                            <h3 id="datetime-dialog-title" className="text-lg font-semibold tracking-tight">
                                日時を手動で設定
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">タイムスタンプの自動検出に失敗しました。撮影日時を手動で入力してください。</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-col sm:flex-row gap-6 p-6">
                    {/* Left: form */}
                    <div className="flex-1 flex flex-col gap-4 order-2 sm:order-1">
                        {/* Filename badge */}
                        <div className="inline-flex items-center gap-2 break-all rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                            <IconFile className="shrink-0" size={15} stroke={1.8} aria-hidden="true" />
                            {filename}
                        </div>

                        {/* Date input */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="dialog-date" className="text-sm font-medium text-foreground">
                                日付
                            </label>
                            <DatePicker value={date} onChange={setDate} />
                        </div>

                        {/* Time input */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="dialog-time" className="text-sm font-medium text-foreground">
                                時刻
                            </label>
                            <TimePicker value={time} onChange={setTime} />
                        </div>

                        {/* Preview */}
                        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">EXIF形式: {date && time ? `${date.replace(/-/g, ":")} ${time}` : "---"}</p>
                    </div>

                    {/* Right: image preview */}
                    <div className="flex-1 flex items-center justify-center order-1 sm:order-2">
                        <img
                            src={imageUrl}
                            alt={`Preview of ${filename}`}
                            className="max-h-[360px] max-w-full rounded-lg border border-border bg-muted object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <IconPlayerSkipForward size={16} stroke={2} aria-hidden="true" />
                        スキップ
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                        <IconCheck size={16} stroke={2} aria-hidden="true" />
                        確定
                    </button>
                </div>
            </div>
        </div>
    );
}
