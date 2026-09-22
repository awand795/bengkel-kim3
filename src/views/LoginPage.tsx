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
  Key, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  LogIn,
  ArrowRight
} from 'lucide-react';

interface PresetAccount {
  username: string;
  name: string;
  role: PeranUser;
  email: string;
}

const PRESET_ACCOUNTS: PresetAccount[] = [
  { username: 'sa_budi', name: 'Budi Santoso', role: 'SA', email: 'sa@bengkelkim3.com' },
  { username: 'foreman_joko', name: 'Joko Susilo', role: 'Foreman', email: 'foreman@bengkelkim3.com' },
  { username: 'mekanik_andi', name: 'Andi Wijaya', role: 'Mekanik', email: 'andi.m@bengkelkim3.com' },
  { username: 'purchasing_rina', name: 'Rina Marlina', role: 'Admin Purchasing', email: 'purchasing@bengkelkim3.com' },
  { username: 'kasir_siti', name: 'Siti Rahma', role: 'Admin Invoice', email: 'kasir@bengkelkim3.com' },
  { username: 'security_hisar', name: 'Hisar Pardede', role: 'Security', email: 'security@bengkelkim3.com' },
  { username: 'fleet_andijaya', name: 'PT. Andi Jaya', role: 'Customer Fleet', email: 'andi.jaya@gmail.com' },
];

export const LoginPage: React.FC = () => {
  const { loginUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [username, setUsername] = useState('sa_budi');
  const [password, setPassword] = useState('password123');

  // Register form state
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

  const handleLogin = async (targetUser?: string, targetPass?: string) => {
    const userToLogin = targetUser || username;
    const passToLogin = targetPass || password;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(userToLogin, passToLogin);
      if (res.access_token) {
        setSuccessMsg(`Login berhasil! Selamat datang, ${res.user?.nama_lengkap || userToLogin}.`);
        setTimeout(() => {
          loginUser(res.user || { nama_lengkap: userToLogin, peran: 'SA' }, res.access_token, res.refresh_token);
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
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.register(regForm);
      if (res.success) {
        setSuccessMsg(`Pendaftaran berhasil untuk ${regForm.username}! Silakan login.`);
        setUsername(regForm.username);
        setPassword(regForm.password);
        setTimeout(() => {
          setActiveTab('login');
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftar. Pastikan data terisi lengkap.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Side: Brand Visual & Features */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30">
                K3
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">BENGKEL KIM 3</h1>
                <p className="text-xs text-blue-300 font-medium">Fleet & Workshop Management</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Sistem Manajemen Bengkel & Armada Terintegrasi
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Platform digital operasional bengkel kawasan industri KIM 3 Medan: monitoring unit, estimasi SA, penugasan mekanik, QC checklist, purchasing, dan billing kasir.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <span>Monitoring Realtime Armada Customer & Status Servis</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20 shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <span>SPK Digital, Estimasi Part & Stopwatch Kerja Mekanik</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Quality Control (QC) Foreman & Memo Keluar Security</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 mt-8 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Kawasan Industri Modern 3</span>
            <span className="font-mono text-emerald-400">System v1.0</span>
          </div>

          {/* Background Glow */}
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Side: Login / Register Form */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeTab === 'login' ? 'Masuk ke Sistem' : 'Daftar Akun Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === 'login' 
                    ? 'Masukkan kredensial akun Anda untuk mengakses dashboard' 
                    : 'Lengkapi formulir untuk membuat akun armada atau pengguna baru'}
                </p>
              </div>
            </div>

            <div className="flex p-1 rounded-xl bg-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Baru
              </button>
            </div>

            {/* Error / Success Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB: LOGIN */}
            {activeTab === 'login' && (
              <div className="space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username / Email
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        placeholder="contoh: sa_budi"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        placeholder="password123"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      'Mengautentikasi...'
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" /> Masuk ke Bengkel KIM 3
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Account Switcher for Testing */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Akun Pengujian Demo (Sekali Klik):
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {PRESET_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => {
                          setUsername(acc.username);
                          setPassword('password123');
                          handleLogin(acc.username, 'password123');
                        }}
                        disabled={isLoading}
                        className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left text-xs transition-all flex flex-col justify-between group"
                      >
                        <div className="font-bold text-slate-800 group-hover:text-blue-600 truncate">
                          {acc.name}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-blue-600 font-medium">{acc.role}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{acc.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: REGISTER */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="driver_budi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="password123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap / Perusahaan *</label>
                  <input
                    type="text"
                    value={regForm.nama_lengkap}
                    onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PT. Ekspedisi Mandiri"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Pengguna *</label>
                    <select
                      value={regForm.peran}
                      onChange={(e) => setRegForm({ ...regForm, peran: e.target.value as PeranUser })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Customer Fleet">Customer Fleet</option>
                      <option value="Mekanik">Mekanik</option>
                      <option value="Foreman">Foreman</option>
                      <option value="Security">Security</option>
                      <option value="SA">Service Advisor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">No. Handphone / WA</label>
                    <input
                      type="text"
                      value={regForm.no_telepon}
                      onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="armada@perusahaan.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {isLoading ? 'Mendaftarkan...' : 'Daftar Akun Baru'}
                </button>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
