import React from 'react';
import { Package, Truck, MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Panel brand sisi kiri halaman login (hanya dirender pada layar >= lg).
 * Komponen presentasional murni: profil singkat perusahaan, tanpa props/state.
 * Dirancang pas setinggi viewport (induk lg:h-dvh) tanpa scroll halaman;
 * animasi dekoratif mati otomatis pada prefers-reduced-motion.
 */

const LOGO_SRC = '/logo.png'; // ganti ke logo PT Lotus Pradipta Mulia

const merek = ['Federal Oil', 'Furukawa Battery', 'Indotube', 'RKN', 'Ichidai', 'Philips'];

const faktaProfil: { label: string; nilai: string; Icon: LucideIcon }[] = [
  { label: 'Bidang Usaha', nilai: 'Sparepart motor & mobil, oli dan pelumas', Icon: Package },
  { label: 'Wilayah', nilai: 'Sumatera Selatan, Lampung, Bengkulu, Jambi, Bangka Belitung', Icon: Truck },
  { label: 'Kantor', nilai: 'Komp. Pergudangan Palembang Star 1 Blok E5, Jl. Tanjung Api-Api, Palembang', Icon: MapPin },
];

export const LoginBrandPanel: React.FC = () => {
  return (
    <section className="hidden lg:flex lg:w-5/12 xl:w-1/2 h-full min-h-0 bg-workshop-pattern text-white relative overflow-hidden border-r border-border-dark px-10 xl:px-14 py-8 flex-col justify-center items-center">

      {/* Dekorasi: roda/ban otomotif berputar sangat pelan (di belakang konten) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        fill="none"
        className="login-wheel absolute -right-28 -bottom-28 w-[32rem] pointer-events-none select-none text-teal-300 opacity-30"
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
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-teal-300/40 to-transparent" />

      {/* Satu grup konten, terpusat vertikal & horizontal */}
      <div className="relative z-10 w-full max-w-md xl:max-w-lg flex flex-col">

        {/* Logo chip */}
        <div className="mb-8 login-reveal" style={{ animationDelay: '0ms' }}>
          <div className="bg-white p-2 rounded-lg inline-flex">
            <img
              src={LOGO_SRC}
              alt="PT Lotus Pradipta Mulia"
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>

        <div className="login-reveal" style={{ animationDelay: '80ms' }}>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-teal-300 font-semibold">
            Distributor Sparepart &amp; Pelumas
          </p>
          <h1 className="mb-3 text-3xl xl:text-4xl font-bold tracking-tight leading-tight bg-gradient-to-r from-white via-white to-teal-200 bg-clip-text text-transparent">
            PT Lotus Pradipta Mulia
          </h1>
          <div className="mb-4 w-10 h-0.5 bg-teal-400 rounded-full" aria-hidden="true" />
        </div>

        <p className="mb-5 text-sm xl:text-[15px] leading-relaxed text-white/80 login-reveal" style={{ animationDelay: '160ms' }}>
          PT Lotus Pradipta Mulia adalah perusahaan distributor sparepart motor, mobil, dan oli yang berbasis di Palembang. Melayani distribusi ke wilayah Sumatera Selatan, Lampung, Bengkulu, Jambi, dan Bangka Belitung.
        </p>

        {/* Fakta ringkas dengan ikon */}
        <dl className="mb-5 border-t border-b border-white/10 divide-y divide-white/10 login-reveal" style={{ animationDelay: '240ms' }}>
          {faktaProfil.map(({ label, nilai, Icon }) => (
            <div key={label} className="grid grid-cols-[1.75rem_5.75rem_1fr] items-start gap-3 py-2.5">
              <div aria-hidden="true" className="w-7 h-7 rounded-md bg-teal-400/10 border border-teal-300/20 text-teal-300 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <dt className="text-xs uppercase tracking-wider text-white/60 pt-1">{label}</dt>
              <dd className="text-[13px] text-white/90 leading-snug pt-1">{nilai}</dd>
            </div>
          ))}
        </dl>

        {/* Merek yang didistribusikan (disembunyikan otomatis di layar sangat pendek) */}
        <div className="[@media(max-height:560px)]:hidden login-reveal" style={{ animationDelay: '320ms' }}>
          <p className="mb-2 text-xs text-white/60">Merek yang Didistribusikan</p>
          <div className="flex flex-wrap gap-1.5">
            {merek.map((nama) => (
              <span key={nama} className="rounded-full px-2.5 py-1 text-xs text-white bg-white/10 border border-teal-300/20 transition-colors hover:bg-teal-400/15 hover:border-teal-300/40">
                {nama}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
