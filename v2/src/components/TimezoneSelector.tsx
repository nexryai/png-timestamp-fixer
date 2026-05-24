import { useMemo } from 'react';

interface TimezoneSelectorProps {
  value: number;
  onChange: (offset: number) => void;
}

function getTimezoneOptions(): { label: string; offset: number }[] {
  const options: { label: string; offset: number }[] = [];
  for (let h = -12; h <= 14; h++) {
    const sign = h >= 0 ? '+' : '';
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

  return (
    <div className="flex items-center justify-center gap-3 px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 max-w-sm mx-auto">
      <label
        htmlFor="timezone-select"
        className="text-sm font-medium text-gray-500 whitespace-nowrap"
      >
        🕐 タイムゾーン
      </label>
      <select
        id="timezone-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 max-w-[200px] px-3 py-1.5 text-sm border border-gray-200 rounded-lg
          bg-white text-gray-900 outline-none
          focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15
          transition-all duration-150
          appearance-none
          bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22/%3E%3c/svg%3E')]
          bg-no-repeat bg-[right_0.5rem_center] bg-[length:1rem] pr-8"
      >
        {options.map((opt) => (
          <option key={opt.offset} value={opt.offset}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
