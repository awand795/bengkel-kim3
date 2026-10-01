import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, RefreshCw, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import { toast } from '../components/common/Toast';

interface UnverifiedEmailViewProps {
  email?: string;
  onLogout: () => void;
}

export const UnverifiedEmailView: React.FC<UnverifiedEmailViewProps> = ({ email, onLogout }) => {
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const res = await api.resendVerification(email);
      if (res.already_verified) {
        toast.success('Email Anda sudah terverifikasi! Silakan muat ulang halaman.');
        window.location.reload();
        return;
      }
      setResendSuccess(true);
      setCooldown(60);
      toast.success('Tautan verifikasi baru berhasil dikirim ke email Anda.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengirim ulang email verifikasi. Silakan coba lagi.';
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between antialiased font-sans">
      {/* Top subtle bar */}
      <div className="h-1.5 w-full bg-amber-500" />

      {/* Main warning container (Clean blank white canvas with warning card) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-white border border-amber-200 rounded-2xl shadow-xl shadow-amber-500/5 p-6 sm:p-10 text-center">
          
          {/* Warning Icon Badge */}
          <div className="mx-auto w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center mb-6 text-amber-500 shadow-sm animate-pulse">
            <AlertTriangle className="w-10 h-10" />
          </div>

          {/* Warning Title */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Pemberitahuan Keamanan
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Email Belum Terverifikasi
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
            Akun Anda belum terverifikasi. Tolong verifikasi email Anda terlebih dahulu sebelum dapat mengakses portal Web Fleet Master Truck.
          </p>

          {/* Email target box */}
          {email && (
            <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-sm text-slate-700">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 break-all">{email}</span>
            </div>
          )}

          {/* Notification Info Alert */}
          {resendSuccess ? (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-emerald-800">
                <p className="font-semibold">Tautan Verifikasi Telah Dikirim!</p>
                <p className="mt-0.5 text-emerald-700">Silakan periksa kotak masuk (Inbox) atau folder Spam pada email Anda, lalu klik tautan di dalamnya.</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-left text-xs sm:text-sm text-amber-900">
              <p className="font-semibold mb-1">Petunjuk Verifikasi:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800/90 text-xs">
                <li>Buka aplikasi email Anda (Gmail, Yahoo, Outlook, dll).</li>
                <li>Cari email dari <strong>Master Truck</strong>.</li>
                <li>Klik tombol <strong>Verifikasi Email</strong> di dalam pesan.</li>
                <li>Jika email tidak muncul, tunggu beberapa saat atau klik tombol kirim ulang di bawah.</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-sm transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
              {isResending
                ? 'Mengirim...'
                : cooldown > 0
                ? `Kirim Ulang (${cooldown}s)`
                : 'Kirim Ulang Email Verifikasi'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium text-sm transition-all border border-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Kembali ke Login
            </button>
          </div>

        </div>
      </div>

      {/* Clean minimal footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        &copy; {new Date().getFullYear()} Master Truck &bull; KIM 3, Medan &bull; Layanan Web Fleet
      </footer>
    </div>
  );
};
