import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import { PeranUser } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Phone,
  Mail,
  Building2,
  ArrowRight,
  ClipboardList,
  DollarSign
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    typeof window !== 'undefined' && window.location.hash === '#register' ? 'register' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Login Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register Form
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    nama_lengkap: '',
    nama_perusahaan: 'PT. Andi Jaya',
    peran: 'Customer Fleet' as PeranUser,
    no_telepon: '',
    email: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Harap masukkan username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(username.trim(), password);
      if (res.access_token) {
        setSuccessMsg('Login berhasil! Mengalihkan ke dashboard...');
        setTimeout(() => {
          loginUser(
            res.user || { nama_lengkap: username, peran: 'Customer Fleet' }, 
            res.access_token, 
            res.refresh_token
          );
        }, 400);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa kembali username dan kata sandi Anda.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.username.trim() || !regForm.password.trim() || !regForm.nama_lengkap.trim()) {
      setErrorMsg('Harap lengkapi semua kolom wajib (*).');
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
        setSuccessMsg('Pendaftaran akun berhasil! Silakan masuk dengan akun baru Anda.');
        setUsername(regForm.username);
        setPassword(regForm.password);
        setTimeout(() => {
          setActiveTab('login');
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftar. Username mungkin sudah digunakan.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ========================================================================= */}
      {/* LEFT HERO SHOWCASE PANE (Google Stitch B2B Layout - Desktop lg+)           */}
      {/* ========================================================================= */}
      <section className="hidden lg:flex relative lg:w-7/12 xl:w-3/5 bg-gradient-to-br from-[#051737] via-[#0a3578] to-[#1d4ed8] text-white p-8 md:p-12 lg:p-14 xl:p-16 flex-col justify-between overflow-hidden shrink-0">
        {/* Background Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Decorative Blurs */}
        <div className="absolute -right-28 -bottom-28 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-500/25 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header & Brand Identity */}
        <div className="relative z-10">
          {/* Logo Container */}
          <div className="inline-flex items-center bg-white/95 rounded-2xl p-2.5 px-4 shadow-xl shadow-black/20 backdrop-blur">
            <img 
              src="/logo.png" 
              alt="KIM3 Bengkel Fleet Customer Portal" 
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Hero Headline & Context */}
          <div className="mt-8 lg:mt-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-4 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Komputasi Fleet B2B Terpadu
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Platform Monitoring &amp; Manajemen Servis Armada Terintegrasi
            </h1>
            
            <p className="mt-4 text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-xl">
              Pantau pengerjaan servis berkala, estimasi biaya real-time, approval digital, hingga pelacakan lead time armada B2B perusahaan Anda secara transparan dan akurat.
            </p>
          </div>

          {/* Enterprise Feature Highlights */}
          <div className="mt-8 space-y-3.5 max-w-xl">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition backdrop-blur-md">
              <div className="w-9 h-9 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-200 shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Real-Time Workshop Tracking</h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  Dari Check-In, Inspeksi 40-titik, estimasi mekanik, hingga Gate Pass Barcode terbit otomatis.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition backdrop-blur-md">
              <div className="w-9 h-9 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-200 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Transparansi Biaya &amp; Estimasi</h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  Review rincian suku cadang OEM, tier pricing kontrak korporasi, serta sistem e-approval WO sekali klik.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition backdrop-blur-md">
              <div className="w-9 h-9 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-200 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Jaminan SLA &amp; Kepatuhan Regulasi</h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  Jaminan turnaround time armada logistik dan histori berkala siap audit untuk kepatuhan uji KIR Dishub.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT LOGIN & REGISTER FORM PANE (Clean, Focused, Responsive Form)        */}
      {/* ========================================================================= */}
      <section className="flex-1 lg:w-5/12 xl:w-2/5 bg-slate-50 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 overflow-y-auto min-h-screen">
        <div className="max-w-md w-full mx-auto my-auto py-6">
          
          {/* Mobile Branded Header Card (Visible only on < lg screens) */}
          <div className="lg:hidden mb-6 flex flex-col items-center text-center">
            <div className="bg-white p-3 px-5 rounded-2xl shadow-sm border border-slate-200 mb-3 inline-flex items-center justify-center">
              <img src="/logo.png" alt="KIM3 Bengkel Logo" className="h-9 w-auto object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 text-blue-900 text-[11px] font-bold border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Portal B2B Pelanggan Korporat
            </div>
          </div>

          {/* Desktop Badge & Header Info */}
          <div className="mb-6">
            <div className="hidden lg:flex items-center justify-between mb-3">
              <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100/80 border border-blue-200 rounded-full">
                Portal B2B Pelanggan Korporat
              </span>
            </div>

            {/* Seamless Tab Switcher */}
            <div className="flex rounded-xl bg-slate-200/90 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 min-h-[40px] py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk ke Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 min-h-[40px] py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Registrasi Mitra Baru
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'login' ? 'Masuk ke Akun Anda' : 'Registrasi Akun Mitra'}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {activeTab === 'login' 
                ? 'Silakan masukkan kredensial akun PIC armada perusahaan yang terdaftar untuk mengakses monitoring servis.'
                : 'Daftarkan perusahaan Anda untuk mendapatkan akun portal fleet dan kemudahan booking service di Bengkel KIM 3.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 1: LOGIN FORM                                                  */}
          {/* =================================================================== */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Field 1: PIC Work Email / Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="username">
                  Email PIC / Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: fleet_andijaya atau nama@perusahaan.co.id"
                    className="block w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="password">
                  Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white transition-all outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                  />
                  <span className="ml-2 text-xs text-slate-600 font-medium">
                    Ingat sesi login (30 hari)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Untuk reset kata sandi korporat, silakan hubungi Helpdesk Bengkel KIM 3 via WhatsApp.')}
                  className="text-xs font-semibold text-blue-800 hover:text-blue-950 hover:underline cursor-pointer"
                >
                  Lupa Kata Sandi?
                </button>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-blue-900/20 text-xs sm:text-sm font-bold text-white bg-blue-900 hover:bg-blue-950 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-60 transition duration-150 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Memverifikasi Kredensial...
                    </span>
                  ) : (
                    <>
                      <span>Masuk ke Portal Fleet</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* TAB 2: REGISTER FORM                                               */}
          {/* =================================================================== */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Nama PIC */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_nama">
                  Nama Lengkap PIC <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="reg_nama"
                    type="text"
                    required
                    value={regForm.nama_lengkap}
                    onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                    placeholder="Contoh: Andi Wijaya, S.T."
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Nama Perusahaan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_pt">
                  Nama Perusahaan Armada <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    id="reg_pt"
                    type="text"
                    required
                    value={regForm.nama_perusahaan}
                    onChange={(e) => setRegForm({ ...regForm, nama_perusahaan: e.target.value })}
                    placeholder="Contoh: PT. Andi Jaya Logistik"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Username & Peran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_username">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg_username"
                    type="text"
                    required
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    placeholder="fleet_user"
                    className="block w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white transition-all outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_peran">
                    Peran Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="reg_peran"
                    value={regForm.peran}
                    onChange={(e) => setRegForm({ ...regForm, peran: e.target.value as PeranUser })}
                    className="block w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 bg-white transition-all outline-hidden font-semibold cursor-pointer"
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

              {/* Email & No Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_phone">
                    No. WhatsApp / HP
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="reg_phone"
                      type="text"
                      value={regForm.no_telepon}
                      onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                      placeholder="0812-xxxx-xxxx"
                      className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_email">
                    Email Kerja
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="reg_email"
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="pic@perusahaan.com"
                      className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1" htmlFor="reg_pwd">
                  Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="reg_pwd"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="block w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 placeholder-slate-400 bg-white outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-900/20 text-xs sm:text-sm font-bold text-white bg-blue-900 hover:bg-blue-950 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-60 transition duration-150 cursor-pointer"
                >
                  {isLoading ? 'Mendaftarkan Akun...' : 'Daftarkan Akun Mitra Sekarang'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

    </main>
  );
};

export default LoginPage;
