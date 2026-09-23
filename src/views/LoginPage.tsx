import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import { PeranUser } from '../types';
import { 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Phone,
  Mail,
  ShieldCheck,
  ClipboardList,
  Wrench,
  CheckCircle,
  Truck,
  ArrowRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    typeof window !== 'undefined' && window.location.hash === '#register' ? 'register' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);
  
  // Checkbox default unchecked
  const [rememberMe, setRememberMe] = useState(false);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form State
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    nama_lengkap: '',
    no_telepon: '',
    peran: 'Customer Fleet' as PeranUser,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEngineStarting, setIsEngineStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Masukkan email dan password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(email.trim(), password);
      if (res.access_token) {
        // Trigger single crisp "start engine" ignition transition
        setIsEngineStarting(true);
        setTimeout(() => {
          loginUser(
            res.user || { nama_lengkap: email.trim(), peran: 'Customer Fleet' }, 
            res.access_token, 
            res.refresh_token
          );
        }, 650);
      } else {
        setErrorMsg('Email atau password salah');
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
        setErrorMsg('Email atau password salah');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.email.trim() || !regForm.password.trim() || !regForm.nama_lengkap.trim()) {
      setErrorMsg('Lengkapi seluruh kolom bertanda bintang');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.register({
        email: regForm.email.trim(),
        password: regForm.password,
        nama_lengkap: regForm.nama_lengkap.trim(),
        peran: regForm.peran,
        no_telepon: regForm.no_telepon.trim(),
      });
      if (res.success) {
        setSuccessMsg('Pendaftaran berhasil. Silakan masuk dengan email Anda.');
        setEmail(regForm.email);
        setPassword(regForm.password);
        setTimeout(() => {
          setActiveTab('login');
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Pendaftaran gagal. Email mungkin sudah terdaftar.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-surface text-ink antialiased font-sans relative">
      
      {/* Top Bar Aksen Tipis (--color-accent Petrol Teal) */}
      <div className="h-[2px] w-full bg-accent fixed top-0 left-0 z-50 pointer-events-none" />

      {/* ========================================================================= */}
      {/* SISI KIRI: IDENTITAS WORKSHOP & ALUR PROSES NON-DATA                      */}
      {/* ========================================================================= */}
      <section className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-workshop-pattern text-white p-10 xl:p-14 flex-col justify-between relative overflow-hidden border-r border-border-dark">
        
        {/* Subtle Watermark Logo Background */}
        <div className="absolute -right-16 -bottom-16 opacity-[0.04] pointer-events-none select-none">
          <img 
            src="/logo.png" 
            alt="" 
            className="w-96 h-96 object-contain"
          />
        </div>

        {/* Top: Header & Brand Identity */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-surface-dark border border-border-dark rounded-md px-3.5 py-2">
            <img 
              src="/logo.png" 
              alt="KIM3 Bengkel" 
              className="h-8 w-auto object-contain"
            />
            <div className="border-l border-border-dark pl-3">
              <span className="block text-xs font-bold tracking-tight text-white leading-tight">BENGKEL KIM 3</span>
              <span className="block text-[11px] text-teal-200/70">Kawasan Industri Modern 3</span>
            </div>
          </div>

          <div className="mt-8 max-w-lg">
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Sistem Operasional Bengkel &amp; Portal Armada Fleet
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-teal-100/80 leading-relaxed">
              Platform terintegrasi untuk pemantauan alur perawatan armada komersial, tata kelola suku cadang, dan koordinasi antar unit kerja bengkel secara transparan.
            </p>
          </div>

          {/* Baris Alur Proses sebagai Label Abstrak Non-Data (Outline Style) */}
          <div className="mt-8 p-5 rounded-md bg-surface-dark/95 border border-border-dark max-w-lg">
            <div className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider mb-4">
              Alur Kerja Standar Operasional
            </div>

            {/* 5 Tahap Alur Resmi (Outline 1.5px + Wash Opacity, Ikon Berwarna Aksen) */}
            <div className="grid grid-cols-5 gap-2 text-center relative">
              
              {/* Step 1: Check In */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-md border-[1.5px] border-accent bg-accent/10 flex items-center justify-center text-accent mb-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] font-semibold text-white leading-tight">Check-In</span>
                <span className="text-[10px] text-teal-200/70 mt-0.5">Security</span>
              </div>

              {/* Step 2: Inspeksi SA */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-md border-[1.5px] border-accent bg-accent/10 flex items-center justify-center text-accent mb-2">
                  <ClipboardList className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] font-semibold text-white leading-tight">Inspeksi</span>
                <span className="text-[10px] text-teal-200/70 mt-0.5">SA Bengkel</span>
              </div>

              {/* Step 3: Pengerjaan Mekanik */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-md border-[1.5px] border-accent bg-accent/10 flex items-center justify-center text-accent mb-2">
                  <Wrench className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] font-semibold text-white leading-tight">Pengerjaan</span>
                <span className="text-[10px] text-teal-200/70 mt-0.5">Mekanik</span>
              </div>

              {/* Step 4: QC Foreman */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-md border-[1.5px] border-accent bg-accent/10 flex items-center justify-center text-accent mb-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] font-semibold text-white leading-tight">QC Final</span>
                <span className="text-[10px] text-teal-200/70 mt-0.5">Foreman</span>
              </div>

              {/* Step 5: Gate Out */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-md border-[1.5px] border-accent bg-accent/10 flex items-center justify-center text-accent mb-2">
                  <Truck className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] font-semibold text-white leading-tight">Gate Out</span>
                <span className="text-[10px] text-teal-200/70 mt-0.5">Pass Keluar</span>
              </div>

            </div>

            <div className="mt-4 pt-3 border-t border-border-dark text-[11px] text-teal-200/70 flex items-center justify-between">
              <span>Sistem Manajemen Alur 5 Tahap</span>
              <span className="text-white font-medium">B2B Portal Fleet</span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 pt-8 border-t border-border-dark flex items-center justify-between text-xs text-teal-200/70">
          <span className="font-mono tabular-nums">KIM 3 Workshop System v2.4</span>
          <span>Medan, Sumatera Utara</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SISI KANAN: FORM LOGIN & REGISTER (Kontras Tinggi, Aksen Teal)            */}
      {/* ========================================================================= */}
      <section className="flex-1 bg-surface flex flex-col justify-center items-center p-5 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          
          {/* Mobile Header Branding */}
          <div className="lg:hidden mb-6 flex flex-col items-center text-center">
            <div className="bg-surface-raised p-2.5 px-4 rounded-md border border-border mb-3 inline-flex items-center gap-2.5 shadow-xs">
              <img src="/logo.png" alt="KIM3 Bengkel Logo" className="h-7 w-auto object-contain" />
              <span className="text-xs font-bold text-ink">BENGKEL KIM 3</span>
            </div>
            <p className="text-xs text-ink-muted">Sistem Operasional &amp; Portal Armada Fleet</p>
          </div>

          {/* Card Form */}
          <div className="bg-surface-raised border border-border rounded-lg p-6 sm:p-8 shadow-xs">
            
            {/* Tab Navigasi Masuk / Daftar: Segmented Pill Switcher Modern */}
            <div className="flex p-1 bg-surface rounded-lg border border-border/70 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer text-center ${
                  activeTab === 'login'
                    ? 'bg-surface-raised text-accent shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer text-center ${
                  activeTab === 'register'
                    ? 'bg-surface-raised text-accent shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Daftar Mitra
              </button>
            </div>

            {/* Header Form */}
            <div className="mb-5">
              <h2 className="text-lg font-bold text-ink tracking-tight">
                {activeTab === 'login' ? 'Masuk ke Sistem' : 'Pendaftaran Akun Mitra'}
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                {activeTab === 'login'
                  ? 'Masukkan email dan password untuk mengakses sistem operasional bengkel.'
                  : 'Lengkapi data diri untuk mendaftarkan akun mitra baru.'}
              </p>
            </div>

            {/* State Error Login Jujur & Langsung */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-md bg-status-red-bg border border-status-red/20 text-status-red text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-status-red" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* State Sukses */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-md bg-status-green-bg border border-status-green/20 text-status-green text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-status-green" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Momen Start Engine Saat Login Berhasil */}
            {isEngineStarting && (
              <div className="mb-5 p-4 rounded-md border border-border bg-surface space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
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
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="login_email">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login_email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@perusahaan.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-ink" htmlFor="password">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Untuk reset kata sandi, hubungi Helpdesk Bengkel KIM 3.')}
                      className="text-xs text-ink-muted hover:text-accent cursor-pointer transition-colors"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all font-sans"
                    />
                    <button
                      type="button"
                      aria-label="Tampilkan atau sembunyikan kata sandi"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Ingat Sesi */}
                <div className="pt-0.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded-xs border-border accent-accent focus:ring-accent cursor-pointer"
                    />
                    <span className="text-xs text-ink-muted">
                      Ingat sesi di perangkat ini
                    </span>
                  </label>
                </div>

                {/* Tombol Masuk */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(isLoading)}
                    className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-sm rounded-md shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Sistem</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* =================================================================== */}
            {/* FORM REGISTRASI MITRA                                              */}
            {/* =================================================================== */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_nama">
                    Nama Lengkap <span className="text-status-red">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg_nama"
                      type="text"
                      required
                      value={regForm.nama_lengkap}
                      onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                      placeholder="Nama lengkap Anda"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_email">
                    Email <span className="text-status-red">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg_email"
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="email@perusahaan.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>
                </div>

                {/* No. HP */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_phone">
                    No. WhatsApp / HP
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="reg_phone"
                      type="text"
                      value={regForm.no_telepon}
                      onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                      placeholder="0812xxxxxxx"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_pwd">
                    Kata Sandi <span className="text-status-red">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg_pwd"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Buat kata sandi akun"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(isLoading)}
                    className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-sm rounded-md shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <span>Daftarkan Akun</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Trust / Security Note */}
            <div className="mt-6 pt-4 border-t border-border/70 flex items-center justify-center gap-2 text-[11px] text-ink-subtle">
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Sesi terenkripsi &amp; terlindungi standar operasional KIM 3</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default LoginPage;
