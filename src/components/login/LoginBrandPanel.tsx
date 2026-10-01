import React from 'react';

/**
 * Panel brand sisi kiri halaman login (hanya dirender pada layar >= lg).
 * Komponen presentasional murni: profil singkat perusahaan, tanpa props/state.
 * Seluruh konten disatukan dalam satu grup di tengah panel, pas setinggi
 * viewport (induk lg:h-dvh) tanpa scroll halaman.
 */

const LOGO_SRC = '/logo.png'; // ganti ke logo PT Lotus Pradipta Mulia

const merek = ['Federal Oil', 'Furukawa Battery', 'Indotube', 'RKN', 'Ichidai', 'Philips'];

const faktaProfil: { label: string; nilai: string }[] = [
  { label: 'Bidang Usaha', nilai: 'Sparepart motor & mobil, oli dan pelumas' },
  { label: 'Wilayah', nilai: 'Sumatera Selatan, Lampung, Bengkulu, Jambi, Bangka Belitung' },
  { label: 'Kantor', nilai: 'Komp. Pergudangan Palembang Star 1 Blok E5, Jl. Tanjung Api-Api, Palembang' },
];

export const LoginBrandPanel: React.FC = () => {
  return (
    <section className="hidden lg:flex lg:w-5/12 xl:w-1/2 h-full min-h-0 bg-workshop-pattern text-white relative overflow-hidden border-r border-border-dark px-10 xl:px-14 py-8 flex-col justify-center items-center">

      {/* Dekorasi: logo besar samar di pojok kanan bawah */}
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        className="absolute -right-12 -bottom-16 w-[28rem] opacity-[0.05] pointer-events-none select-none"
      />

      {/* Satu grup konten, terpusat vertikal & horizontal */}
      <div className="relative z-10 w-full max-w-md xl:max-w-lg flex flex-col">

        {/* Logo chip */}
        <div className="mb-8">
          <div className="bg-white p-2 rounded-lg inline-flex">
            <img
              src={LOGO_SRC}
              alt="PT Lotus Pradipta Mulia"
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>

        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-teal-300 font-semibold">
          Distributor Sparepart &amp; Pelumas
        </p>
        <h1 className="mb-3 text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
          PT Lotus Pradipta Mulia
        </h1>
        <div className="mb-4 w-10 h-0.5 bg-teal-400 rounded-full" aria-hidden="true" />
        <p className="mb-5 text-sm xl:text-[15px] leading-relaxed text-white/80">
          PT Lotus Pradipta Mulia adalah perusahaan distributor sparepart motor, mobil, dan oli yang berbasis di Palembang. Melayani distribusi ke wilayah Sumatera Selatan, Lampung, Bengkulu, Jambi, dan Bangka Belitung.
        </p>

        {/* Fakta ringkas */}
        <dl className="mb-5 border-t border-b border-white/10 divide-y divide-white/10">
          {faktaProfil.map(({ label, nilai }) => (
            <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
              <dt className="text-xs uppercase tracking-wider text-white/60">{label}</dt>
              <dd className="text-[13px] text-white/90 leading-snug">{nilai}</dd>
            </div>
          ))}
        </dl>

        {/* Merek yang didistribusikan (disembunyikan otomatis di layar sangat pendek) */}
        <div className="[@media(max-height:560px)]:hidden">
          <p className="mb-2 text-xs text-white/60">Merek yang Didistribusikan</p>
          <div className="flex flex-wrap gap-1.5">
            {merek.map((nama) => (
              <span key={nama} className="rounded-full px-2.5 py-1 text-xs bg-white/10 border border-white/15 text-white">
                {nama}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
