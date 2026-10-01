import React from 'react';
import { Ban, ShieldAlert, ArrowLeft, PhoneCall, Mail } from 'lucide-react';

interface DeactivatedAccountViewProps {
  email?: string;
  namaLengkap?: string;
  onLogout: () => void;
}

export const DeactivatedAccountView: React.FC<DeactivatedAccountViewProps> = ({
  email,
  namaLengkap,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between antialiased font-sans">
      {/* Top red warning accent */}
      <div className="h-1.5 w-full bg-rose-600" />

      {/* Main warning container (Clean blank white canvas with warning card) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-white border border-rose-200 rounded-2xl shadow-xl shadow-rose-500/5 p-6 sm:p-10 text-center">
          
          {/* Deactivated Icon Badge */}
          <div className="mx-auto w-20 h-20 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center mb-6 text-rose-600 shadow-sm animate-pulse">
            <Ban className="w-10 h-10" />
          </div>

          {/* Heading */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100/70 border border-rose-300 text-rose-800 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Akses Dibatasi</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Akun Anda Telah Dinonaktifkan
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Mohon maaf, status keanggotaan/akun kemitraan kendaraan Anda saat ini dinyatakan{' '}
            <strong className="text-rose-700 font-bold">Non-Aktif</strong>. Anda tidak dapat mengakses
            dan mengelola armada pada sistem Web Fleet PT Lotus Pradipta Mulia.
          </p>

          {/* Target account info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-xs text-slate-600 flex flex-col items-center gap-1">
            {namaLengkap && (
              <span className="font-bold text-slate-800 text-sm">{namaLengkap}</span>
            )}
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{email || 'Akun Pengguna'}</span>
            </div>
          </div>

          {/* Action / Help Desk */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-xs text-rose-900 mb-6 text-left space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Pusat Informasi &amp; Reaktivasi Akun</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Jika Anda merasa ini adalah kekeliruan atau ingin memperbarui data kemitraan kendaraan,
              silakan hubungi manajemen layanan atau administrator bengkel kami:
            </p>
            <div className="text-[11px] font-mono font-bold text-slate-800 pt-1">
              📞 (061) 8920123 / 0812-6543-9870 • ✉️ service@kim3bengkel.co.id
            </div>
          </div>

          {/* Logout Action */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Keluar ke Halaman Login</span>
            </button>
          </div>

        </div>
      </div>

      {/* Footer Branding */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        PT Lotus Pradipta Mulia — Sistem Manajemen Layanan &amp; Perawatan Kendaraan
      </footer>
    </div>
  );
};
