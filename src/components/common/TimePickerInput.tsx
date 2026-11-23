import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
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

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

/**
 * TimePickerInput — Picker Jam & Menit yang terkunci ke jam operasional:
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const [selectedHour, selectedMinute] = useMemo(() => {
    const match = /^(\d{1,2}):(\d{2})$/.exec((value || '08:30').trim());
    if (!match) return [8, 30];
    return [Number(match[1]), Number(match[2])];
  }, [value]);

  const hours = useMemo(() => {
    const maxH = schedule.isSaturday ? 13 : 16;
    const list: number[] = [];
    for (let h = 8; h <= maxH; h++) {
      list.push(h);
    }
    return list;
  }, [schedule.isSaturday]);

  const isTimeAllowed = (h: number, m: number) => {
    const total = h * 60 + m;
    return total >= schedule.openMinutes && total <= schedule.closeMinutes;
  };

  const handleSelectHour = (h: number) => {
    if (isTimeAllowed(h, selectedMinute)) {
      onChange(`${String(h).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`);
      return;
    }
    const firstValidMinute = MINUTE_OPTIONS.find((m) => isTimeAllowed(h, m));
    if (firstValidMinute !== undefined) {
      onChange(`${String(h).padStart(2, '0')}:${String(firstValidMinute).padStart(2, '0')}`);
    }
  };

  const handleSelectMinute = (m: number) => {
    if (!isTimeAllowed(selectedHour, m)) {
      toast.warning(
        'Di Luar Jam Operasional',
        schedule.isSaturday
          ? 'Hari Sabtu bengkel buka pukul 08:30–13:00 WIB.'
          : 'Hari Senin–Jumat bengkel buka pukul 08:30–16:30 WIB.'
      );
      return;
    }
    onChange(`${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-ink-muted mb-1.5">
          {label} {required && <span className="text-status-red">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={schedule.isSunday}
        onClick={() => {
          if (schedule.isSunday) {
            toast.warning('Hari Minggu Libur', 'Bengkel libur pada hari Minggu. Pilih hari Senin - Sabtu.');
            return;
          }
          setOpen((prev) => !prev);
        }}
        aria-label={label}
        className={`w-full flex items-center justify-between pl-3 pr-3 py-2.5 rounded-xl border font-mono text-sm font-bold tracking-wider transition-all ${
          schedule.isSunday
            ? 'border-status-red/40 bg-status-red/5 text-status-red cursor-not-allowed'
            : 'border-border bg-surface-raised text-ink hover:border-accent/60 focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#12388F] dark:text-blue-400 shrink-0" />
          <span>{schedule.isSunday ? 'Libur' : value || '08:30'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-ink-subtle bg-surface-sunken px-1.5 py-0.5 rounded">
            WIB
          </span>
          {!schedule.isSunday && (
            <ChevronDown
              className={`w-4 h-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
            />
          )}
        </span>
      </button>

      {open && !schedule.isSunday && (
        <div className="absolute z-50 mt-2 w-full min-w-[240px] rounded-2xl border border-border bg-surface-raised shadow-xl p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 text-center">
                Jam
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {hours.map((h) => {
                  const hasAnyValid = MINUTE_OPTIONS.some((m) => isTimeAllowed(h, m));
                  const active = h === selectedHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={!hasAnyValid}
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                        active
                          ? 'bg-accent text-white shadow-xs'
                          : hasAnyValid
                            ? 'hover:bg-surface-sunken text-ink'
                            : 'text-ink-subtle/40 cursor-not-allowed'
                      }`}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 text-center">
                Menit
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {MINUTE_OPTIONS.map((m) => {
                  const allowed = isTimeAllowed(selectedHour, m);
                  const active = m === selectedMinute && allowed;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!allowed}
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                        active
                          ? 'bg-accent text-white shadow-xs'
                          : allowed
                            ? 'hover:bg-surface-sunken text-ink'
                            : 'text-ink-subtle/35 line-through cursor-not-allowed'
                      }`}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-ink-muted">
            <span>Terpilih: <strong className="font-mono text-ink">{value} WIB</strong></span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-bold text-accent hover:underline"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
