import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
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
  ShieldCheck, 
  Building2, 
  MapPin, 
  History, 
  Package, 
  Truck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { toast } from '../components/common/Toast';

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
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
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEngineStarting, setIsEngineStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

    if (!cleanEmail || !regForm.password.trim()) {
      setErrorMsg('Lengkapi seluruh kolom wajib bertanda bintang (*).');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMsg('Format email tidak valid. Masukkan domain lengkap (contoh: nama@perusahaan.com)');
      return;
    }

    if (cleanPhone) {
      const digits = cleanPhone.replace(/[^0-9]/g, '');
      if (digits.length < 8) {
        setErrorMsg('Nomor HP/WhatsApp minimal 8 digit angka.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.register({
        email: cleanEmail,
        password: regForm.password,
        nama_lengkap: cleanNama,
        nama_perusahaan: tipeMitra === 'perusahaan' ? cleanPerusahaan : undefined,
        no_telepon: cleanPhone,
      });
      if (res.success || res.data?.id) {
        setSuccessMsg('Pendaftaran mitra berhasil! Tautan verifikasi telah dikirimkan ke ' + cleanEmail + '. Silakan periksa inbox/spam email Anda untuk verifikasi.');
        setLoginIdentifier(cleanEmail || cleanPhone);
        setPassword(regForm.password);
        setTimeout(() => {
          setActiveTab('login');
        }, 2500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Pendaftaran gagal. Email atau nomor HP mungkin sudah terdaftar.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-legacy-theme min-h-screen flex flex-col lg:flex-row bg-surface text-ink antialiased font-sans relative">
      
      {/* Top Bar Aksen Tipis (--color-accent Petrol Teal) */}
      <div className="h-[2px] w-full bg-accent fixed top-0 left-0 z-50 pointer-events-none" />

      {/* ========================================================================= */}
      {/* SISI KIRI: WEB FLEET - SEJARAH, PROFIL, PRODUK & KANTOR RESMI             */}
      {/* ========================================================================= */}
      <section className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-workshop-pattern text-white p-6 xl:p-10 flex-col justify-between relative overflow-hidden border-r border-border-dark">
        {/* Subtle Watermark Logo Background */}
        <div className="absolute -right-16 -bottom-16 opacity-[0.03] pointer-events-none select-none">
          <img 
            src="/logo.png" 
            alt="" 
            className="w-96 h-96 object-contain"
          />
        </div>

        {/* Top: Header & Brand Identity */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/70 rounded-lg px-3 py-1.5 backdrop-blur-xs shadow-xs">
              <img 
                src="/logo.png" 
                alt="PT Lotus Pradipta Mulia" 
                className="h-7 w-auto object-contain"
              />
              <div className="border-l border-slate-700 pl-2.5">
                <span className="block text-xs font-bold tracking-tight text-white leading-tight">PT LOTUS PRADIPTA MULIA</span>
                <span className="block text-[10px] text-teal-300 font-medium">Distributor Otomotif &amp; Pelumas Nasional</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Web Fleet
            </span>
          </div>

          <div className="max-w-lg">
            <h1 className="text-xl xl:text-2xl font-black tracking-tight text-white leading-snug uppercase">
              PT LOTUS PRADIPTA MULIA
            </h1>
            <p className="mt-1 text-xs text-teal-300 font-semibold leading-relaxed">
              Distributor Resmi Nasional Suku Cadang &amp; Pelumas Otomotif
            </p>
            <p className="mt-1 text-[11px] text-slate-300 leading-relaxed font-normal">
              Portal terintegrasi pemantauan perawatan kendaraan operasional (Web Fleet), tata kelola bengkel, dan pasokan komponen resmi standar OEM.
            </p>
          </div>

          {/* Kartu Informasi Enterprise: Sejarah, Produk & Kantor */}
          <div className="space-y-2.5 max-w-lg">
            
            {/* 1. Profil & Sejarah Perusahaan */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-teal-500/40 transition-colors shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                  <History className="w-4 h-4" />
                </div>
                <div className="text-xs min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white text-[11px] block">Profil &amp; Sejarah Perusahaan</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold">
                      Est. 2000 • 24+ Tahun
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Didirikan tahun 2000 di Sumatera Utara, berkembang menjadi distributor resmi nasional pelumas, aki, ban, dan sparepart terkemuka dengan keandalan logistik melayani seluruh Sumatera (SUMBAGUT &amp; SUMBAGSEL).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Produk & Komponen yang Dijual */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-sky-500/40 transition-colors shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-sky-500/20 border border-sky-500/40 text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-xs min-w-0 flex-1">
                  <span className="font-semibold text-white text-[11px] block mb-1.5">Barang &amp; Komponen Resmi</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-1.5 rounded bg-slate-800/90 border border-slate-700/60">
                      <span className="text-slate-400 block text-[9px] font-semibold uppercase">Oli &amp; Pelumas</span>
                      <span className="text-white font-medium">Federal Oil</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-800/90 border border-slate-700/60">
                      <span className="text-slate-400 block text-[9px] font-semibold uppercase">Aki Kendaraan</span>
                      <span className="text-white font-medium">Furukawa Battery (FB)</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-800/90 border border-slate-700/60">
                      <span className="text-slate-400 block text-[9px] font-semibold uppercase">Ban Motor &amp; Truk</span>
                      <span className="text-white font-medium">Michelin • Indotube • Kaizen</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-800/90 border border-slate-700/60">
                      <span className="text-slate-400 block text-[9px] font-semibold uppercase">Sparepart &amp; Lampu</span>
                      <span className="text-white font-medium">RKN • Ichidai • Sachs • Philips</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Alamat Kantor Utama */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-amber-500/40 transition-colors shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="text-xs min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white text-[11px] block">Kantor Utama &amp; Pergudangan</span>
                    <span className="text-[10px] text-amber-300 font-medium">Hub Sumatera</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Komp. Pergudangan Palembang Star 1 Blok E5, Jl. Letjen Harun Sohar, Sukarami, Palembang, Sumatera Selatan.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Terdaftar di Kementerian Perdagangan RI</span>
          </div>
          <span className="font-mono text-slate-400">PT Lotus Pradipta Mulia</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SISI KANAN: FORM LOGIN & REGISTER (Kontras Tinggi, Aksen Teal)            */}
      {/* ========================================================================= */}
      <section className="flex-1 bg-surface flex flex-col justify-center items-center p-5 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          
          {/* Mobile Header Branding */}
          <div className="lg:hidden mb-5 flex flex-col items-center text-center">
            <div className="bg-surface-raised p-2 px-3.5 rounded-md border border-border mb-2 inline-flex items-center gap-2 shadow-xs">
              <img src="/logo.png" alt="PT Lotus Pradipta Mulia Logo" className="h-6 w-auto object-contain" />
              <span className="text-xs font-bold text-ink">PT LOTUS PRADIPTA MULIA</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent-subtle text-accent border border-accent/20">
              Web Fleet
            </span>
          </div>

          {/* Card Form */}
          <div className="bg-surface-raised border border-border rounded-xl p-5 sm:p-7 shadow-xs">
            
            {/* Tab Navigasi Masuk / Daftar: Segmented Pill Switcher Modern */}
            <div className="flex p-1 bg-surface rounded-lg border border-border/70 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center ${
                  activeTab === 'login'
                    ? 'bg-surface-raised text-accent shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center ${
                  activeTab === 'register'
                    ? 'bg-surface-raised text-accent shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Daftar Mitra
              </button>
            </div>

            {/* Header Form */}
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
                {activeTab === 'login' ? 'Login' : 'Pendaftaran Mitra Fleet'}
              </h2>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                {activeTab === 'login' 
                  ? 'Masuk dengan nomor HP atau email akun mitra fleet Anda.' 
                  : 'Pilih tipe kemitraan dan lengkapi data untuk mendaftar akun.'}
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
                {/* Nomor HP / Email */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="login_identifier">
                    Nomor HP / Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <User className="w-4 h-4" />
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
                      onClick={() => toast.info('Untuk reset kata sandi, hubungi Helpdesk Bengkel KIM 3.')}
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
                        <span>Login</span>
                        <ArrowRight className="w-4 h-4" />
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
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Switcher Tipe Mitra */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Kategori Kemitraan Kendaraan <span className="text-status-red">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-lg border border-border/70">
                    <button
                      type="button"
                      onClick={() => setTipeMitra('perusahaan')}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tipeMitra === 'perusahaan'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Perusahaan (PT/CV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipeMitra('perorangan')}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tipeMitra === 'perorangan'
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Perorangan / Pribadi</span>
                    </button>
                  </div>
                </div>

                {/* Field Khusus Perusahaan */}
                {tipeMitra === 'perusahaan' ? (
                  <>
                    {/* Nama Perusahaan */}
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_perusahaan">
                        Nama Perusahaan / Badan Usaha <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <input
                          id="reg_perusahaan"
                          type="text"
                          required
                          value={regForm.nama_perusahaan}
                          onChange={(e) => setRegForm({ ...regForm, nama_perusahaan: e.target.value })}
                          placeholder="contoh: PT. Maju Logistik Nusantara"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                        />
                      </div>
                    </div>

                    {/* Nama PIC / Penanggung Jawab */}
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_pic">
                        Nama Penanggung Jawab Operasional (PIC) <span className="text-status-red">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="reg_pic"
                          type="text"
                          required
                          value={regForm.nama_lengkap}
                          onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                          placeholder="contoh: Budi Santoso (Transport Manager)"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-ink-subtle mt-1">
                        Kontak person yang berwenang menyetujui estimasi biaya dan koordinasi perbaikan kendaraan.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Field Khusus Perorangan */
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_nama">
                      Nama Lengkap Pemilik Kendaraan <span className="text-status-red">*</span>
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
                        placeholder="contoh: Ahmad Syahputra"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_email">
                    Alamat Email <span className="text-status-red">*</span>
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
                      placeholder="nama@perusahaan.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-md border border-border bg-white text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>
                </div>

                {/* No. WhatsApp / HP */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reg_phone">
                    Nomor WhatsApp / HP <span className="text-xs font-normal text-ink-subtle">(Opsional)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle group-focus-within:text-accent transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="reg_phone"
                      type="tel"
                      value={regForm.no_telepon}
                      onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                      placeholder="contoh: 081234567890"
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
                      placeholder="Buat kata sandi minimal 6 karakter"
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
                        <span>Mendaftarkan Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Daftarkan Akun Mitra</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
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
