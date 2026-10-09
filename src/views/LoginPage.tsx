import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api, getApiErrorMessage } from '../api/client';
import { isValidEmail } from '../utils/validation';
import { 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { toast } from '../components/common/Toast';
import { LoginBrandPanel } from '../components/login/LoginBrandPanel';

// Kelas bersama skala form sisi kanan (dipakai form Login & Daftar Mitra)
const INPUT_CLS = 'auth-input w-full pl-11 pr-3.5 py-3 text-sm sm:text-[15px] rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#12388F] focus:ring-2 focus:ring-[#12388F]/20 transition-all';
const INPUT_PWD_CLS = INPUT_CLS.replace('pr-3.5', 'pr-11');
const LABEL_CLS = 'auth-label block text-sm font-semibold text-[#0F172A] mb-1.5';
const ICON_WRAP_CLS = 'absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] group-focus-within:text-[#12388F] transition-colors';

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(
    typeof window !== 'undefined' && window.location.hash === '#register' ? 'register' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State: bisa berupa Email atau No. HP
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register Form State: Pendaftaran sebagai Perusahaan atau Perorangan
  const [tipeMitra, setTipeMitra] = useState<'perusahaan' | 'perorangan'>('perusahaan');
  const [regForm, setRegForm] = useState({
    nama_perusahaan: '',
    nama_lengkap: '', // PIC / Penanggung Jawab jika Perusahaan, atau Nama Lengkap jika Perorangan
    no_telepon: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isEngineStarting, setIsEngineStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot Password / OTP State
  const [forgotStep, setForgotStep] = useState<'request_otp' | 'reset_password'>('request_otp');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer cooldown pengiriman ulang OTP
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Masukkan alamat email Anda.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMsg('Format email tidak valid. Masukkan alamat email yang benar.');
      return;
    }

    setIsForgotLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.forgotPassword(cleanEmail);
      setSuccessMsg(res.message || 'Kode OTP telah dikirim ke email Anda.');
      setForgotStep('reset_password');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'Gagal mengirim kode OTP. Pastikan email terdaftar.'));
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isForgotLoading) return;
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsForgotLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.forgotPassword(cleanEmail);
      setSuccessMsg(res.message || 'Kode OTP baru telah dikirim ke email Anda.');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'Gagal mengirim ulang kode OTP.'));
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanOtp = forgotOtp.trim();

    if (!cleanOtp) {
      setErrorMsg('Masukkan 6 digit kode OTP yang diterima melalui email.');
      return;
    }
    if (cleanOtp.length < 4) {
      setErrorMsg('Kode OTP tidak lengkap.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsForgotLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.resetPassword({
        email: cleanEmail,
        otp: cleanOtp,
        password_baru: newPassword,
      });

      toast.success(res.message || 'Kata sandi berhasil diperbarui! Silakan masuk.');
      setLoginIdentifier(cleanEmail);
      setPassword('');
      setActiveTab('login');
      setForgotStep('request_otp');
      setForgotOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(res.message || 'Kata sandi berhasil diperbarui! Silakan login dengan kata sandi baru Anda.');
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'Gagal mereset kata sandi. Pastikan kode OTP benar dan belum kedaluwarsa.'));
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginIdentifier.trim();
    if (!cleanId || !password.trim()) {
      setErrorMsg('Masukkan nomor HP atau email serta kata sandi.');
      return;
    }

    if (cleanId.includes('@')) {
      if (!isValidEmail(cleanId)) {
        setErrorMsg('Format email tidak valid. Masukkan domain lengkap (contoh: nama@perusahaan.com)');
        return;
      }
    } else {
      const digits = cleanId.replace(/[^0-9]/g, '');
      if (digits.length < 8) {
        setErrorMsg('Nomor HP/WhatsApp minimal 8 digit angka (contoh: 081234567890)');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(cleanId, password);
      if (res.access_token) {
        // Trigger single crisp "start engine" ignition transition
        setIsEngineStarting(true);
        setTimeout(() => {
          loginUser(
            res.user || { nama_lengkap: cleanId, peran: 'Customer Fleet' }, 
            res.access_token, 
            res.refresh_token
          );
          // Profil penuh (termasuk foto) diambil terpisah agar JWT login
          // tetap kecil — JWT raksasa memicu 431 di semua request.
          api.getMe().then((me) => {
            useAppStore.setState({ authUser: me, currentUser: me.nama_lengkap || '' });
            try {
              localStorage.setItem('bengkel_auth_user', JSON.stringify(me));
            } catch {
              /* abaikan */
            }
          }).catch(() => {
            /* sesi tetap valid dari login; refresh berikutnya melengkapi */
          });
        }, 650);
      } else {
        setErrorMsg('Nomor HP / Email atau password salah.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      if (
        serverMsg && 
        typeof serverMsg === 'string' && 
        !serverMsg.toLowerCase().includes('internal') && 
        !serverMsg.toLowerCase().includes('database')
      ) {
        setErrorMsg(serverMsg);
      } else {
        setErrorMsg('Nomor HP / Email atau password salah.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regForm.email.trim();
    const cleanPhone = regForm.no_telepon.trim();
    const cleanNama = regForm.nama_lengkap.trim();
    const cleanPerusahaan = regForm.nama_perusahaan.trim();

    if (tipeMitra === 'perusahaan') {
      if (!cleanPerusahaan) {
        setErrorMsg('Nama perusahaan wajib diisi.');
        return;
      }
      if (!cleanNama) {
        setErrorMsg('Nama penanggung jawab operasional (PIC) wajib diisi.');
        return;
      }
    } else {
      if (!cleanNama) {
        setErrorMsg('Nama lengkap pemilik kendaraan / perorangan wajib diisi.');
        return;
      }
    }

    if (!cleanEmail) {
      setErrorMsg('Alamat email wajib diisi.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMsg('Format email tidak valid. Masukkan alamat email yang benar (contoh: nama@perusahaan.com)');
      return;
    }

    let normalizedPhone = '';
    if (cleanPhone) {
      const digits = cleanPhone.replace(/[^0-9]/g, '');
      normalizedPhone = digits;
      if (normalizedPhone.startsWith('62')) {
        normalizedPhone = '0' + normalizedPhone.substring(2);
      }

      if (!normalizedPhone.startsWith('08')) {
        setErrorMsg('Nomor HP/WhatsApp tidak valid. Jika diisi, harus diawali dengan 08 atau 628.');
        return;
      }

      if (normalizedPhone.length < 11 || normalizedPhone.length > 13) {
        setErrorMsg(`Nomor HP/WhatsApp jika diisi harus minimal 11 sampai 13 digit angka (saat ini ${normalizedPhone.length} digit).`);
        return;
      }
    }

    const pwd = regForm.password;
    const confirmPwd = regForm.confirm_password;

    if (!pwd || !pwd.trim()) {
      setErrorMsg('Kata sandi wajib diisi.');
      return;
    }

    if (pwd.length < 6) {
      setErrorMsg('Kata sandi minimal harus 6 karakter.');
      return;
    }

    if (!confirmPwd || !confirmPwd.trim()) {
      setErrorMsg('Konfirmasi kata sandi wajib diisi.');
      return;
    }

    if (pwd !== confirmPwd) {
      setErrorMsg('Kata sandi dan konfirmasi kata sandi tidak cocok. Pastikan keduanya sama persis.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.register({
        email: cleanEmail,
        password: pwd,
        nama_lengkap: tipeMitra === 'perusahaan' ? cleanPerusahaan : cleanNama,
        nama_perusahaan: tipeMitra === 'perusahaan' ? cleanPerusahaan : cleanNama,
        nama_pic: tipeMitra === 'perusahaan' ? cleanNama : '-',
        no_telepon: normalizedPhone,
      });
      if (res.success || res.data?.id) {
        setSuccessMsg('Pendaftaran mitra berhasil! Tautan verifikasi telah dikirimkan ke ' + cleanEmail + '. Silakan periksa inbox/spam email Anda untuk verifikasi.');
        setLoginIdentifier(cleanEmail || normalizedPhone);
        setPassword(pwd);
        setTimeout(() => {
          setActiveTab('login');
        }, 2500);
      }
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Pendaftaran gagal. Email atau nomor HP mungkin sudah terdaftar.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page login-legacy-theme min-h-screen lg:h-dvh lg:overflow-hidden flex flex-col lg:flex-row bg-surface text-ink antialiased font-sans relative">
      
      {/* Top Bar Aksen Tipis (--color-accent Petrol Teal) */}
      <div className="h-[2px] w-full bg-accent fixed top-0 left-0 z-50 pointer-events-none" />

      {/* ========================================================================= */}
      {/* SISI KIRI: PANEL BRAND (Web Fleet - Profil & Produk)                      */}
      {/* ========================================================================= */}
      <LoginBrandPanel />

      {/* ========================================================================= */}
      {/* SISI KANAN: FORM LOGIN & REGISTER (Kontras Tinggi, Aksen Teal)            */}
      {/* ========================================================================= */}
      <section className="flex-1 bg-[#E8EEF5] login-form-bg flex flex-col items-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[30rem] my-auto">
          
          {/* Mobile Header Branding */}
          <div className="lg:hidden mb-5 flex flex-col items-center text-center">
            <div className="bg-surface-raised p-2 px-3.5 rounded-md border border-[#CBD5E1] mb-2 inline-flex items-center gap-2 shadow-xs">
              <img src="/logo.png" alt="Master Truck Logo" className="h-7 w-auto object-contain" />
              <span className="text-sm font-bold text-[#0F172A]">MASTER TRUCK</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent-subtle text-accent border border-accent/20">
              Web Fleet
            </span>
          </div>

          {/* Card Form */}
          <div className="relative overflow-hidden bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-9 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/10 login-reveal">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-[#2563EB] to-[#F59E0B]" />
            
            {/* Tab Navigasi Masuk / Daftar: Segmented Pill Switcher Modern */}
            {activeTab === 'forgot' ? (
              <div className="flex items-center justify-between p-1 bg-[#F1F5F9] rounded-lg border border-[#CBD5E1]/70 mb-7 px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#12388F] hover:text-[#0c235c] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Halaman Login</span>
                </button>
                <span className="text-[11px] font-semibold text-accent px-2 py-0.5 rounded-full bg-accent-subtle border border-accent/20">
                  Reset Sandi
                </span>
              </div>
            ) : (
              <div className="flex p-1 bg-[#F1F5F9] rounded-lg border border-[#CBD5E1]/70 mb-7">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-sm rounded-md transition-all cursor-pointer text-center ${
                    activeTab === 'login'
                      ? 'bg-white text-[#12388F] shadow-xs font-bold'
                      : 'auth-tab-inactive text-[#475569] hover:text-[#12388F] font-semibold'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-sm rounded-md transition-all cursor-pointer text-center ${
                    activeTab === 'register'
                      ? 'bg-white text-[#12388F] shadow-xs font-bold'
                      : 'auth-tab-inactive text-[#475569] hover:text-[#12388F] font-semibold'
                  }`}
                >
                  Daftar Mitra
                </button>
              </div>
            )}

            {/* Header Form */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                {activeTab === 'login'
                  ? 'Login'
                  : activeTab === 'register'
                  ? 'Pendaftaran Mitra Fleet'
                  : 'Lupa Kata Sandi'}
              </h2>
              <p className="auth-subtitle text-sm text-[#475569] mt-1 leading-relaxed">
                {activeTab === 'login' 
                  ? 'Masuk dengan nomor HP atau email akun mitra fleet Anda.' 
                  : activeTab === 'register'
                  ? 'Pilih tipe kemitraan dan lengkapi data untuk mendaftar akun.'
                  : forgotStep === 'request_otp'
                  ? 'Masukkan alamat email akun Anda untuk menerima 6 digit kode OTP verifikasi.'
                  : 'Masukkan kode OTP yang dikirimkan ke email Anda dan tentukan kata sandi baru.'}
              </p>
            </div>

            {/* State Error Login Jujur & Langsung */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-md bg-status-red-bg border border-status-red/20 text-status-red text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-status-red" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* State Sukses */}
            {successMsg && (
              <div className="mb-4 p-3.5 rounded-md bg-status-green-bg border border-status-green/20 text-status-green text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-status-green" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Momen Start Engine Saat Login Berhasil */}
            {isEngineStarting && (
              <div className="mb-5 p-4 rounded-md border border-border bg-surface space-y-2.5">
                <div className="flex items-center justify-between text-sm font-semibold text-ink">
                  <span>Memulai sesi sistem...</span>
                  <span className="font-mono text-accent tabular-nums">ONLINE</span>
                </div>
                <div className="w-full h-1.5 bg-surface-raised rounded-xs overflow-hidden border border-border">
                  <div className="h-full bg-accent animate-engine-start" />
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* FORM MASUK (LOGIN)                                                 */}
            {/* =================================================================== */}
            {activeTab === 'login' && !isEngineStarting && (
              <form onSubmit={handleLogin} className="login-form-swap space-y-5">
                {/* Nomor HP / Email */}
                <div>
                  <label className={LABEL_CLS} htmlFor="login_identifier">
                    Nomor HP / Email
                  </label>
                  <div className="relative group">
                    <div className={ICON_WRAP_CLS}>
                      <User className="w-[18px] h-[18px]" />
                    </div>
                    <input
                      id="login_identifier"
                      name="identifier"
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Nomor HP atau Email"
                      autoComplete="username"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={LABEL_CLS} htmlFor="password">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot');
                        setForgotStep('request_otp');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        if (loginIdentifier.includes('@')) {
                          setForgotEmail(loginIdentifier.trim());
                        }
                      }}
                      className="text-sm font-semibold text-[#12388F] hover:underline cursor-pointer transition-colors"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className={ICON_WRAP_CLS}>
                      <Lock className="w-[18px] h-[18px]" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className={INPUT_PWD_CLS}
                    />
                    <button
                      type="button"
                      aria-label="Tampilkan atau sembunyikan kata sandi"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Tombol Masuk */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(isLoading)}
                    className="login-btn relative overflow-hidden w-full py-3 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-[15px] rounded-md hover:-translate-y-px active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="w-[18px] h-[18px]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* =================================================================== */}
            {/* FORM REGISTRASI MITRA (PERUSAHAAN / PERORANGAN)                    */}
            {/* =================================================================== */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="login-form-swap space-y-4">
                {/* Switcher Tipe Mitra */}
                <div>
                  <label className={LABEL_CLS}>
                    Kategori Kemitraan Kendaraan <span className="text-status-red">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-lg border border-border/70">
                    <button
                      type="button"
                      onClick={() => setTipeMitra('perusahaan')}
                      className={`py-2.5 px-2.5 text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tipeMitra === 'perusahaan'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Perusahaan (PT/CV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipeMitra('perorangan')}
                      className={`py-2.5 px-2.5 text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tipeMitra === 'perorangan'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Perorangan / Pribadi</span>
                    </button>
                  </div>
                </div>

                {/* Field Khusus Perusahaan */}
                {tipeMitra === 'perusahaan' ? (
                  <>
                    {/* Nama Perusahaan */}
                    <div>
                      <label className={LABEL_CLS} htmlFor="reg_perusahaan">
                        Nama Perusahaan / Badan Usaha <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className={ICON_WRAP_CLS}>
                          <Building2 className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          id="reg_perusahaan"
                          type="text"
                          required
                          value={regForm.nama_perusahaan}
                          onChange={(e) => setRegForm({ ...regForm, nama_perusahaan: e.target.value })}
                          placeholder="contoh: PT. Maju Logistik Nusantara"
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    {/* Nama PIC / Penanggung Jawab */}
                    <div>
                      <label className={LABEL_CLS} htmlFor="reg_pic">
                        Nama Penanggung Jawab Operasional (PIC) <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className={ICON_WRAP_CLS}>
                          <User className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          id="reg_pic"
                          type="text"
                          required
                          value={regForm.nama_lengkap}
                          onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                          placeholder="contoh: Budi Santoso (Transport Manager)"
                          className={INPUT_CLS}
                        />
                      </div>
                      <p className="text-xs text-ink-subtle mt-1">
                        Kontak person yang berwenang menyetujui estimasi biaya dan koordinasi perbaikan kendaraan.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Field Khusus Perorangan */
                  <div>
                    <label className={LABEL_CLS} htmlFor="reg_nama">
                      Nama Lengkap <span className="text-status-red">*</span>
                    </label>
                    <div className="relative group">
                      <div className={ICON_WRAP_CLS}>
                        <User className="w-[18px] h-[18px]" />
                      </div>
                      <input
                        id="reg_nama"
                        type="text"
                        required
                        value={regForm.nama_lengkap}
                        onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                        placeholder="contoh: Ahmad Syahputra"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className={LABEL_CLS} htmlFor="reg_email">
                    Alamat Email <span className="text-status-red">*</span>
                  </label>
                  <div className="relative group">
                    <div className={ICON_WRAP_CLS}>
                      <Mail className="w-[18px] h-[18px]" />
                    </div>
                    <input
                      id="reg_email"
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="nama@perusahaan.com"
                      autoComplete="email"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                {/* No. WhatsApp / HP */}
                <div>
                  <label className={LABEL_CLS} htmlFor="reg_phone">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative group">
                    <div className={ICON_WRAP_CLS}>
                      <Phone className="w-[18px] h-[18px]" />
                    </div>
                    <input
                      id="reg_phone"
                      type="tel"
                      maxLength={14}
                      value={regForm.no_telepon}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setRegForm({ ...regForm, no_telepon: val });
                      }}
                      placeholder="contoh: 081234567890"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className={LABEL_CLS} htmlFor="reg_pwd">
                    Kata Sandi <span className="text-status-red">*</span>
                  </label>
                  <div className="relative group">
                    <div className={ICON_WRAP_CLS}>
                      <Lock className="w-[18px] h-[18px]" />
                    </div>
                    <input
                      id="reg_pwd"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Buat kata sandi minimal 6 karakter"
                      className={INPUT_PWD_CLS}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label className={LABEL_CLS} htmlFor="reg_confirm_pwd">
                    Konfirmasi Kata Sandi <span className="text-status-red">*</span>
                  </label>
                  <div className="relative group">
                    <div className={ICON_WRAP_CLS}>
                      <ShieldCheck className="w-[18px] h-[18px]" />
                    </div>
                    <input
                      id="reg_confirm_pwd"
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regForm.confirm_password}
                      onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                      placeholder="Ulangi kata sandi Anda"
                      className={INPUT_PWD_CLS}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regForm.confirm_password && regForm.password !== regForm.confirm_password && (
                    <p className="text-xs text-status-red mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Konfirmasi kata sandi belum sama
                    </p>
                  )}
                  {regForm.confirm_password && regForm.password === regForm.confirm_password && (
                    <p className="text-xs text-status-green mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kata sandi cocok
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(isLoading)}
                    className="login-btn relative overflow-hidden w-full py-3 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-[15px] rounded-md hover:-translate-y-px active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        <span>Mendaftarkan Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Daftarkan Akun Mitra</span>
                        <ArrowRight className="w-[18px] h-[18px]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* =================================================================== */}
            {/* FORM LUPA KATA SANDI (FORGOT PASSWORD / OTP)                        */}
            {/* =================================================================== */}
            {activeTab === 'forgot' && !isEngineStarting && (
              <div className="login-form-swap space-y-5">
                {forgotStep === 'request_otp' ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label className={LABEL_CLS} htmlFor="forgot_email">
                        Alamat Email Akun <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className={ICON_WRAP_CLS}>
                          <Mail className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          id="forgot_email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nama@perusahaan.com"
                          autoComplete="email"
                          className={INPUT_CLS}
                        />
                      </div>
                      <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                        Kami akan mengirimkan 6 digit kode OTP verifikasi ke alamat email ini.
                      </p>
                    </div>

                    <div className="pt-2 space-y-3">
                      <button
                        type="submit"
                        disabled={Boolean(isForgotLoading)}
                        className="login-btn relative overflow-hidden w-full py-3 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-[15px] rounded-md hover:-translate-y-px active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isForgotLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            <span>Mengirim Kode OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Kirim Kode OTP</span>
                            <ArrowRight className="w-[18px] h-[18px]" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('login');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-[#475569] hover:text-[#12388F] text-center transition-colors cursor-pointer"
                      >
                        Batal &amp; Kembali ke Halaman Login
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {/* Ringkasan info email tujuan */}
                    <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#64748B] block">Email Tujuan OTP:</span>
                        <span className="font-semibold text-[#0F172A]">{forgotEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('request_otp');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-accent hover:underline font-semibold cursor-pointer text-xs"
                      >
                        Ubah Email
                      </button>
                    </div>

                    {/* Input OTP */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={LABEL_CLS} htmlFor="otp_code">
                          Kode OTP (6 Digit) <span className="text-status-red">*</span>
                        </label>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || isForgotLoading}
                          onClick={handleResendOtp}
                          className="text-xs font-semibold text-[#12388F] hover:underline disabled:text-gray-400 disabled:no-underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${isForgotLoading ? 'animate-spin' : ''}`} />
                          {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
                        </button>
                      </div>
                      <div className="relative group">
                        <div className={ICON_WRAP_CLS}>
                          <KeyRound className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          id="otp_code"
                          type="text"
                          maxLength={6}
                          required
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="123456"
                          className={`${INPUT_CLS} font-mono tracking-widest text-lg font-bold text-center`}
                        />
                      </div>
                    </div>

                    {/* Kata Sandi Baru */}
                    <div>
                      <label className={LABEL_CLS} htmlFor="new_password">
                        Kata Sandi Baru <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className={ICON_WRAP_CLS}>
                          <Lock className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          id="new_password"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className={INPUT_PWD_CLS}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Kata Sandi Baru */}
                    <div>
                      <label className={LABEL_CLS} htmlFor="confirm_password">
                        Konfirmasi Kata Sandi Baru <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className={ICON_WRAP_CLS}>
                          <ShieldCheck className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          id="confirm_password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ketik ulang kata sandi baru"
                          className={INPUT_PWD_CLS}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <button
                        type="submit"
                        disabled={Boolean(isForgotLoading)}
                        className="login-btn relative overflow-hidden w-full py-3 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-[15px] rounded-md hover:-translate-y-px active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isForgotLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            <span>Menyimpan Kata Sandi...</span>
                          </>
                        ) : (
                          <>
                            <span>Simpan Kata Sandi Baru</span>
                            <ArrowRight className="w-[18px] h-[18px]" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('login');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-[#475569] hover:text-[#12388F] text-center transition-colors cursor-pointer"
                      >
                        Batal &amp; Kembali ke Halaman Login
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Profil perusahaan ringkas (mobile): panel kiri disembunyikan di < lg */}
          <div className="lg:hidden mt-6 text-center">
            <p className="text-xs text-ink-muted">
              Bengkel Spesialis Perawatan &amp; Perbaikan Armada Truk · KIM III
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>KIM III Mabar, Medan, Sumatera Utara</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default LoginPage;
