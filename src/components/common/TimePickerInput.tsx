import React, { useMemo, useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { toast } from './Toast';

export interface BookingScheduleInfo {
  dayOfWeek: number | null; // 0 = Minggu .. 6 = Sabtu
  isSunday: boolean;
  isSaturday: boolean;
  openMinutes: number;
  closeMinutes: number;
  openLabel: string;
  closeLabel: string;
  rangeLabel: string;
}

export function getBookingScheduleForDate(dateStr?: string): BookingScheduleInfo {
  let day: number | null = null;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    day = new Date(y, m - 1, d).getDay();
  }
  const isSunday = day === 0;
  const isSaturday = day === 6;
  const openMinutes = 8 * 60 + 30; // 08:30
  const closeMinutes = isSaturday ? 13 * 60 : 16 * 60 + 30; // 13:00 Sabtu, 16:30 Senin-Jumat
  const openLabel = '08:30';
  const closeLabel = isSaturday ? '13:00' : '16:30';
  const rangeLabel = isSunday
    ? 'Hari Minggu libur (tutup)'
    : isSaturday
      ? 'Jam operasional Sabtu: 08:30 - 13:00 WIB'
      : 'Jam operasional Senin - Jumat: 08:30 - 16:30 WIB';

  return {
    dayOfWeek: day,
    isSunday,
    isSaturday,
    openMinutes,
    closeMinutes,
    openLabel,
    closeLabel,
    rangeLabel,
  };
}

export function validateBookingDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return 'Tanggal rencana masuk wajib dipilih.';
  const schedule = getBookingScheduleForDate(dateStr);
  if (schedule.isSunday) {
    return 'Hari Minggu bengkel libur. Silakan pilih hari Senin - Sabtu.';
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeStr || '').trim());
  if (!match) {
    return 'Format jam kedatangan tidak valid (gunakan format JJ:MM, contoh 08:30).';
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return 'Jam kedatangan tidak valid.';
  }
  const total = h * 60 + m;
  if (total < schedule.openMinutes || total > schedule.closeMinutes) {
    return schedule.isSaturday
      ? 'Hari Sabtu bengkel hanya melayani pukul 08:30 - 13:00 WIB.'
      : 'Hari Senin - Jumat bengkel hanya melayani pukul 08:30 - 16:30 WIB.';
  }
  return null;
}

interface TimePickerInputProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  selectedDate?: string; // YYYY-MM-DD
}

/**
 * TimePickerInput — ketik bebas (JJ:MM), validasi saat commit
 * mengikuti jam operasional hari pada selectedDate:
 * - Senin - Jumat: 08:30 - 16:30 WIB
 * - Sabtu: 08:30 - 13:00 WIB
 * - Minggu: Libur (terkunci)
 */
export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  label = 'Pilih Jam Kedatangan',
  required = false,
  className = '',
  selectedDate,
}) => {
  const schedule = useMemo(() => getBookingScheduleForDate(selectedDate), [selectedDate]);

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

  const handleType = (raw: string) => {
    if (schedule.isSunday) return;
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

  const commit = () => {
    if (schedule.isSunday) {
      toast.warning('Hari Minggu Libur', 'Bengkel libur pada hari Minggu. Pilih hari Senin - Sabtu.');
      setDraft(value);
      return;
    }
    const parsed = parseTime(draft);
    if (!parsed) {
      toast.warning('Format Jam Salah', 'Ketik jam format JJ:MM, contoh 08:30.');
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
    if (total < schedule.openMinutes || total > schedule.closeMinutes) {
      toast.warning(
        'Di Luar Jam Operasional',
        schedule.isSaturday
          ? 'Hari Sabtu bengkel buka pukul 08:30–13:00 WIB. Pilih jam di rentang tersebut.'
          : 'Hari Senin–Jumat bengkel buka pukul 08:30–16:30 WIB. Pilih jam di rentang tersebut.'
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
          disabled={schedule.isSunday}
          value={schedule.isSunday ? 'Libur' : draft}
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
          aria-label={label}
          className={`w-full pl-9 pr-14 py-2.5 rounded-xl border font-mono text-sm font-bold tracking-wider transition-all ${
            schedule.isSunday
              ? 'border-status-red/40 bg-status-red/5 text-status-red cursor-not-allowed'
              : 'border-border bg-surface-raised text-ink focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden'
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ink-subtle bg-surface-sunken px-1.5 py-0.5 rounded pointer-events-none">
          WIB
        </span>
      </div>
    </div>
  );
};
