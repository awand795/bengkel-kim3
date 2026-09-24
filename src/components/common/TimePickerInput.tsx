import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, Check, Calendar, Sun, Moon } from 'lucide-react';
import { toast } from './Toast';

interface TimePickerInputProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  selectedDate?: string; // YYYY-MM-DD
}

// Quick workshop recommendation slots
const PRESET_SLOTS = [
  { time: '08:30', label: '08:30 Pagi', period: 'Pagi' },
  { time: '10:30', label: '10:30 Siang', period: 'Pagi' },
  { time: '13:30', label: '13:30 Siang', period: 'Siang' },
  { time: '15:30', label: '15:30 Sore', period: 'Siang' },
];

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  label = 'Pilih Jam Kedatangan (Slot)',
  required = false,
  className = '',
  selectedDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'hours' | 'minutes'>('hours');
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

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

  // Parse current value (HH:mm)
  const { hour24, hour12, minutes, period } = useMemo(() => {
    let [hStr, mStr] = (value || '08:30').split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10);
    if (isNaN(h)) h = 8;
    if (isNaN(m)) m = 30;

    const isPM = h >= 12;
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;

    return {
      hour24: h,
      hour12: h12,
      minutes: m,
      period: isPM ? ('PM' as const) : ('AM' as const),
    };
  }, [value]);

  // Active state within picker
  const [selectedHour12, setSelectedHour12] = useState<number>(hour12);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(minutes);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(period);

  // Synchronize internal state when `value` prop changes
  useEffect(() => {
    setSelectedHour12(hour12);
    setSelectedMinutes(minutes);
    setSelectedPeriod(period);
  }, [hour12, minutes, period]);

  // Proactive Validation: If selectedDate is today and current value is in the past,
  // automatically suggest and bump to next valid slot!
  useEffect(() => {
    if (!isToday) return;

    let h24 = hour24;
    let min = minutes;

    if (h24 < currentHour24 || (h24 === currentHour24 && min <= currentMinutes)) {
      // Find next 15/30-min block
      let nextMin = Math.ceil((currentMinutes + 15) / 15) * 15;
      let nextH = currentHour24;
      if (nextMin >= 60) {
        nextH += 1;
        nextMin = 0;
      }

      // If still within operational hours (< 17:00)
      if (nextH < 17) {
        const adjustedTime = `${String(nextH).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
        onChange(adjustedTime);
      }
    }
  }, [isToday, hour24, minutes, currentHour24, currentMinutes, onChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validation checkers for hours & minutes
  const isHourDisabled = (h12: number, p: 'AM' | 'PM') => {
    if (!isToday) return false;
    let h24 = h12;
    if (p === 'PM' && h12 < 12) h24 += 12;
    if (p === 'AM' && h12 === 12) h24 = 0;
    return h24 < currentHour24;
  };

  const isMinuteDisabled = (m: number) => {
    if (!isToday) return false;
    let h24 = selectedHour12;
    if (selectedPeriod === 'PM' && selectedHour12 < 12) h24 += 12;
    if (selectedPeriod === 'AM' && selectedHour12 === 12) h24 = 0;

    if (h24 < currentHour24) return true;
    if (h24 === currentHour24 && m <= currentMinutes) return true;
    return false;
  };

  // Update parent when user picks hour / minute / period
  const commitTime = (h12: number, min: number, meridiem: 'AM' | 'PM') => {
    let h24 = h12;
    if (meridiem === 'PM' && h12 < 12) h24 += 12;
    if (meridiem === 'AM' && h12 === 12) h24 = 0;

    // Validate that time is not in the past if today
    if (isToday) {
      if (h24 < currentHour24 || (h24 === currentHour24 && min <= currentMinutes)) {
        toast.warning(
          'Jam Tidak Valid',
          `Waktu kedatangan tidak boleh lebih awal dari sekarang (${String(currentHour24).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')} WIB).`
        );
        return;
      }
    }

    const formatted = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleSelectHour = (h: number) => {
    if (isHourDisabled(h, selectedPeriod)) {
      toast.warning('Jam Sudah Lewat', `Jam ${h} (${selectedPeriod === 'AM' ? 'Pagi' : 'Siang/Sore'}) sudah terlewat untuk hari ini.`);
      return;
    }

    setSelectedHour12(h);
    commitTime(h, selectedMinutes, selectedPeriod);
    // Google Calendar style: automatically switch to picking minutes
    setViewMode('minutes');
  };

  const handleSelectMinute = (m: number) => {
    if (isMinuteDisabled(m)) {
      toast.warning('Menit Sudah Lewat', `Menit :${String(m).padStart(2, '0')} sudah terlewat untuk jam sekarang.`);
      return;
    }

    setSelectedMinutes(m);
    commitTime(selectedHour12, m, selectedPeriod);
  };

  const handleTogglePeriod = (p: 'AM' | 'PM') => {
    if (isToday && p === 'AM' && currentHour24 >= 12) {
      toast.warning('Waktu Pagi Selesai', 'Jadwal pagi untuk hari ini sudah terlewat. Silakan pilih jadwal Siang/Sore atau booking untuk besok.');
      return;
    }

    setSelectedPeriod(p);
    commitTime(selectedHour12, selectedMinutes, p);
  };

  // Filter preset recommendation slots that are still valid
  const availablePresetSlots = useMemo(() => {
    if (!isToday) return PRESET_SLOTS;
    return PRESET_SLOTS.filter((s) => {
      const [sh, sm] = s.time.split(':').map(Number);
      return sh > currentHour24 || (sh === currentHour24 && sm > currentMinutes);
    });
  }, [isToday, currentHour24, currentMinutes]);

  // Clock Dial Geometry (Radius = 78px, Center = 105px)
  const DIAL_RADIUS = 75;
  const CENTER = 105;

  // Angles for clock hands
  const hourAngle = (selectedHour12 % 12) * 30; // 30 deg per hour
  const minuteAngle = (selectedMinutes % 60) * 6; // 6 deg per minute
  const currentAngle = viewMode === 'hours' ? hourAngle : minuteAngle;

  const handRad = ((currentAngle - 90) * Math.PI) / 180;
  const handX = CENTER + DIAL_RADIUS * Math.cos(handRad);
  const handY = CENTER + DIAL_RADIUS * Math.sin(handRad);

  // Hour numbers: 1 to 12
  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // Minute numbers in 5-min intervals: 00, 05, ... 55
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-ink-muted mb-1">
          {label} {required && <span className="text-status-red">*</span>}
        </label>
      )}

      {/* Main Input Display */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          readOnly
          onClick={() => {
            setIsOpen(true);
            setViewMode('hours');
          }}
          placeholder="08:30 (Format JJ:MM)"
          className="w-full pl-9 pr-10 py-2.5 rounded-md border border-border text-xs font-mono font-bold text-ink bg-surface-raised cursor-pointer hover:border-accent focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden transition-all shadow-2xs"
        />

        {/* Left Icon (Clock) */}
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            setViewMode('hours');
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-accent cursor-pointer hover:scale-110 transition-transform"
        >
          <Clock className="w-4 h-4" />
        </div>

        {/* Right Badge WIB & Native Trigger */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <span className="text-[10px] font-mono font-bold text-ink-subtle px-1.5 py-0.5 rounded bg-surface border border-border">
            WIB
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (nativeInputRef.current?.showPicker) {
                nativeInputRef.current.showPicker();
              } else {
                setIsOpen(!isOpen);
              }
            }}
            className="p-1 rounded text-ink-subtle hover:text-accent hover:bg-surface transition-colors cursor-pointer"
            title="Buka pemilih jam browser"
            aria-label="Pilih jam"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Invisible native time input as fallback / browser picker */}
        <input
          ref={nativeInputRef}
          type="time"
          value={value}
          min={isToday ? `${String(currentHour24).padStart(2, '0')}:${String(currentMinutes + 1).padStart(2, '0')}` : undefined}
          onChange={(e) => {
            if (e.target.value) {
              const [h, m] = e.target.value.split(':').map(Number);
              if (isToday && (h < currentHour24 || (h === currentHour24 && m <= currentMinutes))) {
                toast.warning('Jam Tidak Valid', 'Waktu yang dipilih sudah terlewat.');
                return;
              }
              onChange(e.target.value);
            }
          }}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {/* Gmail / Google Calendar Interactive Analog Clock Center Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans select-none"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-[310px] max-w-full bg-surface-raised border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Display: Big Digital Digits + AM/PM Toggle */}
            <div className="p-4 bg-accent text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-white/80 tracking-wider">
                  Pilih Jam Kedatangan
                </div>
                <div className="flex items-baseline gap-1 mt-1 font-mono">
                  {/* Hours Box */}
                  <button
                    type="button"
                    onClick={() => setViewMode('hours')}
                    className={`text-3xl font-black px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      viewMode === 'hours'
                        ? 'bg-white text-accent shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {String(selectedHour12).padStart(2, '0')}
                  </button>

                  <span className="text-2xl font-black text-white/70">:</span>

                  {/* Minutes Box */}
                  <button
                    type="button"
                    onClick={() => setViewMode('minutes')}
                    className={`text-3xl font-black px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      viewMode === 'minutes'
                        ? 'bg-white text-accent shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {String(selectedMinutes).padStart(2, '0')}
                  </button>
                </div>
              </div>

              {/* AM / PM (Pagi / Siang) Toggle Buttons */}
              <div className="flex flex-col gap-1 bg-black/15 p-1 rounded-md border border-white/20">
                <button
                  type="button"
                  onClick={() => handleTogglePeriod('AM')}
                  disabled={isToday && currentHour24 >= 12}
                  className={`px-2 py-1 rounded text-[11px] font-black tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedPeriod === 'AM'
                      ? 'bg-white text-accent shadow-xs'
                      : isToday && currentHour24 >= 12
                      ? 'text-white/30 cursor-not-allowed'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title={isToday && currentHour24 >= 12 ? 'Waktu pagi sudah lewat hari ini' : 'Pagi'}
                >
                  <Sun className="w-3 h-3" />
                  <span>Pagi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePeriod('PM')}
                  className={`px-2 py-1 rounded text-[11px] font-black tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedPeriod === 'PM'
                      ? 'bg-white text-accent shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Siang</span>
                </button>
              </div>
            </div>

          {/* Clock Dial Body (BENTUK JAM BUNDAR / ANALOG CLOCK FACE) */}
          <div className="p-4 flex flex-col items-center justify-center bg-surface">
            
            {/* View Mode Indicator */}
            <div className="flex items-center justify-between w-full mb-3 text-xs">
              <span className="text-ink-subtle font-bold text-[11px]">
                {viewMode === 'hours' ? 'Pilih Jam (1 - 12):' : 'Pilih Menit (00 - 55):'}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('hours')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    viewMode === 'hours'
                      ? 'bg-accent text-white'
                      : 'bg-surface-raised text-ink-muted border border-border'
                  }`}
                >
                  Jam
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('minutes')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    viewMode === 'minutes'
                      ? 'bg-accent text-white'
                      : 'bg-surface-raised text-ink-muted border border-border'
                  }`}
                >
                  Menit
                </button>
              </div>
            </div>

            {/* Circular Clock Face */}
            <div className="relative w-[210px] h-[210px] rounded-full bg-surface-raised border border-border shadow-inner flex items-center justify-center">
              
              {/* SVG Hand and Center Pin */}
              <svg
                className="absolute inset-0 pointer-events-none w-[210px] h-[210px]"
                viewBox="0 0 210 210"
              >
                {/* Center Pin */}
                <circle cx={CENTER} cy={CENTER} r="4" className="fill-accent" />
                {/* Hand Line */}
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={handX}
                  y2={handY}
                  strokeWidth="2.5"
                  className="stroke-accent transition-all duration-150"
                />
                {/* Hand Tip Selection Circle */}
                <circle
                  cx={handX}
                  cy={handY}
                  r="15"
                  className="fill-accent transition-all duration-150 shadow-md"
                />
              </svg>

              {/* Dial Numbers: Hours or Minutes */}
              {viewMode === 'hours'
                ? hourNumbers.map((h) => {
                    const angle = (h % 12) * 30;
                    const rad = ((angle - 90) * Math.PI) / 180;
                    const x = CENTER + DIAL_RADIUS * Math.cos(rad);
                    const y = CENTER + DIAL_RADIUS * Math.sin(rad);
                    const isSelected = selectedHour12 === h;
                    const disabled = isHourDisabled(h, selectedPeriod);

                    return (
                      <button
                        key={`hour-${h}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectHour(h)}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                          isSelected
                            ? 'text-white font-black scale-105'
                            : disabled
                            ? 'text-ink-subtle/30 line-through cursor-not-allowed'
                            : 'text-ink hover:text-accent hover:bg-accent-subtle/50 cursor-pointer'
                        }`}
                        title={disabled ? `Jam ${h} sudah lewat untuk hari ini` : undefined}
                      >
                        {h}
                      </button>
                    );
                  })
                : minuteNumbers.map((m) => {
                    const angle = (m % 60) * 6;
                    const rad = ((angle - 90) * Math.PI) / 180;
                    const x = CENTER + DIAL_RADIUS * Math.cos(rad);
                    const y = CENTER + DIAL_RADIUS * Math.sin(rad);
                    const isSelected = Math.abs(selectedMinutes - m) < 3;
                    const disabled = isMinuteDisabled(m);

                    return (
                      <button
                        key={`min-${m}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectMinute(m)}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all z-10 ${
                          isSelected
                            ? 'text-white font-black scale-105'
                            : disabled
                            ? 'text-ink-subtle/30 line-through cursor-not-allowed'
                            : 'text-ink hover:text-accent hover:bg-accent-subtle/50 cursor-pointer'
                        }`}
                        title={disabled ? `Menit :${String(m).padStart(2, '0')} sudah lewat` : undefined}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
            </div>

            {/* Quick recommendation chips */}
            <div className="w-full mt-3 pt-3 border-t border-border flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] text-ink-subtle font-semibold">Slot Tersedia:</span>
              <div className="flex gap-1 flex-wrap">
                {availablePresetSlots.length > 0 ? (
                  availablePresetSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => {
                        onChange(slot.time);
                        setIsOpen(false);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        value === slot.time
                          ? 'bg-accent text-white shadow-2xs'
                          : 'bg-surface-raised text-ink hover:bg-accent-subtle hover:text-accent border border-border'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))
                ) : (
                  <span className="text-[10px] text-status-amber italic">
                    Slot reguler hari ini telah lewat
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Footer Actions: Batal & Gunakan Jam Ini */}
          <div className="p-3 bg-surface-raised border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-accent">
              Hasil: {value} WIB
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-ink-muted hover:text-ink hover:bg-surface cursor-pointer transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Pilih Jam Ini</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePickerInput;
