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
  Building2,
  Truck,
  Wrench,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    typeof window !== 'undefined' && window.location.hash === '#register' ? 'register' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register Form State (Neutral defaults)
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    nama_lengkap: '',
    nama_perusahaan: '',
    peran: 'Customer Fleet' as PeranUser,
    no_telepon: '',
    email: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEngineStarting, setIsEngineStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Masukkan username dan password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(username.trim(), password);
      if (res.access_token) {
        // Trigger single crisp "start engine" ignition transition
        setIsEngineStarting(true);
        setTimeout(() => {
          loginUser(
            res.user || { nama_lengkap: username.trim(), peran: 'Customer Fleet' }, 
            res.access_token, 
            res.refresh_token
          );
        }, 650);
      } else {
        setErrorMsg('Username atau password salah');
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
        setErrorMsg('Username atau password salah');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.username.trim() || !regForm.password.trim() || !regForm.nama_lengkap.trim()) {
      setErrorMsg('Lengkapi seluruh kolom bertanda bintang');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.register({
        username: regForm.username.trim(),
        password: regForm.password,
        nama_lengkap: regForm.nama_lengkap.trim(),
        peran: regForm.peran,
        no_telepon: regForm.no_telepon.trim(),
        email: regForm.email.trim(),
      });
      if (res.success) {
        setSuccessMsg('Pendaftaran akun mitra berhasil. Silakan masuk dengan akun baru Anda.');
        setUsername(regForm.username);
        setPassword(regForm.password);
        setTimeout(() => {
          setActiveTab('login');
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Pendaftaran gagal. Username mungkin telah terdaftar.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-surface text-ink antialiased font-sans">
      
      {/* ========================================================================= */}
      {/* SISI KIRI: IDENTITAS WORKSHOP & PLATFORM KIM 3 (Asimetris Desktop)        */}
      {/* ========================================================================= */}
      <section className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-workshop-pattern text-white p-10 xl:p-14 flex-col justify-between relative overflow-hidden border-r border-border-dark">
        {/* Top: Header & Brand Identity */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-surface-dark border border-border-dark rounded-md px-3.5 py-2 shadow-hairline-dark">
            <img 
              src="/logo.png" 
              alt="KIM3 Bengkel" 
              className="h-8 w-auto object-contain"
            />
            <div className="border-l border-border-dark pl-3">
              <span className="block text-xs font-bold tracking-tight text-white leading-tight">BENGKEL KIM 3</span>
              <span className="block text-[11px] text-ink-subtle">Kawasan Industri Modern 3</span>
            </div>
          </div>

          <div className="mt-8 max-w-lg">
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Sistem Operasional Bengkel &amp; Portal Armada Fleet
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#94A0A9] leading-relaxed">
              Integrasi alur kerja servis dari Security check-in, inspeksi SA, pengerjaan mekanik, quality control foreman, hingga gate out.
            </p>
          </div>

          {/* Technical Telemetry Card (Gaya Workshop Presisi) */}
          <div className="mt-8 p-5 rounded-md bg-surface-dark/95 border border-border-dark shadow-xs max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#1E262C] border border-border-dark flex items-center justify-center text-accent">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white tracking-wider px-1.5 py-0.5 rounded-xs bg-[#242E35] border border-border-dark tabular-nums">
                      BK 8421 XD
                    </span>
                    <span className="text-xs text-[#94A0A9]">Hino 500 FL 260</span>
                  </div>
                  <span className="text-[11px] text-ink-subtle block mt-0.5">Bay Servis #03 — Heavy Duty</span>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-status-blue/30 bg-status-blue-bg/10 text-status-blue text-[11px] font-medium">
                Pengerjaan
              </span>
            </div>

            {/* Alur Servis Ringkas */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xs border border-border-dark bg-[#1A2227]">
                <span className="text-[10px] text-ink-subtle block">Check In</span>
                <span className="text-xs font-semibold text-white font-mono tabular-nums">08:15</span>
              </div>
              <div className="p-2 rounded-xs border border-border-dark bg-[#1A2227]">
                <span className="text-[10px] text-ink-subtle block">SPK Order</span>
                <span className="text-xs font-semibold text-white font-mono tabular-nums">SPK-109</span>
              </div>
              <div className="p-2 rounded-xs border border-accent/40 bg-accent/10">
                <span className="text-[10px] text-accent block">Durasi WO</span>
                <span className="text-xs font-semibold text-accent font-mono tabular-nums">02:45:10</span>
              </div>
              <div className="p-2 rounded-xs border border-border-dark bg-[#1A2227]">
                <span className="text-[10px] text-ink-subtle block">Target QC</span>
                <span className="text-xs font-semibold text-white font-mono tabular-nums">14:00</span>
              </div>
            </div>

            {/* Standar Teknis */}
            <div className="pt-2 border-t border-border-dark flex items-center justify-between text-[11px] text-ink-subtle">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-accent" />
                <span>Inspeksi 40 Titik Armada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-status-green" />
                <span>Validasi Gate Pass Digital</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 pt-8 border-t border-border-dark flex items-center justify-between text-xs text-ink-subtle">
          <span className="font-mono tabular-nums">KIM 3 Workshop Engine v2.4</span>
          <span>Medan, Sumatera Utara</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SISI KANAN: FORM LOGIN & REGISTER (Bersih, Tegas, Radius 4-6px)          */}
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
          <div className="bg-surface-raised border border-border rounded-md p-6 sm:p-8 shadow-xs">
            
            {/* Tab Navigasi Masuk / Daftar */}
            <div className="flex rounded-sm bg-surface p-1 mb-6 border border-border">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer text-center ${
                  activeTab === 'login'
                    ? 'bg-surface-raised text-ink font-semibold shadow-xs'
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
                className={`flex-1 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer text-center ${
                  activeTab === 'register'
                    ? 'bg-surface-raised text-ink font-semibold shadow-xs'
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
              <p className="text-xs text-ink-muted mt-1">
                {activeTab === 'login'
                  ? 'Gunakan kredensial akun untuk mengakses sistem.'
                  : 'Daftarkan data perusahaan dan PIC armada Anda.'}
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
                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-ink" htmlFor="password">
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
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-sans"
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
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded-xs border-border text-accent focus:ring-accent cursor-pointer"
                    />
                    <span className="text-xs text-ink-muted">
                      Ingat sesi login
                    </span>
                  </label>
                </div>

                {/* Tombol Masuk (CTA Primer - Warna Accent Oranye Sinyal) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active disabled:opacity-60 text-white font-semibold text-xs sm:text-sm rounded-md transition-colors cursor-pointer"
                  >
                    {isLoading ? 'Memverifikasi...' : 'Masuk'}
                  </button>
                </div>
              </form>
            )}

            {/* =================================================================== */}
            {/* FORM REGISTRASI MITRA                                              */}
            {/* =================================================================== */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_nama">
                    Nama Lengkap PIC <span className="text-status-red">*</span>
                  </label>
                  <input
                    id="reg_nama"
                    type="text"
                    required
                    value={regForm.nama_lengkap}
                    onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_pt">
                    Nama Perusahaan Armada <span className="text-status-red">*</span>
                  </label>
                  <input
                    id="reg_pt"
                    type="text"
                    required
                    value={regForm.nama_perusahaan}
                    onChange={(e) => setRegForm({ ...regForm, nama_perusahaan: e.target.value })}
                    placeholder="Masukkan nama perusahaan"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_username">
                      Username <span className="text-status-red">*</span>
                    </label>
                    <input
                      id="reg_username"
                      type="text"
                      required
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      placeholder="Masukkan username"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_peran">
                      Peran Akses <span className="text-status-red">*</span>
                    </label>
                    <select
                      id="reg_peran"
                      value={regForm.peran}
                      onChange={(e) => setRegForm({ ...regForm, peran: e.target.value as PeranUser })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-md border border-border bg-white text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
                    >
                      <option value="Customer Fleet">Customer Fleet (Armada)</option>
                      <option value="SA">Service Advisor (SA)</option>
                      <option value="Foreman">Foreman Workshop</option>
                      <option value="Mekanik">Mekanik</option>
                      <option value="Admin Purchasing">Admin Purchasing</option>
                      <option value="Admin Invoice">Kasir &amp; Invoice</option>
                      <option value="Security">Security Gerbang</option>
                      <option value="PIC Terkait">PIC Terkait Kunjungan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_phone">
                      No. WhatsApp / HP
                    </label>
                    <input
                      id="reg_phone"
                      type="text"
                      value={regForm.no_telepon}
                      onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                      placeholder="Masukkan nomor telepon"
                      className="w-full px-3 py-2 text-xs rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_email">
                      Email Kerja
                    </label>
                    <input
                      id="reg_email"
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="Masukkan email"
                      className="w-full px-3 py-2 text-xs rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1" htmlFor="reg_pwd">
                    Kata Sandi <span className="text-status-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg_pwd"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Masukkan password"
                      className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-sans"
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
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active disabled:opacity-60 text-white font-semibold text-xs sm:text-sm rounded-md transition-colors cursor-pointer"
                  >
                    {isLoading ? 'Mendaftarkan...' : 'Daftar Mitra'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

    </main>
  );
};

export default LoginPage;
