import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import { PeranUser } from '../types';
import { 
  Wrench, 
  Truck, 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  Eye, 
  EyeOff,
  Phone,
  Mail,
  Building2,
  ChevronRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register Form
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    nama_lengkap: '',
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
      setErrorMsg('Harap masukkan username dan password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(username.trim(), password);
      if (res.access_token) {
        setSuccessMsg(`Login berhasil! Mengalihkan ke dashboard...`);
        setTimeout(() => {
          loginUser(
            res.user || { nama_lengkap: username, peran: 'SA' }, 
            res.access_token, 
            res.refresh_token
          );
        }, 500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa username dan password Anda.';
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
      const res = await api.register(regForm);
      if (res.success) {
        setSuccessMsg(`Pendaftaran berhasil! Silakan login dengan akun Anda.`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-10 font-sans text-slate-100">
      
      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-[28px] sm:rounded-[36px] shadow-2xl border border-white/20 overflow-hidden text-slate-900 grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Side: Brand Visual & Workshop Overview (Desktop view) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-6 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

          <div className="relative z-10">
            {/* Logo Badge */}
            <div className="mb-8 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg shadow-blue-950/20 inline-block">
              <img 
                src="/logo.png" 
                alt="KIM3 Bengkel" 
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            {/* Title & Tagline */}
            <div className="space-y-3 mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-100 border border-blue-400/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Portal Operasional Terintegrasi
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                Manajemen Servis & Armada Digital
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Platform satu pintu untuk koordinasi Pos Security, Service Advisor, Foreman QC, Mekanik Tablet, Admin Purchasing, Kasir Invoice, dan Customer Web Fleet.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
                <div className="w-8 h-8 rounded-xl bg-blue-500/40 text-blue-200 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Web Fleet Monitoring</div>
                  <div className="text-[11px] text-blue-200">Tracking progress pengerjaan & histori dokumen</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/40 text-indigo-200 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Alur SPK & QC Terpantau</div>
                  <div className="text-[11px] text-blue-200">Stopwatch mekanik, checklist QC & memo gerbang</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-200">
            <span>KIM 3 Medan, Sumatera Utara</span>
            <span className="font-mono bg-blue-950/60 px-2 py-0.5 rounded text-emerald-300">Live Server</span>
          </div>

          {/* Ambient Glow */}
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Side: Clean Modern Form (Pure Tailwind CSS) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Mobile Header Logo */}
            <div className="flex lg:hidden justify-center mb-2">
              <img 
                src="/logo.png" 
                alt="KIM3 Bengkel" 
                className="h-11 w-auto object-contain"
              />
            </div>

            {/* Form Top Title */}
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeTab === 'login' ? 'Selamat Datang Kembali' : 'Pendaftaran Akun Baru'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {activeTab === 'login'
                  ? 'Silakan masuk dengan akun pengguna bengkel atau armada Anda'
                  : 'Lengkapi formulir di bawah untuk membuat akun baru'}
              </p>
            </div>

            {/* Switch Tabs (Masuk / Daftar) */}
            <div className="flex p-1.5 rounded-2xl bg-slate-100 text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Daftar Baru
              </button>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* TAB: LOGIN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username atau Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white"
                      placeholder="Masukkan username atau email"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white"
                      placeholder="Masukkan kata sandi"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memproses Autentikasi...
                    </span>
                  ) : (
                    <>
                      Masuk ke Sistem <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB: REGISTER FORM */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium bg-slate-50/50"
                      placeholder="misal: fleet_andi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium bg-slate-50/50"
                      placeholder="Minimal 6 karakter"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap / Nama Perusahaan *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regForm.nama_lengkap}
                      onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium bg-slate-50/50"
                      placeholder="misal: PT. Medan Trans Logistik"
                    />
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Peran Pengguna *
                    </label>
                    <select
                      value={regForm.peran}
                      onChange={(e) => setRegForm({ ...regForm, peran: e.target.value as PeranUser })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium bg-white"
                    >
                      <option value="Customer Fleet">Customer Fleet (Armada)</option>
                      <option value="Mekanik">Mekanik</option>
                      <option value="Foreman">Foreman (QC)</option>
                      <option value="Security">Pos Security</option>
                      <option value="SA">Service Advisor (SA)</option>
                      <option value="Admin Purchasing">Admin Purchasing</option>
                      <option value="Admin Invoice">Admin Invoice (Kasir)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. WhatsApp / HP
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={regForm.no_telepon}
                        onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium bg-slate-50/50"
                        placeholder="08123456789"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium bg-slate-50/50"
                      placeholder="armada@perusahaan.com"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {isLoading ? 'Mendaftarkan Akun...' : 'Daftar Akun Baru Sekarang'}
                </button>
              </form>
            )}

            {/* Subtle Help Text */}
            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400">
                Pusat Kendali Operasional Bengkel KIM 3 • Seluruh hak cipta dilindungi
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
