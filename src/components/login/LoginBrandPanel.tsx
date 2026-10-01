import React from 'react';
import { Package, Truck, MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Panel brand sisi kiri halaman login (hanya dirender pada layar >= lg).
 * Komponen presentasional murni: profil singkat perusahaan, tanpa props/state.
 * Dirancang pas setinggi viewport (induk lg:h-dvh) tanpa scroll halaman;
 * seluruh animasi dekoratif mati otomatis pada prefers-reduced-motion.
 */

const LOGO_SRC = '/logo.png'; // ganti ke logo Master Truck

// Foto opsional untuk latar panel: isi mis. '/panel-gudang.jpg' (taruh file di folder public/)
const PANEL_PHOTO: string | null = null;

const merek = ['Federal Oil', 'Furukawa Battery', 'Indotube', 'RKN', 'Ichidai', 'Philips'];

const faktaProfil: { label: string; nilai: React.ReactNode; Icon: LucideIcon }[] = [
  { label: 'Bidang Usaha', nilai: 'Sparepart motor & mobil, oli dan pelumas', Icon: Package },
  { label: 'Wilayah', nilai: 'Sumatera Selatan, Lampung, Bengkulu, Jambi, Bangka Belitung', Icon: Truck },
  {
    label: 'Kantor',
    nilai: (
      <>
        Komp. Pergudangan Palembang Star 1 Blok E5,{' '}
        <span className="whitespace-nowrap">Jl. Tanjung Api-Api,</span> Palembang
      </>
    ),
    Icon: MapPin,
  },
];

// Delay stagger reveal per baris fakta (ms)
const faktaDelay = [240, 310, 380];

export const LoginBrandPanel: React.FC = () => {
  return (
    <section className="hidden lg:flex lg:w-5/12 xl:w-1/2 h-full min-h-0 bg-workshop-pattern lg-p-title relative overflow-hidden border-r border-border-dark px-10 xl:px-14 py-8 flex-col justify-center items-center">

      {/* Foto latar opsional (hanya render jika PANEL_PHOTO diisi) */}
      {PANEL_PHOTO && (
        <>
          <img src={PANEL_PHOTO} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-[#E8EFF9]/70 to-[#DCE6F5]/90" />
        </>
      )}

      {/* Dekorasi: cahaya aurora biru muda yang drift pelan */}
      <div aria-hidden="true" className="login-aurora-a absolute -left-24 top-1/4 w-[22rem] h-[22rem] pointer-events-none z-0" />
      <div aria-hidden="true" className="login-aurora-b absolute -right-20 -bottom-24 w-[26rem] h-[26rem] pointer-events-none z-0" />

      {/* Titik fokus cahaya halus di belakang judul */}
      <div aria-hidden="true" className="absolute left-0 top-[26%] w-[78%] h-[38%] pointer-events-none z-0 bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent)]" />

      {/* Dekorasi: roda/ban otomotif berputar sangat pelan di pojok kanan atas */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        fill="none"
        className="login-wheel absolute -right-24 -top-24 w-[20rem] pointer-events-none select-none opacity-[0.12] text-white z-0"
      >
        {/* Ban luar */}
        <circle cx="200" cy="200" r="190" stroke="currentColor" strokeWidth="1.5" />
        {/* Telapak ban (dashed) */}
        <circle cx="200" cy="200" r="165" stroke="currentColor" strokeWidth="14" strokeDasharray="4 10" opacity="0.6" />
        {/* Pinggul velg */}
        <circle cx="200" cy="200" r="135" stroke="currentColor" strokeWidth="1.5" />
        {/* Hub */}
        <circle cx="200" cy="200" r="50" stroke="currentColor" strokeWidth="2" />
        <circle cx="200" cy="200" r="14" fill="currentColor" opacity="0.6" />
        {/* 6 jari-jari, sudut kelipatan 60° */}
        <line x1="224.352" y1="183.72" x2="267.5" y2="158.98" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <line x1="224.352" y1="216.28" x2="267.5" y2="241.02" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <line x1="200" y1="229.352" x2="200" y2="281.54" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <line x1="175.648" y1="216.28" x2="132.5" y2="241.02" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <line x1="175.648" y1="183.72" x2="132.5" y2="158.98" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <line x1="200" y1="170.648" x2="200" y2="118.46" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      </svg>

      {/* Garis cahaya tipis di tepi kanan panel */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px lg-edge-light" />

      {/* Satu grup konten, terpusat vertikal & horizontal */}
      <div className="relative z-10 w-full max-w-md xl:max-w-lg flex flex-col">

        {/* Logo chip */}
        <div className="mb-9 login-reveal" style={{ animationDelay: '0ms' }}>
          <div className="bg-white p-2.5 rounded-xl inline-flex border border-slate-200/90 shadow-sm shadow-slate-900/5">
            <img
              src={LOGO_SRC}
              alt="Master Truck"
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>

        <div className="login-reveal" style={{ animationDelay: '80ms' }}>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] lg-text-bright font-bold">
            <span aria-hidden className="relative inline-flex w-1.5 h-1.5 mr-2 align-middle">
              <span className="absolute inset-0 rounded-full bg-[#FBBF24] animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
            </span>
            Distributor Sparepart &amp; Pelumas
          </p>
          <h1 className="mb-3 text-3xl xl:text-4xl font-bold tracking-tight leading-tight login-title-sheen tracking-[-0.02em]">
            Master Truck
          </h1>
          <div className="login-accent-line" aria-hidden="true" />
        </div>

        <p className="mb-4 text-sm xl:text-[15px] leading-relaxed text-[#E2E8F0] auth-text-dark lg-p-text login-reveal" style={{ animationDelay: '160ms' }}>
          Master Truck adalah perusahaan distributor sparepart motor, mobil, dan oli yang berbasis di Palembang. Melayani distribusi ke wilayah Sumatera Selatan, Lampung, Bengkulu, Jambi, dan Bangka Belitung.
        </p>

        {/* Fakta ringkas dengan ikon */}
        <dl className="mb-5 lg-p-dl">
          {faktaProfil.map(({ label, nilai, Icon }, index) => (
            <div
              key={label}
              className="group grid grid-cols-[1.75rem_6.75rem_1fr] items-start gap-3 py-2.5 login-reveal"
              style={{ animationDelay: `${faktaDelay[index]}ms` }}
            >
              <div aria-hidden="true" className="auth-icon-box lg-icon-box w-7 h-7 rounded-md flex items-center justify-center transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <dt className="text-xs uppercase tracking-wider text-[#CBD5E1] auth-label-dark lg-p-muted pt-1 whitespace-nowrap">{label}</dt>
              <dd className="text-[13px] text-white auth-title-dark lg-p-title font-semibold leading-snug pt-1 [text-wrap:pretty]">{nilai}</dd>
            </div>
          ))}
        </dl>

        {/* Merek yang didistribusikan (disembunyikan otomatis di layar sangat pendek) */}
        <div className="[@media(max-height:560px)]:hidden">
          <p className="mb-2 text-xs font-medium text-[#CBD5E1] auth-label-dark lg-p-muted">Merek yang Didistribusikan</p>
          <div className="flex flex-wrap gap-1.5">
            {merek.map((nama, index) => (
              <span
                key={nama}
                className="login-pop auth-chip lg-chip rounded-full px-2.5 py-1 text-xs"
                style={{ animationDelay: `${450 + index * 60}ms` }}
              >
                {nama}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
