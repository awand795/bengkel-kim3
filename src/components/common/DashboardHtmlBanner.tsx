import React, { useEffect, useRef } from 'react';

interface DashboardHtmlBannerProps {
  html: string;
  className?: string;
}

export const DashboardHtmlBanner: React.FC<DashboardHtmlBannerProps> = ({ html, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !html) return;

    // Inisialisasi otomatis jika HTML memiliki struktur carousel / slider
    const slidesWrapper = el.querySelector('#mt-slides') as HTMLElement | null;
    const slides = el.querySelectorAll('.slide-item');
    const prevBtn = el.querySelector('#mt-prev') as HTMLElement | null;
    const nextBtn = el.querySelector('#mt-next') as HTMLElement | null;
    const dots = el.querySelectorAll('.dot');

    if (!slidesWrapper || slides.length <= 1) return;

    let currentIndex = 0;
    const totalSlides = slides.length;
    let timer: any = null;

    const updateSlider = (index: number) => {
      currentIndex = (index + totalSlides) % totalSlides;
      slidesWrapper.style.transform = `translateX(-${currentIndex * 100}%)`;

      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    };

    const startTimer = () => {
      stopTimer();
      timer = setInterval(() => {
        updateSlider(currentIndex + 1);
      }, 4000);
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handlePrev = (e: Event) => {
      e.preventDefault();
      updateSlider(currentIndex - 1);
      startTimer();
    };

    const handleNext = (e: Event) => {
      e.preventDefault();
      updateSlider(currentIndex + 1);
      startTimer();
    };

    prevBtn?.addEventListener('click', handlePrev);
    nextBtn?.addEventListener('click', handleNext);

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        updateSlider(idx);
        startTimer();
      });
    });

    el.addEventListener('mouseenter', stopTimer);
    el.addEventListener('mouseleave', startTimer);

    startTimer();

    return () => {
      stopTimer();
      prevBtn?.removeEventListener('click', handlePrev);
      nextBtn?.removeEventListener('click', handleNext);
      el.removeEventListener('mouseenter', stopTimer);
      el.removeEventListener('mouseleave', startTimer);
    };
  }, [html]);

  if (!html || !html.trim()) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
