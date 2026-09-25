import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Pengguna, PeranUser, PengaturanSistem } from '../types';
import { isValidEmail } from '../utils/validation';
import { 
  Users, 
  Settings, 
  Plus, 
  Edit3, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Building2, 
  Percent, 
  Printer, 
  CreditCard, 
  Save, 
  ShieldCheck, 
  AlertCircle,
  Database,
  Lock,
  UserCheck,
  Check,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { PaginationBar } from '../components/common/PaginationBar';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';

const ALL_ROLES: PeranUser[] = [
  'Super Admin',
  'SA',
  'Foreman',
  'Mekanik',
  'Admin Purchasing',
  'Admin Invoice',
  'Security',
  'Customer Fleet',
  'PIC Terkait',
  'Warehouse'
];

export const AdminPanelView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'ppn' | 'print-templates'>('users');

  // =========================================================================
  // STATE: USER MANAGEMENT
  // =========================================================================
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);

  // Modal State: Tambah User
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    nama_lengkap: '',
    peran: 'SA' as PeranUser,
    no_telepon: '',
    status_aktif: true,
  });

  // Modal State: Edit User
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Pengguna | null>(null);

  // Modal State: Reset Password
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<Pengguna | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback State
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // =========================================================================
  // QUERIES
  // =========================================================================
  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-pengguna-list'],
    queryFn: api.getPengguna,
    staleTime: 5000,
  });

  const { data: settings, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['admin-pengaturan-sistem'],
    queryFn: api.getPengaturan,
    staleTime: 10000,
  });

  // =========================================================================
  // STATE: SETTINGS FORM
  // =========================================================================
  const [settingsForm, setSettingsForm] = useState<Partial<PengaturanSistem>>({});

  // Sync settings query to local form
  React.useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  // =========================================================================
  // MUTATIONS: USER
  // =========================================================================
  const addUserMutation = useMutation({
    mutationFn: api.tambahPengguna,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pengguna-list'] });
      queryClient.invalidateQueries({ queryKey: ['pengguna'] });
      setIsAddUserOpen(false);
      setAddForm({
        email: '',
        password: '',
        nama_lengkap: '',
        peran: 'SA',
        no_telepon: '',
        status_aktif: true,
      });
      setFeedbackMsg({ type: 'success', text: 'Pengguna baru berhasil ditambahkan ke database Supabase!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menambahkan pengguna. Email mungkin sudah terdaftar.';
      setFeedbackMsg({ type: 'error', text: msg });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: api.updatePengguna,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pengguna-list'] });
      queryClient.invalidateQueries({ queryKey: ['pengguna'] });
      setIsEditUserOpen(false);
      setEditingUser(null);
      setFeedbackMsg({ type: 'success', text: 'Data pengguna dan peran berhasil diperbarui!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal memperbarui pengguna.';
      setFeedbackMsg({ type: 'error', text: msg });
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: api.resetPasswordPengguna,
    onSuccess: () => {
      setIsResetPwdOpen(false);
      setResetPwdUser(null);
      setNewPassword('');
      setFeedbackMsg({ type: 'success', text: 'Kata sandi pengguna berhasil direset!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal mereset kata sandi.';
      setFeedbackMsg({ type: 'error', text: msg });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: api.toggleStatusPengguna,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pengguna-list'] });
      setFeedbackMsg({ 
        type: 'success', 
        text: `Status pengguna berhasil diubah menjadi ${variables.status_aktif ? 'Aktif' : 'Nonaktif'}.` 
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    },
  });

  // =========================================================================
  // MUTATION: SETTINGS
  // =========================================================================
  const saveSettingsMutation = useMutation({
    mutationFn: api.simpanPengaturan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pengaturan-sistem'] });
      setFeedbackMsg({ type: 'success', text: 'Pengaturan sistem, PPN, dan template cetak berhasil disimpan!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menyimpan pengaturan sistem.';
      setFeedbackMsg({ type: 'error', text: msg });
    },
  });

  // =========================================================================
  // FILTERED USERS
  // =========================================================================
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.nama_lengkap.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchUser.toLowerCase()));
    const matchesRole = filterRole === 'ALL' || u.peran === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalUsers = filteredUsers.length;
  const totalUserPages = Math.ceil(totalUsers / userLimit) || 1;
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * userLimit,
    userPage * userLimit
  );

  const getRoleBadge = (role: PeranUser) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-status-red-bg text-status-red border-status-red/30';
      case 'SA':
        return 'bg-status-blue-bg text-status-blue border-status-blue/30';
      case 'Foreman':
        return 'bg-accent-subtle text-accent border-accent/30';
      case 'Mekanik':
        return 'bg-status-green-bg text-status-green border-status-green/30';
      case 'Admin Purchasing':
        return 'bg-accent-subtle text-accent border-accent/30';
      case 'Admin Invoice':
        return 'bg-accent-subtle text-accent border-accent/30';
      case 'Security':
        return 'bg-status-amber-bg text-status-amber border-status-amber/30';
      case 'Customer Fleet':
        return 'bg-accent-subtle text-accent border-accent/30';
      case 'PIC Terkait':
        return 'bg-accent-subtle text-accent border-accent/30';
      default:
        return 'bg-surface text-ink-muted border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-surface-raised rounded-md border border-border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-red-bg text-status-red border border-status-red/30">
              Super Admin Control
            </span>
            <div className="flex items-center gap-1.5 text-xs text-status-green font-medium bg-status-green-bg px-2 py-0.5 rounded-full border border-status-green/30">
              <Database className="w-3 h-3 text-status-green" />
              <span>Supabase: Dev - DB Web Fleet</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Admin Panel &amp; Pengaturan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Kelola seluruh akun pengguna, tetapkan peran akses operasional, atur persentase PPN, dan konfigurasikan kop header/footer cetak dokumen.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna</span>
            </button>
          )}

          {(activeTab === 'settings' || activeTab === 'ppn' || activeTab === 'print-templates') && (
            <button
              type="button"
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Toast / Alert */}
      {feedbackMsg && (
        <div className={`p-4 rounded-md border flex items-center gap-3 text-xs sm:text-sm font-semibold transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-status-green-bg border-status-green/30 text-status-green' 
            : 'bg-status-red-bg border-status-red/30 text-status-red'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-status-green shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-status-red shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex border-b border-border bg-surface-raised px-4 rounded-t-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'border-accent text-accent font-black'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Pengguna &amp; Role</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-surface text-ink-muted font-mono">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ppn')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'ppn'
              ? 'border-accent text-accent font-black'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Pengaturan PPN ({settings?.ppn_persen != null ? `${settings.ppn_persen}%` : 'belum diatur'})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('print-templates')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'print-templates'
              ? 'border-accent text-accent font-black'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Kop Header &amp; Footer Cetak Dokumen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-accent text-accent font-black'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profil &amp; Rekening Bengkel</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: MANAJEMEN PENGGUNA & ROLE                                      */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <div className="bg-surface-raised rounded-b-xl border border-t-0 border-border p-6 shadow-xs space-y-5">
          {/* Controls: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => {
                  setSearchUser(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Cari berdasarkan nama atau email..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
              />
            </div>
            <div className="w-44">
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setUserPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-md border border-border bg-surface-raised font-medium focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="ALL">Semua Peran ({users.length})</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r} ({users.filter((u) => u.peran === r).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface border-b border-border text-ink-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Pengguna (Nama & Email)</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">No. Telepon / HP</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-subtle">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-ink-subtle" />
                      Memuat daftar pengguna dari Supabase...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-subtle">
                      Tidak ada pengguna yang sesuai dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-surface/70 transition-colors">
                      {/* Pengguna (Avatar + Nama + Email) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-ink-muted text-xs shrink-0">
                            {u.nama_lengkap.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-ink">{u.nama_lengkap}</div>
                            <div className="text-[11px] font-mono text-ink-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Peran */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${getRoleBadge(u.peran)}`}>
                          {u.peran}
                        </span>
                      </td>

                      {/* Kontak */}
                      <td className="py-3 px-4">
                        <div className="text-ink font-medium">{u.no_telepon || '-'}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {u.status_aktif ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-green-bg text-status-green border border-status-green/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-red-bg text-status-red border border-status-red/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-red" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Ubah Peran & Data */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setIsEditUserOpen(true);
                            }}
                            className="p-1.5 rounded-md border border-border hover:bg-surface text-ink-muted hover:text-ink transition-colors cursor-pointer"
                            title="Ubah Peran / Data Pengguna"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetPwdUser(u);
                              setIsResetPwdOpen(true);
                            }}
                            className="p-1.5 rounded-md border border-border hover:bg-surface text-ink-muted hover:text-status-amber transition-colors cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Status Aktif */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Ubah status pengguna ${u.nama_lengkap} menjadi ${u.status_aktif ? 'Nonaktif' : 'Aktif'}?`)) {
                                toggleStatusMutation.mutate({ id: u.id, status_aktif: !u.status_aktif });
                              }
                            }}
                            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                              u.status_aktif 
                                ? 'border-status-red/30 text-status-red hover:bg-status-red/10' 
                                : 'border-status-green/30 text-status-green hover:bg-status-green/10'
                            }`}
                            title={u.status_aktif ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
                          >
                            {u.status_aktif ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <PaginationBar
            page={userPage}
            totalPages={totalUserPages}
            totalRecords={totalUsers}
            limit={userLimit}
            onPageChange={setUserPage}
            onLimitChange={(l) => {
              setUserLimit(l);
              setUserPage(1);
            }}
            label="pengguna"
            isLoading={isLoadingUsers}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PENGATURAN PPN (PAJAK PERTAMBAHAN NILAI)                        */}
      {/* ===================================================================== */}
      {activeTab === 'ppn' && (
        <div className="bg-surface-raised rounded-b-xl border border-t-0 border-border p-6 sm:p-8 shadow-xs max-w-3xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
              <Percent className="w-5 h-5 text-accent" />
              Konfigurasi Pajak Pertambahan Nilai (PPN)
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Atur persentase tarif PPN yang berlaku untuk seluruh transaksi suku cadang, jasa servis SPK, dan faktur kasir.
            </p>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-ink mb-1" htmlFor="ppn_persen">
                  Tarif PPN Aktif (%) <span className="text-status-red">*</span>
                </label>
                <div className="relative max-w-[180px]">
                  <input
                    id="ppn_persen"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settingsForm.ppn_persen ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, ppn_persen: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-bold text-ink rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle font-bold text-xs">%</span>
                </div>
              </div>

              {/* Live Preview Calculation */}
              <div className="p-3 bg-surface-raised rounded-md border border-border text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-ink-muted uppercase">Simulasi Hitung (Subtotal Rp 1.000.000):</div>
                <div className="flex justify-between text-ink-muted">
                  <span>Dasar Pengenaan Pajak (DPP):</span>
                  <span className="font-mono">Rp 1.000.000</span>
                </div>
                <div className="flex justify-between text-accent font-semibold">
                  <span>PPN ({settingsForm.ppn_persen != null ? `${settingsForm.ppn_persen}%` : 'belum diatur'}):</span>
                  <span className="font-mono">Rp {settingsForm.ppn_persen != null ? (1000000 * (settingsForm.ppn_persen / 100)).toLocaleString('id-ID') : '-'}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between font-bold text-ink">
                  <span>Grand Total Invoice:</span>
                  <span className="font-mono">Rp {settingsForm.ppn_persen != null ? (1000000 + 1000000 * (settingsForm.ppn_persen / 100)).toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Tarif PPN'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: HEADER & FOOTER CETAK DOKUMEN                                  */}
      {/* ===================================================================== */}
      {activeTab === 'print-templates' && (
        <div className="bg-surface-raised rounded-b-xl border border-t-0 border-border p-6 sm:p-8 shadow-xs space-y-8">
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
              <Printer className="w-5 h-5 text-accent" />
              Template Header &amp; Catatan Kaki Dokumen Cetak
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Atur teks kop surat, judul dokumen, dan klausul footer resmi yang muncul pada cetakan Surat Memo Keluar Security, SPK Service, dan Faktur Invoice.
            </p>
          </div>

          {/* Section 1: Memo Keluar (Gate Pass) */}
          <div className="p-5 rounded-md border border-border bg-surface/60 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-amber" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                1. Surat Memo Keluar Gerbang (Gate Pass Security)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="header_memo">
                  Judul Header Memo Keluar
                </label>
                <input
                  id="header_memo"
                  type="text"
                  value={settingsForm.header_print_memo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, header_print_memo: e.target.value })}
                  placeholder="BENGKEL KIM 3 - GATE PASS KELUAR RESMI"
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="footer_memo">
                  Klausul Footer Catatan Security
                </label>
                <textarea
                  id="footer_memo"
                  rows={2}
                  value={settingsForm.footer_print_memo || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, footer_print_memo: e.target.value })}
                  placeholder="Memo keluar ini merupakan dokumen resmi verifikasi security gate. Kendaraan dan muatan wajib diperiksa sebelum keluar gerbang bengkel."
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: SPK Service */}
          <div className="p-5 rounded-md border border-border bg-surface/60 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-blue" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                2. Surat Perintah Kerja (SPK Service Bengkel)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="header_spk">
                  Judul Header Formulir SPK
                </label>
                <input
                  id="header_spk"
                  type="text"
                  value={settingsForm.header_print_spk || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, header_print_spk: e.target.value })}
                  placeholder="BENGKEL KIM 3 - SURAT PERINTAH KERJA (SPK)"
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="footer_spk">
                  Klausul Footer Persetujuan SPK
                </label>
                <textarea
                  id="footer_spk"
                  rows={2}
                  value={settingsForm.footer_print_spk || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, footer_print_spk: e.target.value })}
                  placeholder="Seluruh pengerjaan dan penggantian suku cadang telah diverifikasi Service Advisor dan disetujui pihak penanggung jawab armada."
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Faktur Invoice Tagihan */}
          <div className="p-5 rounded-md border border-border bg-surface/60 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-green" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                3. Faktur Invoice &amp; Bukti Pembayaran Kasir
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="header_inv">
                  Judul Header Faktur Tagihan
                </label>
                <input
                  id="header_inv"
                  type="text"
                  value={settingsForm.header_print_invoice || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, header_print_invoice: e.target.value })}
                  placeholder="BENGKEL KIM 3 - FAKTUR TAGIHAN & PEMBAYARAN"
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="footer_inv">
                  Klausul Footer Ketentuan Pembayaran &amp; Garansi
                </label>
                <textarea
                  id="footer_inv"
                  rows={2}
                  value={settingsForm.footer_print_invoice || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, footer_print_invoice: e.target.value })}
                  placeholder="Pembayaran sah setelah dana efektif di rekening. Simpan bukti faktur ini sebagai dokumen jaminan garansi service."
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Seluruh Template'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: PROFIL BENGKEL & REKENING PEMBAYARAN                           */}
      {/* ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-surface-raised rounded-b-xl border border-t-0 border-border p-6 sm:p-8 shadow-xs space-y-6 max-w-4xl">
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              Profil Instansi &amp; Rekening Bank Bengkel
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Data identitas resmi yang dicantumkan pada kop surat dan rekening tujuan transfer customer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="nama_bengkel">
                Nama Resmi Bengkel
              </label>
              <input
                id="nama_bengkel"
                type="text"
                value={settingsForm.nama_bengkel || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, nama_bengkel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="slogan">
                Slogan / Tagline
              </label>
              <input
                id="slogan"
                type="text"
                value={settingsForm.slogan_bengkel || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, slogan_bengkel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="alamat">
                Alamat Fisik Bengkel
              </label>
              <input
                id="alamat"
                type="text"
                value={settingsForm.alamat_bengkel || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, alamat_bengkel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="telp">
                Nomor Telepon / Call Center
              </label>
              <input
                id="telp"
                type="text"
                value={settingsForm.no_telepon_bengkel || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, no_telepon_bengkel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="email">
                Email Bengkel
              </label>
              <input
                id="email"
                type="email"
                value={settingsForm.email_bengkel || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, email_bengkel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="npwp">
                Nomor Pokok Wajib Pajak (NPWP)
              </label>
              <input
                id="npwp"
                type="text"
                value={settingsForm.npwp_bengkel || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, npwp_bengkel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="logo">
                Path / URL Logo
              </label>
              <input
                id="logo"
                type="text"
                value={settingsForm.logo_url || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-accent" />
              Rekening Bank Tujuan Pembayaran Invoice
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="bank_nama">
                  Nama Bank
                </label>
                <input
                  id="bank_nama"
                  type="text"
                  value={settingsForm.bank_nama || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bank_nama: e.target.value })}
                  placeholder="Bank Mandiri"
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="bank_rekening">
                  Nomor Rekening
                </label>
                <input
                  id="bank_rekening"
                  type="text"
                  value={settingsForm.bank_rekening || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bank_rekening: e.target.value })}
                  placeholder="105-00-1234567-8"
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="bank_atas_nama">
                  Atas Nama Rekening
                </label>
                <input
                  id="bank_atas_nama"
                  type="text"
                  value={settingsForm.bank_atas_nama || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bank_atas_nama: e.target.value })}
                  placeholder="PT BENGKEL KIM TIGA SEJAHTERA"
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-border bg-surface-raised focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Profil & Rekening'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH PENGGUNA BARU                                           */}
      {/* ===================================================================== */}
      {isAddUserOpen && (
        <ModalPortal onClose={() => setIsAddUserOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-surface-raised rounded-md shadow-xl border border-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-sm text-ink">Tambah Akun Pengguna Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-ink-subtle hover:text-ink-muted text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanEmail = addForm.email.trim();
                if (!cleanEmail || !addForm.nama_lengkap.trim()) {
                  toast.warning('Lengkapi email dan nama lengkap');
                  return;
                }
                if (!isValidEmail(cleanEmail)) {
                  toast.warning('Format email tidak valid. Masukkan domain lengkap (contoh: user@bengkelkim3.com)');
                  return;
                }
                addUserMutation.mutate({ ...addForm, email: cleanEmail });
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="add_email">
                  Alamat Email (Login Akun) <span className="text-status-red">*</span>
                </label>
                <input
                  id="add_email"
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="Contoh: sa@bengkelkim3.com"
                  className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="add_nama">
                  Nama Lengkap <span className="text-status-red">*</span>
                </label>
                <input
                  id="add_nama"
                  type="text"
                  required
                  value={addForm.nama_lengkap}
                  onChange={(e) => setAddForm({ ...addForm, nama_lengkap: e.target.value })}
                  placeholder="Nama lengkap pengguna"
                  className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="add_peran">
                    Peran Akses (Role) <span className="text-status-red">*</span>
                  </label>
                  <select
                    id="add_peran"
                    value={addForm.peran}
                    onChange={(e) => setAddForm({ ...addForm, peran: e.target.value as PeranUser })}
                    className="w-full px-3 py-2 text-xs rounded-md border border-border bg-surface-raised font-medium focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="add_pwd">
                    Kata Sandi (Opsional)
                  </label>
                  <input
                    id="add_pwd"
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Default: password123"
                    className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="add_phone">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  id="add_phone"
                  type="text"
                  value={addForm.no_telepon}
                  onChange={(e) => setAddForm({ ...addForm, no_telepon: e.target.value })}
                  placeholder="0812xxxxxxx"
                  className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addForm.status_aktif}
                    onChange={(e) => setAddForm({ ...addForm, status_aktif: e.target.checked })}
                    className="rounded-xs text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-ink-muted font-medium">Status Akun Langsung Aktif</span>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-muted hover:bg-surface rounded-md transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {addUserMutation.isPending ? 'Menambahkan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT PENGGUNA & ROLE                                           */}
      {/* ===================================================================== */}
      {isEditUserOpen && editingUser && (
        <ModalPortal onClose={() => setIsEditUserOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-surface-raised rounded-md shadow-xl border border-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-sm text-ink">Ubah Peran &amp; Data: {editingUser.email}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUserOpen(false)}
                className="text-ink-subtle hover:text-ink-muted text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanEmail = editingUser.email.trim();
                if (!cleanEmail || !editingUser.nama_lengkap.trim()) {
                  toast.warning('Lengkapi nama lengkap dan email');
                  return;
                }
                if (!isValidEmail(cleanEmail)) {
                  toast.warning('Format email tidak valid. Masukkan domain lengkap (contoh: user@bengkelkim3.com)');
                  return;
                }
                updateUserMutation.mutate({
                  id: editingUser.id,
                  nama_lengkap: editingUser.nama_lengkap.trim(),
                  peran: editingUser.peran,
                  no_telepon: editingUser.no_telepon,
                  email: cleanEmail,
                  status_aktif: editingUser.status_aktif,
                });
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="edit_nama">
                  Nama Lengkap
                </label>
                <input
                  id="edit_nama"
                  type="text"
                  required
                  value={editingUser.nama_lengkap}
                  onChange={(e) => setEditingUser({ ...editingUser, nama_lengkap: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1" htmlFor="edit_peran">
                  Peran Akses (Role Utama) <span className="text-status-red">*</span>
                </label>
                <select
                  id="edit_peran"
                  value={editingUser.peran}
                  onChange={(e) => setEditingUser({ ...editingUser, peran: e.target.value as PeranUser })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-md border border-accent bg-accent/5 text-ink focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[11px] text-ink-muted mt-1">
                  Perubahan peran akan langsung berlaku pada sesi login berikutnya.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="edit_phone">
                    Nomor HP / WhatsApp
                  </label>
                  <input
                    id="edit_phone"
                    type="text"
                    value={editingUser.no_telepon || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, no_telepon: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="edit_email">
                    Alamat Email
                  </label>
                  <input
                    id="edit_email"
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingUser.status_aktif}
                    onChange={(e) => setEditingUser({ ...editingUser, status_aktif: e.target.checked })}
                    className="rounded-xs text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-ink-muted font-medium">Akun Aktif</span>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-muted hover:bg-surface rounded-md transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updateUserMutation.isPending ? 'Menyimpan...' : 'Perbarui Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RESET PASSWORD                                                 */}
      {/* ===================================================================== */}
      {isResetPwdOpen && resetPwdUser && (
        <ModalPortal onClose={() => setIsResetPwdOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-surface-raised rounded-md shadow-xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-status-amber" />
                <h3 className="font-bold text-sm text-ink">Reset Kata Sandi Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPwdOpen(false)}
                className="text-ink-subtle hover:text-ink-muted text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPassword.trim()) {
                  toast.warning('Masukkan kata sandi baru');
                  return;
                }
                resetPwdMutation.mutate({
                  id: resetPwdUser.id,
                  password_baru: newPassword.trim(),
                });
              }}
              className="p-5 space-y-4"
            >
              <div className="p-3 bg-status-amber-bg rounded-md border border-status-amber/30 text-xs text-status-amber">
                Mereset kata sandi untuk akun <span className="font-bold">{resetPwdUser.email}</span> ({resetPwdUser.nama_lengkap}).
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1" htmlFor="new_pwd">
                  Kata Sandi Baru <span className="text-status-red">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new_pwd"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru"
                    className="w-full px-3.5 pr-10 py-2.5 text-xs rounded-md border border-border focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPwdOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-muted hover:bg-surface rounded-md transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetPwdMutation.isPending}
                  className="px-4 py-2 bg-status-amber hover:bg-status-amber/90 text-white rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resetPwdMutation.isPending ? 'Mereset...' : 'Simpan Kata Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AdminPanelView;
