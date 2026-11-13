/**
 * Template Sample Standar 1 Slide Iklan (Widescreen 16:9 / 21:9 Iframe Berisolasi).
 * Cocok untuk slide baru di tabel sch_fleet.iklan_slide.
 */
export const DEFAULT_SINGLE_SLIDE_TEMPLATE = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .slide-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      background-size: cover;
      background-position: center;
      background-image: url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80');
    }
    .slide-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.82) 48%, rgba(15, 23, 42, 0.35) 100%);
    }
    .slide-content {
      position: relative;
      z-index: 10;
      padding: 1.5rem 2rem;
      max-width: 680px;
      color: #ffffff;
    }
    @media (min-width: 640px) {
      .slide-content { padding: 2.25rem 3rem; }
    }
    .badge-tag {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #38bdf8;
      color: #0f172a;
      margin-bottom: 0.65rem;
    }
    .slide-title {
      font-size: 1.35rem;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 0.5rem;
      color: #ffffff;
    }
    @media (min-width: 640px) {
      .slide-title { font-size: 1.85rem; }
    }
    .slide-desc {
      font-size: 0.85rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin-bottom: 1.2rem;
      max-width: 580px;
    }
    .btn-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #0284c7;
      color: #ffffff;
      padding: 0.6rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }
    .btn-cta:hover {
      background: #0369a1;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="slide-wrapper">
    <div class="slide-overlay"></div>
    <div class="slide-content">
      <span class="badge-tag">Heavy Duty Specialist</span>
      <h3 class="slide-title">Perbaikan Rem, Tromol &amp; Kaki-Kaki</h3>
      <p class="slide-desc">Jaminan keselamatan perjalanan armada dengan teknisi ahli bersertifikasi dan suku cadang asli bergaransi resmi.</p>
      <button type="button" class="btn-cta" onclick="window.parent.dispatchEvent(new CustomEvent('open-booking-modal'))">
        Jadwalkan Servis &rarr;
      </button>
    </div>
  </div>
</body>
</html>`;

/**
 * Template Sample Banner Iklan Dashboard Web Fleet Customer:
 * 1. Banner Iklan Utama (Hero Carousel / Slider Otomatis)
 * 2. Banner Iklan Produk & Paket Servis (Horizontal Scroll Cards ala MyTelkomsel)
 */
export const DEFAULT_DASHBOARD_BANNER_HTML = `<div class="mt-fleet-banners-group">
  <style>
    .mt-fleet-banners-group {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      font-family: inherit;
    }

    /* ========================================================
       IKLAN 1: HERO CAROUSEL BANNER (PROMO UTAMA)
       ======================================================== */
    .mt-banner-container {
      position: relative;
      width: 100%;
      border-radius: 1rem;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
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

    /* ========================================================
       IKLAN 2: HORIZONTAL PRODUCT CARD SLIDER (ALA MYTELKOMSEL)
       ======================================================== */
    .mt-product-slider-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.25rem 1.25rem 1rem 1.25rem;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    .mt-product-slider-card .slider-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }
    .mt-product-slider-card .header-title-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .mt-product-slider-card .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #eff6ff;
      color: #00236f;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      width: fit-content;
      border: 1px solid #bfdbfe;
    }
    .mt-product-slider-card .slider-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .mt-product-slider-card .slider-subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0;
    }
    .mt-product-slider-card .cards-carousel-container {
      position: relative;
      width: 100%;
    }
    .mt-product-slider-card .cards-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 15;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid #cbd5e1;
      color: #00236f;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18), 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      backdrop-filter: blur(4px);
    }
    .mt-product-slider-card .cards-nav-btn:hover {
      background: #00236f;
      color: #ffffff;
      border-color: #00236f;
      box-shadow: 0 6px 20px rgba(0, 35, 111, 0.35);
      transform: translateY(-50%) scale(1.1);
    }
    .mt-product-slider-card .cards-nav-btn:active {
      transform: translateY(-50%) scale(0.95);
    }
    .mt-product-slider-card .prev-card-btn {
      left: -8px;
    }
    .mt-product-slider-card .next-card-btn {
      right: -8px;
    }
    @media (max-width: 640px) {
      .mt-product-slider-card .cards-nav-btn {
        width: 32px;
        height: 32px;
      }
      .mt-product-slider-card .prev-card-btn {
        left: -4px;
      }
      .mt-product-slider-card .next-card-btn {
        right: -4px;
      }
    }
    .mt-product-slider-card .cards-track {
      display: flex;
      gap: 0.85rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 0.25rem 0.15rem 0.75rem 0.15rem;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
      -webkit-overflow-scrolling: touch;
    }
    .mt-product-slider-card .cards-track::-webkit-scrollbar {
      height: 6px;
    }
    .mt-product-slider-card .cards-track::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 999px;
    }
    .mt-product-slider-card .cards-track::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 999px;
    }
    .mt-product-slider-card .cards-track::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    .mt-pkg-card {
      flex: 0 0 240px;
      min-width: 240px;
      max-width: 240px;
      scroll-snap-align: start;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .mt-pkg-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
      border-color: #cbd5e1;
    }
    .mt-pkg-card .card-thumb-wrap {
      position: relative;
      height: 110px;
      width: 100%;
      background: #1e293b;
      overflow: hidden;
    }
    .mt-pkg-card .card-thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .mt-pkg-card:hover .card-thumb-wrap img {
      transform: scale(1.05);
    }
    .mt-pkg-card .card-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    }
    .mt-pkg-card .card-badge.gold {
      background: #f59e0b;
      color: #0f172a;
    }
    .mt-pkg-card .card-badge.green {
      background: #10b981;
      color: #ffffff;
    }
    .mt-pkg-card .card-badge.blue {
      background: #0284c7;
      color: #ffffff;
    }
    .mt-pkg-card .card-body {
      padding: 0.85rem 0.95rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .mt-pkg-card .card-category {
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .mt-pkg-card .card-name {
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
      margin: 0 0 0.4rem 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.3em;
    }
    .mt-pkg-card .card-features {
      font-size: 0.72rem;
      color: #475569;
      line-height: 1.45;
      margin-bottom: 0.75rem;
      flex: 1;
    }
    .mt-pkg-card .card-feature-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.2rem;
    }
    .mt-pkg-card .card-feature-item svg {
      width: 12px;
      height: 12px;
      color: #10b981;
      flex-shrink: 0;
    }
    .mt-pkg-card .card-price-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 0.65rem;
      padding-top: 0.4rem;
      border-top: 1px dashed #e2e8f0;
    }
    .mt-pkg-card .old-price {
      font-size: 0.7rem;
      color: #94a3b8;
      text-decoration: line-through;
      line-height: 1.2;
    }
    .mt-pkg-card .net-price {
      font-size: 0.95rem;
      font-weight: 800;
      color: #00236f;
      line-height: 1.2;
    }
    .mt-pkg-card .btn-order {
      width: 100%;
      background: #00236f;
      color: #ffffff;
      border: none;
      border-radius: 0.55rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      box-shadow: 0 2px 4px rgba(0, 35, 111, 0.15);
    }
    .mt-pkg-card .btn-order:hover {
      background: #ff6b00;
      box-shadow: 0 4px 10px rgba(255, 107, 0, 0.3);
      transform: translateY(-1px);
    }
  </style>

  <!-- ==========================================
       IKLAN 1: HERO CAROUSEL BANNER OTOMATIS
       ========================================== -->
  <div id="mastertruck-banner-carousel" class="mt-banner-container">
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
  </div>

  <!-- ==========================================
       IKLAN 2: PAKET PRODUK KARTU GESER (ALA MYTELKOMSEL)
       ========================================== -->
  <div class="mt-product-slider-card">
    <div class="slider-header">
      <div class="header-title-group">
        <span class="header-badge">⭐ Rekomendasi Bengkel KIM 3</span>
        <h4 class="slider-title">Paket Servis Hemat &amp; Sparepart Pilihan</h4>
        <p class="slider-subtitle">Geser ke kanan untuk menjelajahi promo paket armada &amp; suku cadang fast-moving</p>
      </div>
    </div>

    <div class="cards-carousel-container">
      <!-- Tombol Navigasi Kiri (Vertikal di Tengah Kartu) -->
      <button type="button" class="cards-nav-btn prev-card-btn" onclick="document.getElementById('mt-cards-track').scrollBy({left: -280, behavior: 'smooth'})" title="Geser Kiri" aria-label="Geser Kiri">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <div class="cards-track" id="mt-cards-track">
      <!-- Card 1 -->
      <div class="mt-pkg-card">
        <div class="card-thumb-wrap">
          <img src="https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80" alt="Paket Servis Ringan 10.000 KM" loading="lazy" />
          <span class="card-badge">HEMAT 20%</span>
        </div>
        <div class="card-body">
          <span class="card-category">Paket Servis</span>
          <h5 class="card-name">Servis Rutin Berkala 10.000 KM</h5>
          <div class="card-features">
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Oli Mesin HD 20L + Filter Oli</span>
            </div>
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Free Cek 21 Titik Rem &amp; Kaki</span>
            </div>
          </div>
          <div class="card-price-row">
            <span class="old-price">Rp 2.450.000</span>
            <span class="net-price">Rp 1.950.000</span>
          </div>
          <button type="button" class="btn-order" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
            Pesan Paket &rarr;
          </button>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="mt-pkg-card">
        <div class="card-thumb-wrap">
          <img src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80" alt="Kampas Rem Heavy Duty" loading="lazy" />
          <span class="card-badge gold">BEST SELLER</span>
        </div>
        <div class="card-body">
          <span class="card-category">Pengereman</span>
          <h5 class="card-name">Kampas Rem Bendix Pro Heavy Duty</h5>
          <div class="card-features">
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Cengkeram Kuat Muatan Berat</span>
            </div>
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Termasuk Bubut Tromol Roda</span>
            </div>
          </div>
          <div class="card-price-row">
            <span class="old-price">Rp 1.250.000</span>
            <span class="net-price">Rp 980.000</span>
          </div>
          <button type="button" class="btn-order" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
            Pesan Paket &rarr;
          </button>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="mt-pkg-card">
        <div class="card-thumb-wrap">
          <img src="https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80" alt="Filter Udara & Solar Sakura" loading="lazy" />
          <span class="card-badge blue">OEM ASLI</span>
        </div>
        <div class="card-body">
          <span class="card-category">Suku Cadang</span>
          <h5 class="card-name">Duo Filter Sakura: Solar &amp; Udara HD</h5>
          <div class="card-features">
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Proteksi Injektor Common Rail</span>
            </div>
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Standar Sertifikasi OEM Pabrikan</span>
            </div>
          </div>
          <div class="card-price-row">
            <span class="old-price">Rp 480.000</span>
            <span class="net-price">Rp 395.000</span>
          </div>
          <button type="button" class="btn-order" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
            Pesan Paket &rarr;
          </button>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="mt-pkg-card">
        <div class="card-thumb-wrap">
          <img src="https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80" alt="Tune Up Diesel & Kalibrasi" loading="lazy" />
          <span class="card-badge green">IRIT BBM</span>
        </div>
        <div class="card-body">
          <span class="card-category">Performa Mesin</span>
          <h5 class="card-name">Tune Up Diesel &amp; Kalibrasi Nozzle</h5>
          <div class="card-features">
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Tarikan Bertenaga di Tanjakan</span>
            </div>
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Gas Buang Bersih &amp; Lolos Uji</span>
            </div>
          </div>
          <div class="card-price-row">
            <span class="old-price">Rp 1.850.000</span>
            <span class="net-price">Rp 1.450.000</span>
          </div>
          <button type="button" class="btn-order" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
            Pesan Paket &rarr;
          </button>
        </div>
      </div>

      <!-- Card 5 -->
      <div class="mt-pkg-card">
        <div class="card-thumb-wrap">
          <img src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80" alt="Spooring Balancing Truk" loading="lazy" />
          <span class="card-badge">AWET BAN</span>
        </div>
        <div class="card-body">
          <span class="card-category">Kaki-Kaki</span>
          <h5 class="card-name">Balancing &amp; Alignment Roda 10 Baut</h5>
          <div class="card-features">
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Cegah Ban Aus Sebelah / Habis Cepat</span>
            </div>
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Kemudi Lurus &amp; Minim Getaran</span>
            </div>
          </div>
          <div class="card-price-row">
            <span class="old-price">Rp 850.000</span>
            <span class="net-price">Rp 690.000</span>
          </div>
          <button type="button" class="btn-order" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
            Pesan Paket &rarr;
          </button>
        </div>
      </div>

      <!-- Card 6 -->
      <div class="mt-pkg-card">
        <div class="card-thumb-wrap">
          <img src="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80" alt="Kuras Radiator Coolant" loading="lazy" />
          <span class="card-badge blue">TEMPERATUR AMAN</span>
        </div>
        <div class="card-body">
          <span class="card-category">Pendingin</span>
          <h5 class="card-name">Kuras Radiator &amp; Refill Coolant HD 20L</h5>
          <div class="card-features">
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Mencegah Overheat Rute Lintas</span>
            </div>
            <div class="card-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              <span>Anti Karat &amp; Endapan Water Jacket</span>
            </div>
          </div>
          <div class="card-price-row">
            <span class="old-price">Rp 950.000</span>
            <span class="net-price">Rp 780.000</span>
          </div>
          <button type="button" class="btn-order" onclick="window.dispatchEvent(new CustomEvent('open-booking-modal'))">
            Pesan Paket &rarr;
          </button>
        </div>
      </div>
    </div>

    <!-- Tombol Navigasi Kanan (Vertikal di Tengah Kartu) -->
    <button type="button" class="cards-nav-btn next-card-btn" onclick="document.getElementById('mt-cards-track').scrollBy({left: 280, behavior: 'smooth'})" title="Geser Kanan" aria-label="Geser Kanan">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
  </div>
</div>
</div>`;
