import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { api, KIM3_STATIC_TOKEN } from '../../api/client';
import { Lock, Key, ShieldCheck, UserCheck, AlertCircle, LogOut, CheckCircle2, X } from 'lucide-react';
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
    currentRole,
    setRole 
  } = useAppStore();

  const [username, setUsername] = useState('sa_budi');
  const [password, setPassword] = useState('password123');
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

  const handleLogout = () => {
    api.logout();
    setJwtToken(null);
    setSuccessMsg('Sesi JWT berhasil dikeluarkan.');
    setTimeout(() => setSuccessMsg(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Autentikasi & Keamanan API</h3>
              <p className="text-xs text-slate-300">Token JWT & Static API Key Bengkel KIM 3</p>
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

        <div className="p-6 space-y-6">
          {/* Security Status Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Mode Keamanan Server:
              </span>
              <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px]">
                HYBRID (JWT + API KEY)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" /> Token API Bengkel:
              </span>
              <span className="font-mono text-[10px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[210px]">
                {KIM3_STATIC_TOKEN}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Sesi Login JWT:
              </span>
              {jwtToken ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif ({currentUser})
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Gunakan Token API / Belum Login
                </span>
              )}
            </div>
          </div>

          {/* Feedback message */}
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

          {/* Quick Switch Preset Accounts */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Cepat Akun Role (Auto-Login):
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {PRESET_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    handleLogin(acc.username, 'password123');
                  }}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                    currentUser === acc.name && jwtToken
                      ? 'border-blue-500 bg-blue-50/70 shadow-sm'
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

          {/* Manual Login Form */}
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
                {isLoading ? 'Mengautentikasi...' : 'Login & Terbitkan JWT'}
              </button>
              {jwtToken && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              )}
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
