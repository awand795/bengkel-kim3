import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IklanSlide } from '../../types';

interface MultiSlideBannerProps {
  slides?: IklanSlide[];
  autoPlayInterval?: number;
  className?: string;
  onBookingClick?: () => void;
}

export const MultiSlideBanner: React.FC<MultiSlideBannerProps> = ({
  slides = [],
  autoPlayInterval = 5000,
  className = '',
  onBookingClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mountedIndices, setMountedIndices] = useState<number[]>([0]);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setMountedIndices((prev) => (prev.includes(currentIndex) ? prev : [...prev, currentIndex]));
  }, [currentIndex]);

  // Filter hanya slide yang aktif dan urutkan berdasarkan urutan ASC
  const activeSlides = React.useMemo(() => {
    return [...(slides || [])]
      .filter((s) => s.is_aktif)
      .sort((a, b) => a.urutan - b.urutan || a.id - b.id);
  }, [slides]);

  const total = activeSlides.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-play timer
  useEffect(() => {
    if (total <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, autoPlayInterval, nextSlide]);

  // Handle CTA event dari dalam iframe (CustomEvent atau postMessage)
  useEffect(() => {
    const handleCustomEvent = () => {
      if (onBookingClick) {
        onBookingClick();
      } else {
        window.dispatchEvent(new CustomEvent('open-booking-modal'));
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'open-booking-modal' || e.data?.type === 'open-booking-modal') {
        handleCustomEvent();
      }
    };

    window.addEventListener('open-booking-modal', handleCustomEvent);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('open-booking-modal', handleCustomEvent);
      window.removeEventListener('message', handleMessage);
    };
  }, [onBookingClick]);

  if (total === 0) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-slate-950 shadow-lg border border-slate-800/80 aspect-[16/9] sm:aspect-[21/9] min-h-[220px] max-h-[380px] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Slider Track Wrapper */}
      <div
        className="flex w-full h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {activeSlides.map((slide, index) => (
          <div key={`slide-${slide.id}`} className="min-w-full w-full h-full relative shrink-0 bg-slate-900">
            {mountedIndices.includes(index) && (
              <iframe
                srcDoc={slide.konten_html}
                title={`Iklan Slide ${index + 1}`}
                sandbox="allow-scripts allow-same-origin allow-popups"
                scrolling="no"
                loading="lazy"
                className="w-full h-full border-0 block bg-slate-900 pointer-events-auto"
              />
            )}
          </div>
        ))}
      </div>

      {/* Tombol Navigasi Kiri / Kanan (Hanya tampil jika slide > 1) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Slide sebelumnya"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Slide berikutnya"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indikator Titik (Dots) di Bawah Tengah */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/40 backdrop-blur-sm border border-white/10">
            {activeSlides.map((slide, idx) => (
              <button
                key={`dot-${slide.id}`}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Ke slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-amber-400 shadow-sm'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
