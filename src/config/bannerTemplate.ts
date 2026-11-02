/**
 * Template Sample Banner Iklan Bergerak (Carousel / Slider Otomatis)
 * untuk ditampilkan di bagian paling bawah Dashboard Pelanggan Fleet.
 */
export const DEFAULT_DASHBOARD_BANNER_HTML = `<div id="mastertruck-banner-carousel" class="mt-banner-container">
  <style>
    .mt-banner-container {
      position: relative;
      width: 100%;
      border-radius: 1rem;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      font-family: inherit;
    }
    .mt-banner-container .slides-wrapper {
      display: flex;
      transition: transform 0.5s ease-in-out;
      width: 100%;
    }
    .mt-banner-container .slide-item {
      min-width: 100%;
      position: relative;
      min-height: 240px;
      display: flex;
      align-items: center;
      background-size: cover;
      background-position: center;
    }
    @media (min-width: 640px) {
      .mt-banner-container .slide-item {
        min-height: 280px;
      }
    }
    .mt-banner-container .slide-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.82) 45%, rgba(15, 23, 42, 0.35) 100%);
    }
    .mt-banner-container .slide-content {
      position: relative;
      z-index: 10;
      padding: 2rem 2.5rem;
      max-width: 680px;
      color: #ffffff;
    }
    .mt-banner-container .badge-tag {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #f59e0b;
      color: #0f172a;
      margin-bottom: 0.65rem;
    }
    .mt-banner-container .slide-title {
      font-size: 1.35rem;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 0.5rem;
      color: #ffffff;
    }
    @media (min-width: 640px) {
      .mt-banner-container .slide-title {
        font-size: 1.85rem;
      }
    }
    .mt-banner-container .slide-desc {
      font-size: 0.85rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin-bottom: 1.2rem;
      max-width: 580px;
    }
    .mt-banner-container .btn-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #2563eb;
      color: #ffffff;
      padding: 0.6rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }
    .mt-banner-container .btn-cta:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
    .mt-banner-container .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 20;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(6px);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.25);
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 1.1rem;
    }
    .mt-banner-container .nav-btn:hover {
      background: rgba(255, 255, 255, 0.4);
      transform: translateY(-50%) scale(1.05);
    }
    .mt-banner-container .prev-btn {
      left: 1rem;
    }
    .mt-banner-container .next-btn {
      right: 1rem;
    }
    .mt-banner-container .dots-wrapper {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      display: flex;
      gap: 0.5rem;
    }
    .mt-banner-container .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: all 0.3s;
    }
    .mt-banner-container .dot.active {
      width: 24px;
      border-radius: 9999px;
      background: #f59e0b;
    }
  </style>

  <div class="slides-wrapper" id="mt-slides">
    <!-- Slide 1 -->
    <div class="slide-item" style="background-image: url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80');">
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <span class="badge-tag">Promo Spesial Armada</span>
        <h3 class="slide-title">Service Berkala &amp; Ganti Oli Mesin Truk</h3>
        <p class="slide-desc">Dapatkan diskon jasa hingga 20% dan Free General Checkup 21 titik vital armada truk Anda di Bengkel Master Truck.</p>
        <button type="button" class="btn-cta" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
          Booking Service Sekarang &rarr;
        </button>
      </div>
    </div>
    <!-- Slide 2 -->
    <div class="slide-item" style="background-image: url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80');">
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <span class="badge-tag" style="background: #38bdf8; color: #0f172a;">Heavy Duty Specialist</span>
        <h3 class="slide-title">Perbaikan Rem, Tromol &amp; Kaki-Kaki</h3>
        <p class="slide-desc">Jaminan keselamatan perjalanan armada dengan teknisi ahli bersertifikasi dan suku cadang asli bergaransi resmi.</p>
        <button type="button" class="btn-cta" style="background: #0284c7;" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
          Jadwalkan Servis &rarr;
        </button>
      </div>
    </div>
    <!-- Slide 3 -->
    <div class="slide-item" style="background-image: url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80');">
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <span class="badge-tag" style="background: #10b981; color: #ffffff;">Prioritas Layanan</span>
        <h3 class="slide-title">Booking Cepat Bebas Antri Master Truck</h3>
        <p class="slide-desc">Jadwalkan kedatangan armada Anda minimal H-1 untuk kepastian stall servis dan penyiapan sparepart lebih awal.</p>
        <button type="button" class="btn-cta" style="background: #059669;" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
          Buat Booking Baru &rarr;
        </button>
      </div>
    </div>
  </div>

  <!-- Tombol Navigasi Kiri / Kanan -->
  <button type="button" class="nav-btn prev-btn" id="mt-prev" aria-label="Previous Slide">&#10094;</button>
  <button type="button" class="nav-btn next-btn" id="mt-next" aria-label="Next Slide">&#10095;</button>

  <!-- Indikator Dots -->
  <div class="dots-wrapper" id="mt-dots">
    <div class="dot active"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
</div>`;
