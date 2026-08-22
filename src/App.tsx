import { useCallback, useRef, useState } from "react";

import { IconAlertTriangle, IconArrowLeft, IconCheck, IconCircleCheck, IconFileTime, IconFolder, IconFolderOpen, IconPhoto, IconRefresh, IconSettings } from "@tabler/icons-react";

import DateTimeDialog from "./components/DateTimeDialog";
import TimezoneSelector, { getBrowserTimezoneOffset } from "./components/TimezoneSelector";
import { embedTimestampFromFilename, embedTimestampManual } from "./lib/timestamp";

/** Stepper steps */
const STEPS = [
    { label: "設定", icon: IconSettings },
    { label: "ファイル選択", icon: IconFolder },
    { label: "処理", icon: IconRefresh },
] as const;

type StepIndex = 0 | 1 | 2;
type AppState = "settings" | "select" | "processing" | "done";

const STATE_TO_STEP: Record<AppState, StepIndex> = {
    settings: 0,
    select: 1,
    processing: 2,
    done: 2,
};

interface ProcessingResult {
    total: number;
    success: number;
    failed: number;
    skipped: number;
}

interface PendingFile {
    file: File;
    buffer: Uint8Array;
    objectUrl: string;
}

/* ─── Stepper Component ─── */
function Stepper({ currentStep }: { currentStep: StepIndex }) {
    return (
        <div className="relative mx-auto mb-10 grid w-full max-w-lg grid-cols-3">
            <div aria-hidden="true" className="absolute left-1/6 right-1/6 top-[18px] h-px bg-border">
                <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${currentStep * 50}%` }} />
            </div>

            {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                const StepIcon = step.icon;
                return (
                    <div key={step.label} className="relative z-10 flex justify-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={`
                  flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium
                  transition-colors duration-200
                  ${isCompleted ? "border-primary bg-primary text-primary-foreground" : isActive ? "border-primary bg-background text-foreground ring-4 ring-ring/15" : "border-border bg-muted text-muted-foreground"}
                `}
                            >
                                {isCompleted ? <IconCheck size={17} stroke={2.25} aria-hidden="true" /> : <StepIcon size={17} stroke={1.9} aria-hidden="true" />}
                            </div>
                            <span className={`text-xs font-medium transition-colors duration-200 ${isActive || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Main App ─── */
function App() {
    const [appState, setAppState] = useState<AppState>("settings");
    const [timezoneOffset, setTimezoneOffset] = useState(() => getBrowserTimezoneOffset());
    const [ignoreFilenameTimezone, setIgnoreFilenameTimezone] = useState(true);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ProcessingResult>({ total: 0, success: 0, failed: 0, skipped: 0 });
    const [dragOver, setDragOver] = useState(false);

    // Manual datetime dialog
    const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
    const pendingResolveRef = useRef<((exifTime: string | null) => void) | null>(null);

    const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ─── Step 1: Settings → select output directory ─── */
    const handleSetOutputDirectory = async () => {
        try {
            const handle = await window.showDirectoryPicker({ mode: "readwrite" });
            directoryHandleRef.current = handle;
            setAppState("select");
        } catch {
            // User cancelled
        }
    };

    /* ─── Manual DateTime Dialog ─── */
    const requestManualDateTime = useCallback((file: File, buffer: Uint8Array): Promise<string | null> => {
        return new Promise((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            setPendingFile({ file, buffer, objectUrl });
            pendingResolveRef.current = (exifTime: string | null) => {
                URL.revokeObjectURL(objectUrl);
                setPendingFile(null);
                pendingResolveRef.current = null;
                resolve(exifTime);
            };
        });
    }, []);

    const handleDialogConfirm = (exifTime: string) => {
        pendingResolveRef.current?.(exifTime);
    };

    const handleDialogSkip = () => {
        pendingResolveRef.current?.(null);
    };

    /* ─── Step 3: Process files ─── */
    const processFiles = async (files: FileList) => {
        const directoryHandle = directoryHandleRef.current;
        if (!directoryHandle || files.length === 0) return;

        setAppState("processing");
        setProgress(0);

        let success = 0;
        let failed = 0;
        let skipped = 0;
        const total = files.length;

        try {
            await directoryHandle.queryPermission({ mode: "readwrite" });
        } catch {
            /* already granted */
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.name;

            if (!filename.toLowerCase().endsWith(".png")) {
                skipped++;
                setProgress(((i + 1) / total) * 100);
                continue;
            }

            try {
                const buffer = new Uint8Array(await file.arrayBuffer());
                let resultBuffer: Uint8Array;

                try {
                    resultBuffer = embedTimestampFromFilename(buffer, filename, timezoneOffset, ignoreFilenameTimezone);
                } catch {
                    const manualTime = await requestManualDateTime(file, buffer);
                    if (manualTime === null) {
                        skipped++;
                        setProgress(((i + 1) / total) * 100);
                        continue;
                    }
                    resultBuffer = embedTimestampManual(buffer, manualTime);
                }

                const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(new Uint8Array(resultBuffer));
                await writable.close();

                success++;
            } catch (e) {
                console.error(`Error processing ${filename}:`, e);
                failed++;
            }

            setProgress(((i + 1) / total) * 100);
        }

        setResult({ total, success, failed, skipped });
        setAppState("done");
    };

    const handleFileSelect = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
    };

    const handleReset = () => {
        setAppState("select");
        setProgress(0);
        setResult({ total: 0, success: 0, failed: 0, skipped: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleBackToSettings = () => {
        setAppState("settings");
        directoryHandleRef.current = null;
    };

    const currentStep = STATE_TO_STEP[appState];

    return (
        <div className="min-h-screen bg-muted/35 px-4 py-8 font-sans text-foreground sm:px-6 sm:py-12">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" id="fileElem" multiple accept="image/png" className="hidden" onChange={handleFileChange} />

            <main className="mx-auto w-full max-w-2xl animate-[fadeInUp_0.4s_ease_both] rounded-xl border border-border bg-card shadow-sm">
                <div className="rounded-t-xl border-b border-border bg-muted/30 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background shadow-xs">
                            <IconPhoto size={19} stroke={1.8} aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-none">PNG Timestamp Fixer</p>
                            <p className="mt-1.5 text-xs text-muted-foreground">PNG metadata utility</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-9 pt-8 sm:px-10">
                    {/* Stepper */}
                    <Stepper currentStep={currentStep} />

                    {/* ──── Step 0: Settings ──── */}
                    {appState === "settings" && (
                        <div className="animate-[fadeIn_0.3s_ease] text-center">
                            <h1 className="mb-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">スクリーンショットの日時を修正</h1>
                            <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
                                ゲームコンソールなどで撮影したPNGスクリーンショットに EXIF形式のタイムスタンプを埋め込みます。
                                <br />
                                画質の劣化はありません。全ての処理はブラウザ上で完結します。
                            </p>

                            <div className="mx-auto flex max-w-sm flex-col gap-3 text-left">
                                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-accent/60">
                                    <input type="checkbox" checked={ignoreFilenameTimezone} onChange={(event) => setIgnoreFilenameTimezone(event.target.checked)} className="peer sr-only" />
                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground shadow-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:border-primary peer-checked:bg-primary">
                                        <IconCheck className={`transition-opacity ${ignoreFilenameTimezone ? "opacity-100" : "opacity-0"}`} size={12} stroke={3} aria-hidden="true" />
                                    </span>
                                    <span className="flex min-w-0 gap-2.5">
                                        <IconFileTime className="mt-0.5 shrink-0 text-muted-foreground" size={17} stroke={1.9} aria-hidden="true" />
                                        <span>
                                            <span className="block text-sm font-medium text-foreground">ファイル名の日時はタイムゾーンを無視</span>
                                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">ファイル名から推測した日時を補正せず、そのまま使用します。</span>
                                        </span>
                                    </span>
                                </label>

                                <TimezoneSelector value={timezoneOffset} onChange={setTimezoneOffset} />
                            </div>

                            <div className="mt-5">
                                <p className="mb-4 text-xs text-muted-foreground">処理済みファイルの保存先ディレクトリを選択してください</p>
                                <button
                                    type="button"
                                    onClick={handleSetOutputDirectory}
                                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <IconFolderOpen size={17} stroke={2} aria-hidden="true" />
                                    保存先を選択して開始
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ──── Step 1: Select Files ──── */}
                    {appState === "select" && (
                        <div className="animate-[fadeIn_0.3s_ease]">
                            <h2 className="mb-1 text-center font-display text-2xl font-semibold tracking-tight">ファイルを選択</h2>
                            <p className="mb-6 text-center text-sm text-muted-foreground">タイムスタンプを修正するPNGファイルを選択してください</p>

                            {/* Dropzone */}
                            <button
                                type="button"
                                onClick={handleFileSelect}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                  mx-auto flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10
                  transition-colors duration-200 focus-within:ring-2 focus-within:ring-ring
                  ${dragOver ? "border-foreground bg-accent" : "border-border bg-muted/35 hover:border-muted-foreground/50 hover:bg-accent/60"}
                `}
                            >
                                <span className="flex size-11 items-center justify-center rounded-md border border-border bg-background shadow-xs">
                                    <IconFolderOpen size={22} stroke={1.7} aria-hidden="true" />
                                </span>
                                <span className="text-center text-sm text-muted-foreground">
                                    クリックしてファイルを選択するか、
                                    <br />
                                    <span className="font-medium text-foreground">ここにドラッグ＆ドロップ</span>
                                </span>
                            </button>

                            {/* Back button */}
                            <div className="flex justify-center mt-6">
                                <button type="button" onClick={handleBackToSettings} className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
                                    設定に戻る
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ──── Step 2: Processing ──── */}
                    {appState === "processing" && (
                        <div className="animate-[fadeIn_0.3s_ease] text-center">
                            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-muted">
                                <IconRefresh className="animate-spin" size={21} stroke={1.8} aria-hidden="true" />
                            </div>
                            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight">処理中...</h2>
                            <p className="mb-6 text-sm text-muted-foreground">タイムスタンプを修正してディレクトリに保存しています...</p>

                            {/* Progress bar */}
                            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs tabular-nums text-muted-foreground">{Math.round(progress)}%</p>
                        </div>
                    )}

                    {/* ──── Done ──── */}
                    {appState === "done" && (
                        <div className="animate-[fadeIn_0.3s_ease] text-center">
                            <div className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full border ${result.failed === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                                {result.failed === 0 ? <IconCircleCheck size={25} stroke={1.8} aria-hidden="true" /> : <IconAlertTriangle size={25} stroke={1.8} aria-hidden="true" />}
                            </div>
                            <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">{result.failed === 0 ? "完了しました" : "処理が完了しました"}</h2>
                            <p className="mb-6 text-sm text-muted-foreground">{result.failed === 0 ? "全てのファイルが正常に処理されました。" : `${result.failed} 件のファイルの処理に失敗しました。`}</p>

                            {/* Result summary */}
                            <div className="mb-8 flex justify-center gap-3">
                                <div className="flex min-w-24 flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 px-5 py-3">
                                    <span className="text-2xl font-semibold tabular-nums">{result.success}</span>
                                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">成功</span>
                                </div>
                                {result.skipped > 0 && (
                                    <div className="flex min-w-24 flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 px-5 py-3">
                                        <span className="text-2xl font-semibold tabular-nums">{result.skipped}</span>
                                        <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">スキップ</span>
                                    </div>
                                )}
                                {result.failed > 0 && (
                                    <div className="flex min-w-24 flex-col items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/5 px-5 py-3">
                                        <span className="text-2xl font-semibold tabular-nums text-destructive">{result.failed}</span>
                                        <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">失敗</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleReset}
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <IconRefresh size={17} stroke={2} aria-hidden="true" />
                                続けて処理する
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Manual DateTime Dialog */}
            {pendingFile && <DateTimeDialog filename={pendingFile.file.name} imageUrl={pendingFile.objectUrl} onConfirm={handleDialogConfirm} onSkip={handleDialogSkip} />}

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-muted-foreground">©2025-2026 nexryai All rights reserved.</p>
        </div>
    );
}

export default App;
