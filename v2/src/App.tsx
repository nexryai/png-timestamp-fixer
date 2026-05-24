import { useState, useRef, useCallback } from 'react';
import TimezoneSelector, { getBrowserTimezoneOffset } from './components/TimezoneSelector';
import DateTimeDialog from './components/DateTimeDialog';
import { embedTimestampFromFilename, embedTimestampManual } from './lib/timestamp';

/** Stepper steps */
const STEPS = [
  { label: '設定', icon: '⚙️' },
  { label: 'ファイル選択', icon: '📁' },
  { label: '処理', icon: '🔄' },
] as const;

type StepIndex = 0 | 1 | 2;
type AppState = 'settings' | 'select' | 'processing' | 'done';

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
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto mb-10">
      {STEPS.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300 shrink-0
                  ${isCompleted
                    ? 'bg-gradient-to-br from-brand-pink to-brand-violet text-white shadow-md'
                    : isActive
                      ? 'bg-gradient-to-br from-brand-pink to-brand-violet text-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }
                `}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  isActive ? 'text-gray-900' : isCompleted ? 'text-brand-violet' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div className="flex-1 mx-3 mb-5">
                <div
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    isCompleted ? 'bg-gradient-to-r from-brand-pink to-brand-violet' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main App ─── */
function App() {
  const [appState, setAppState] = useState<AppState>('settings');
  const [timezoneOffset, setTimezoneOffset] = useState(() => getBrowserTimezoneOffset());
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
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      directoryHandleRef.current = handle;
      setAppState('select');
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
    if (!directoryHandleRef.current || files.length === 0) return;

    setAppState('processing');
    setProgress(0);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const total = files.length;

    try {
      await directoryHandleRef.current.queryPermission({ mode: 'readwrite' });
    } catch { /* already granted */ }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.name;

      if (!filename.toLowerCase().endsWith('.png')) {
        skipped++;
        setProgress(((i + 1) / total) * 100);
        continue;
      }

      try {
        const buffer = new Uint8Array(await file.arrayBuffer());
        let resultBuffer: Uint8Array;

        try {
          resultBuffer = embedTimestampFromFilename(buffer, filename, timezoneOffset);
        } catch {
          const manualTime = await requestManualDateTime(file, buffer);
          if (manualTime === null) {
            skipped++;
            setProgress(((i + 1) / total) * 100);
            continue;
          }
          resultBuffer = embedTimestampManual(buffer, manualTime);
        }

        const fileHandle = await directoryHandleRef.current!.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(resultBuffer);
        await writable.close();

        success++;
      } catch (e) {
        console.error(`Error processing ${filename}:`, e);
        failed++;
      }

      setProgress(((i + 1) / total) * 100);
    }

    setResult({ total, success, failed, skipped });
    setAppState('done');
  };

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleReset = () => {
    setAppState('select');
    setProgress(0);
    setResult({ total: 0, success: 0, failed: 0, skipped: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBackToSettings = () => {
    setAppState('settings');
    directoryHandleRef.current = null;
  };

  const currentStep = STATE_TO_STEP[appState];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gray-50 font-sans">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        id="fileElem"
        multiple
        accept="image/png"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeInUp_0.5s_ease_both]">
        {/* Gradient top bar */}
        <div className="h-1 bg-gradient-to-r from-brand-red via-brand-pink to-brand-violet" />

        <div className="px-8 pt-8 pb-10 sm:px-10">
          {/* Stepper */}
          <Stepper currentStep={currentStep} />

          {/* ──── Step 0: Settings ──── */}
          {appState === 'settings' && (
            <div className="text-center animate-[fadeIn_0.3s_ease]">
              <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight bg-gradient-to-br from-brand-red via-brand-pink to-brand-violet bg-clip-text text-transparent mb-3">
                PNG Timestamp Fixer
              </h1>
              <p className="text-gray-500 leading-relaxed text-sm sm:text-base mb-8 max-w-md mx-auto">
                ゲームコンソールなどで撮影したPNGスクリーンショットに
                EXIF形式のタイムスタンプを埋め込みます。<br />
                画質の劣化はありません。全ての処理はブラウザ上で完結します。
              </p>

              <TimezoneSelector value={timezoneOffset} onChange={setTimezoneOffset} />

              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-4">処理済みファイルの保存先ディレクトリを選択してください</p>
                <button
                  onClick={handleSetOutputDirectory}
                  className="inline-flex items-center gap-2 px-8 py-3 text-base font-semibold text-white rounded-xl
                    bg-gradient-to-br from-brand-pink to-brand-violet
                    shadow-md hover:shadow-lg hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-sm
                    transition-all duration-150 cursor-pointer"
                >
                  📂 保存先を選択して開始
                </button>
              </div>
            </div>
          )}

          {/* ──── Step 1: Select Files ──── */}
          {appState === 'select' && (
            <div className="animate-[fadeIn_0.3s_ease]">
              <h2 className="text-2xl font-bold font-display tracking-tight text-gray-900 text-center mb-1">
                ファイルを選択
              </h2>
              <p className="text-gray-500 text-sm text-center mb-6">
                タイムスタンプを修正するPNGファイルを選択してください
              </p>

              {/* Dropzone */}
              <div
                onClick={handleFileSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  flex flex-col items-center justify-center gap-3 p-10
                  border-2 border-dashed rounded-2xl cursor-pointer
                  transition-all duration-200
                  ${dragOver
                    ? 'border-brand-violet bg-brand-violet/5 scale-[1.01]'
                    : 'border-gray-200 bg-gray-50 hover:border-brand-pink hover:bg-brand-pink/[0.03]'
                  }
                `}
              >
                <span className="text-4xl">📁</span>
                <p className="text-sm text-gray-500 text-center">
                  クリックしてファイルを選択するか、<br />
                  <span className="font-semibold text-brand-violet">ここにドラッグ＆ドロップ</span>
                </p>
              </div>

              {/* Back button */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleBackToSettings}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  ← 設定に戻る
                </button>
              </div>
            </div>
          )}

          {/* ──── Step 2: Processing ──── */}
          {appState === 'processing' && (
            <div className="animate-[fadeIn_0.3s_ease] text-center">
              <h2 className="text-2xl font-bold font-display tracking-tight text-gray-900 mb-2">
                処理中...
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                タイムスタンプを修正してディレクトリに保存しています...
              </p>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-brand-pink to-brand-violet rounded-full transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{Math.round(progress)}%</p>
            </div>
          )}

          {/* ──── Done ──── */}
          {appState === 'done' && (
            <div className="animate-[fadeIn_0.3s_ease] text-center">
              <div className="text-5xl mb-3">
                {result.failed === 0 ? '✅' : '⚠️'}
              </div>
              <h2 className="text-2xl font-bold font-display tracking-tight text-gray-900 mb-1">
                {result.failed === 0 ? '完了しました！' : '処理が完了しました'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {result.failed === 0
                  ? '全てのファイルが正常に処理されました。'
                  : `${result.failed} 件のファイルの処理に失敗しました。`}
              </p>

              {/* Result summary */}
              <div className="flex justify-center gap-4 mb-8">
                <div className="flex flex-col items-center gap-1 px-5 py-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl font-bold text-gray-900">{result.success}</span>
                  <span className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider">成功</span>
                </div>
                {result.skipped > 0 && (
                  <div className="flex flex-col items-center gap-1 px-5 py-3 bg-gray-50 rounded-xl">
                    <span className="text-2xl font-bold text-gray-900">{result.skipped}</span>
                    <span className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider">スキップ</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex flex-col items-center gap-1 px-5 py-3 bg-gray-50 rounded-xl">
                    <span className="text-2xl font-bold text-brand-hot-red">{result.failed}</span>
                    <span className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider">失敗</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white rounded-xl
                  bg-gradient-to-br from-brand-pink to-brand-violet
                  shadow-md hover:shadow-lg hover:-translate-y-0.5
                  active:translate-y-0 active:shadow-sm
                  transition-all duration-150 cursor-pointer"
              >
                🔄 続けて処理する
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual DateTime Dialog */}
      {pendingFile && (
        <DateTimeDialog
          filename={pendingFile.file.name}
          imageUrl={pendingFile.objectUrl}
          onConfirm={handleDialogConfirm}
          onSkip={handleDialogSkip}
        />
      )}

      {/* Footer */}
      <p className="fixed bottom-0 left-0 right-0 text-center py-3 text-xs text-gray-400">
        ©2025-2026 nexryai All rights reserved.
      </p>
    </div>
  );
}

export default App;
