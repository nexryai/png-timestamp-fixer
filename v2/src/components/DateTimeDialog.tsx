import { useState, useEffect } from 'react';

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
export default function DateTimeDialog({
  filename,
  imageUrl,
  onConfirm,
  onSkip,
}: DateTimeDialogProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
    setTime(`${hh}:${mm}:${ss}`);
  }, []);

  const handleConfirm = () => {
    if (!date || !time) return;
    const exifTime = date.replace(/-/g, ':') + ' ' + time;
    onConfirm(exifTime);
  };

  const isValid = date.length > 0 && time.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && onSkip()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">📅 日時を手動で設定</h3>
          <p className="text-sm text-gray-500 mt-1">
            タイムスタンプの自動検出に失敗しました。撮影日時を手動で入力してください。
          </p>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row gap-6 p-6">
          {/* Left: form */}
          <div className="flex-1 flex flex-col gap-4 order-2 sm:order-1">
            {/* Filename badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg break-all">
              📄 {filename}
            </div>

            {/* Date input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dialog-date" className="text-[0.7rem] font-semibold text-gray-500 uppercase tracking-wider">
                日付
              </label>
              <input
                id="dialog-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900
                  outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15
                  transition-all duration-150"
              />
            </div>

            {/* Time input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dialog-time" className="text-[0.7rem] font-semibold text-gray-500 uppercase tracking-wider">
                時刻
              </label>
              <input
                id="dialog-time"
                type="time"
                step="1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900
                  outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15
                  transition-all duration-150"
              />
            </div>

            {/* Preview */}
            <p className="text-xs text-gray-400">
              EXIF形式: {date && time ? `${date.replace(/-/g, ':')} ${time}` : '---'}
            </p>
          </div>

          {/* Right: image preview */}
          <div className="flex-1 flex items-center justify-center order-1 sm:order-2">
            <img
              src={imageUrl}
              alt={`Preview of ${filename}`}
              className="max-w-full max-h-[360px] rounded-xl shadow-md object-contain bg-gray-100"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onSkip}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl
              hover:border-gray-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
          >
            スキップ
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl
              bg-gradient-to-br from-brand-pink to-brand-violet
              shadow-md hover:shadow-lg hover:-translate-y-0.5
              active:translate-y-0 active:shadow-sm
              transition-all duration-150 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
