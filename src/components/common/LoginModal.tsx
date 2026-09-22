import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { api, KIM3_STATIC_TOKEN } from '../../api/client';
import { getStorageConfig, saveStorageConfig, StorageConfig } from '../../utils/storage';
import { 
  Lock, 
  Key, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  LogOut, 
  CheckCircle2, 
  X, 
  RotateCw, 
  UserPlus, 
  Database, 
  HardDrive,
  Cloud
} from 'lucide-react';
import { PeranUser } from '../../types';

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

export const LoginModal: React.FC = () => {
  const { 
    loginModalOpen, 
    setLoginModalOpen, 
    jwtToken, 
    setJwtToken, 
    currentUser, 
    setRole 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'storage'>('login');
  
  // Login State
  const [username, setUsername] = useState('sa_budi');
  const [password, setPassword] = useState('password123');
  
  // Register State
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    nama_lengkap: '',
    peran: 'Customer Fleet' as PeranUser,
    no_telepon: '',
    email: '',
  });

  // Storage Config State
  const [storageCfg, setStorageCfg] = useState<StorageConfig>(getStorageConfig());

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!loginModalOpen) return null;

  const handleLogin = async (loginUser?: string, loginPass?: string) => {
    const targetUser = loginUser || username;
    const targetPass = loginPass || password;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(targetUser, targetPass);
      if (res.access_token) {
        setJwtToken(res.access_token);
        setSuccessMsg(`Berhasil login sebagai ${res.user?.nama_lengkap || targetUser} (${res.user?.peran || 'User'})!`);
        if (res.user?.peran) {
          setRole(res.user.peran, res.user.nama_lengkap);
        }
        setTimeout(() => {
          setLoginModalOpen(false);
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal login. Periksa username dan password.';
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
        setSuccessMsg(`Registrasi berhasil untuk pengguna '${regForm.username}'! Silakan login.`);
        setUsername(regForm.username);
        setPassword(regForm.password);
        setTimeout(() => {
          setActiveTab('login');
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftar. Pastikan data terisi lengkap.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.refreshToken();
      if (res.access_token) {
        setJwtToken(res.access_token);
        setSuccessMsg('Token JWT berhasil diperbarui dengan aman!');
        setTimeout(() => setSuccessMsg(null), 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui token. Silakan login kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStorage = (e: React.FormEvent) => {
    e.preventDefault();
    saveStorageConfig(storageCfg);
    setSuccessMsg('Pengaturan penyimpanan foto berhasil disimpan!');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleLogout = () => {
    api.logout();
    setJwtToken(null);
    setSuccessMsg('Sesi JWT berhasil dikeluarkan.');
    setTimeout(() => setSuccessMsg(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Otentikasi & Keamanan Sistem</h3>
              <p className="text-xs text-slate-300">Backendless Security & Photo Storage Control</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setLoginModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'login'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'register'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Akun Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'storage'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lokasi Foto (Storage)
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Security Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Mode Proteksi:
              </span>
              <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">
                HYBRID (Token + JWT)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" /> Token API Bengkel:
              </span>
              <span className="font-mono text-[10px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[190px]">
                {KIM3_STATIC_TOKEN}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Sesi JWT:
              </span>
              {jwtToken ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshToken}
                    disabled={isLoading}
                    className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-200 transition-colors"
                    title="Refresh JWT Token"
                  >
                    <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Gunakan Token API / Belum Login
                </span>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Cepat Akun Role (Auto-Login):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {PRESET_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => {
                        setUsername(acc.username);
                        handleLogin(acc.username, 'password123');
                      }}
                      disabled={isLoading}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                        currentUser === acc.name && jwtToken
                          ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-slate-900 truncate">{acc.name}</div>
                      <div className="text-[10px] text-blue-600 font-semibold">{acc.role}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{acc.username}</div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username / Email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="misal: sa_budi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="password"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-blue-500/30 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Mengautentikasi...' : 'Login (Dilindungi Token)'}
                  </button>
                  {jwtToken && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Endpoint pendaftaran dilindungi Token API <code>{KIM3_STATIC_TOKEN.slice(0, 15)}...</code></span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="misal: fleet_baru"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="password123"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap / Perusahaan *</label>
                <input
                  type="text"
                  value={regForm.nama_lengkap}
                  onChange={(e) => setRegForm({ ...regForm, nama_lengkap: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="misal: PT. Logistik Nusantara"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran Pengguna *</label>
                  <select
                    value={regForm.peran}
                    onChange={(e) => setRegForm({ ...regForm, peran: e.target.value as PeranUser })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Customer Fleet">Customer Fleet</option>
                    <option value="Mekanik">Mekanik</option>
                    <option value="Foreman">Foreman</option>
                    <option value="Security">Security</option>
                    <option value="SA">Service Advisor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Handphone / WA</label>
                  <input
                    type="text"
                    value={regForm.no_telepon}
                    onChange={(e) => setRegForm({ ...regForm, no_telepon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="081234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@perusahaan.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? 'Mendaftarkan...' : 'Daftar Pengguna Baru (Terproteksi Token)'}
              </button>
            </form>
          )}

          {/* TAB 3: STORAGE SETTINGS */}
          {activeTab === 'storage' && (
            <form onSubmit={handleSaveStorage} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                <strong>Kontrol Lokasi Foto:</strong> Foto tidak akan pernah disimpan di folder lokal server 94 (<code>/var/darkosync/storage</code>).
              </div>

              <div className="space-y-2.5">
                <label className="block font-bold text-slate-800">Pilih Driver Penyimpanan Foto:</label>
                
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  storageCfg.driver === 'database' 
                    ? 'border-blue-500 bg-blue-50/60 shadow-xs' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="driver"
                    value="database"
                    checked={storageCfg.driver === 'database'}
                    onChange={() => setStorageCfg({ ...storageCfg, driver: 'database' })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-600" />
                      Direct Database (PostgreSQL / Supabase Base64 - Rekomendasi)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Foto otomatis dikompresi di browser (40-80 KB, kualitas HD) dan disimpan langsung ke kolom database Supabase. Server 94 tidak menyimpan file apa pun.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  storageCfg.driver === 's3' 
                    ? 'border-blue-500 bg-blue-50/60 shadow-xs' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="driver"
                    value="s3"
                    checked={storageCfg.driver === 's3'}
                    onChange={() => setStorageCfg({ ...storageCfg, driver: 's3' })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                      AWS S3 / Cloudflare R2 Cloud Storage
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Foto diunggah langsung ke bucket AWS S3 eksternal dari antarmuka browser.
                    </p>
                  </div>
                </label>
              </div>

              {storageCfg.driver === 's3' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">S3 Bucket Name</label>
                      <input
                        type="text"
                        value={storageCfg.s3Bucket || ''}
                        onChange={(e) => setStorageCfg({ ...storageCfg, s3Bucket: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                        placeholder="bengkel-kim3-photos"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">S3 Region</label>
                      <input
                        type="text"
                        value={storageCfg.s3Region || ''}
                        onChange={(e) => setStorageCfg({ ...storageCfg, s3Region: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                        placeholder="ap-southeast-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm"
              >
                Simpan Konfigurasi Storage
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
