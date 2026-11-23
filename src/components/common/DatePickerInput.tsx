import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from './Toast';

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD
  minDate: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  disableSundays?: boolean;
  className?: string;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_LABELS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toYmd(y: number, mZeroBased: number, d: number): string {
  return `${y}-${String(mZeroBased + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatDisplayDdMmYyyy(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || 'DD/MM/YYYY';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * DatePickerInput — Selalu menampilkan format DD/MM/YYYY di semua browser
 * dengan kalender popup dan penguncian tanggal minimal (H+1) serta hari Minggu libur.
 */
export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  minDate,
  onChange,
  disableSundays = true,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialMonth = useMemo(() => {
    const src = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : minDate;
    const [y, m] = src.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [value, minDate]);

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  useEffect(() => {
    if (!open) return;
    setViewYear(initialMonth.year);
    setViewMonth(initialMonth.month);
  }, [open, initialMonth]);

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

  const daysGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number; ymd: string; isSunday: boolean } | null> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const ymd = toYmd(viewYear, viewMonth, d);
      const isSunday = new Date(viewYear, viewMonth, d).getDay() === 0;
      cells.push({ day: d, ymd, isSunday });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border font-mono text-xs bg-surface-raised font-bold text-ink hover:border-accent/60 focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden transition-all"
      >
        <span>{formatDisplayDdMmYyyy(value)}</span>
        <Calendar className="w-4 h-4 text-ink-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-border bg-surface-raised shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-surface-sunken text-ink-muted"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-xs font-bold text-ink">
              {MONTH_NAMES_ID[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-surface-sunken text-ink-muted"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS_ID.map((lbl, idx) => (
              <div
                key={lbl}
                className={`text-center text-[10px] font-bold py-1 ${
                  idx === 0 ? 'text-status-red' : 'text-ink-muted'
                }`}
              >
                {lbl}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} />;
              }
              const beforeMin = cell.ymd < minDate;
              const disabledSunday = disableSundays && cell.isSunday;
              const disabled = beforeMin || disabledSunday;
              const selected = cell.ymd === value;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => {
                    if (beforeMin) {
                      toast.warning(
                        'Tanggal Tidak Valid',
                        'Pemesanan booking service wajib minimal H+1 dari hari ini.'
                      );
                      return;
                    }
                    if (disabledSunday) {
                      toast.warning(
                        'Hari Minggu Libur',
                        'Bengkel tutup pada hari Minggu. Silakan pilih hari Senin - Sabtu.'
                      );
                      return;
                    }
                    onChange(cell.ymd);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selected
                      ? 'bg-accent text-white shadow-xs'
                      : disabled
                        ? cell.isSunday
                          ? 'text-status-red/40 cursor-not-allowed'
                          : 'text-ink-subtle/35 cursor-not-allowed'
                        : 'hover:bg-surface-sunken text-ink'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-ink-muted flex items-center justify-between">
            <span>Format: DD/MM/YYYY</span>
            <span className="text-status-red font-semibold">Minggu: Libur</span>
          </div>
        </div>
      )}
    </div>
  );
};
