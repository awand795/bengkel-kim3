import React, { useMemo, useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { toast } from './Toast';

interface TimePickerInputProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  selectedDate?: string; // YYYY-MM-DD
}

/**
 * TimePickerInput — ketik bebas (JJ:MM), validasi saat commit.
 * Mengetik tidak pernah diblokir; format & jam lampau dicek
 * saat blur / Enter.
 */
export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  label = 'Pilih Jam Kedatangan',
  required = false,
  className = '',
  selectedDate,
}) => {
  // Check if selectedDate is today
  const isToday = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return selectedDate === today;
  }, [selectedDate]);

  // Current system time
  const now = new Date();
  const currentHour24 = now.getHours();
  const currentMinutes = now.getMinutes();
  const nowLabel = `${String(currentHour24).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

  // Draft ketikan bebas (tidak divalidasi selama mengetik)
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Jam operasional bengkel (validasi blokir): 08:00–17:00
  const OPEN_MINUTES = 8 * 60;
  const CLOSE_MINUTES = 17 * 60;

  // Ketik fleksibel: titik dua milik user dihormati ("8:30", "08:30",
  // "0830" semuanya bisa). Tanpa titik dua, sisipkan otomatis.
  const handleType = (raw: string) => {
    const cleaned = raw.replace(/[^0-9:]/g, '').slice(0, 5);
    if (cleaned.includes(':')) {
      const [hPart = '', ...rest] = cleaned.split(':');
      const mPart = rest.join('').slice(0, 2);
      setDraft(`${hPart.slice(0, 2)}:${mPart}`);
      return;
    }
    const digits = cleaned.slice(0, 4);
    if (digits.length <= 2) {
      setDraft(digits);
    } else {
      setDraft(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    }
  };

  // Urai fleksibel: "8:30" / "08:30" / "0830" -> [8, 30]
  const parseTime = (text: string): [number, number] | null => {
    const t = text.trim();
    if (t.includes(':')) {
      const [hStr = '', mStr = ''] = t.split(':');
      if (!/^\d{1,2}$/.test(hStr) || !/^\d{1,2}$/.test(mStr)) return null;
      return [Number(hStr), Number(mStr)];
    }
    if (!/^\d{3,4}$/.test(t)) return null;
    return [Number(t.slice(0, -2)), Number(t.slice(-2))];
  };

  // Validasi + commit (blur / Enter).
  // - Di luar jam operasional -> TOLAK + revert.
  // - Lampau hari ini -> WARNING saja, tetap diterima.
  // - Format/rentang salah -> TOLAK + revert.
  const commit = () => {
    const parsed = parseTime(draft);
    if (!parsed) {
      toast.warning('Format Jam Salah', 'Ketik jam format JJ:MM, contoh 8:30 atau 08:30.');
      setDraft(value);
      return;
    }
    const [h, min] = parsed;
    if (h < 0 || h > 23 || min < 0 || min > 59) {
      toast.warning('Jam Tidak Valid', 'Jam 00–23 dan menit 00–59. Contoh valid: 08:30.');
      setDraft(value);
      return;
    }
    const total = h * 60 + min;
    if (total < OPEN_MINUTES || total > CLOSE_MINUTES) {
      toast.warning(
        'Di Luar Jam Operasional',
        'Bengkel buka pukul 08:00–17:00 WIB. Pilih jam di rentang tersebut.'
      );
      setDraft(value);
      return;
    }
    if (isToday && (h < currentHour24 || (h === currentHour24 && min <= currentMinutes))) {
      toast.warning(
        'Jam Sudah Lewat Hari Ini',
        `Sekarang ${nowLabel} WIB — booking ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} tetap disimpan, pastikan jadwalnya.`
      );
    }
    onChange(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  };

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-xs font-bold text-ink-muted mb-1.5">
          {label} {required && <span className="text-status-red">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#12388F] dark:text-blue-400 pointer-events-none">
          <Clock className="w-4 h-4" />
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => handleType(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="JJ:MM (contoh 08:30)"
          maxLength={5}
          className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-border bg-white dark:bg-surface-raised text-[#0F172A] dark:text-white font-mono font-bold text-xs placeholder-[#64748B] focus:ring-2 focus:ring-[#12388F]/20 focus:border-[#12388F] focus:outline-none transition-all shadow-2xs"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-ink-subtle px-1.5 py-0.5 rounded bg-surface border border-border pointer-events-none">
          WIB
        </span>
      </div>
    </div>
  );
};

export default TimePickerInput;
