import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Eye, EyeOff, Camera, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../api/client';
import { ModalPortal } from '../common/ModalPortal';
import { PhotoUploader } from '../common/PhotoUploader';
import { toast } from '../common/Toast';

interface ProfileModalProps {
  onClose: () => void;
}

/**
 * ProfileModal — ubah profil sendiri (nama, telepon, foto) + ganti password.
 * Terkunci ke id JWT di server; avatar langsung tampil di navbar setelah simpan.
 */
export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { authUser } = useAppStore();
  const [nama, setNama] = useState(authUser?.nama_lengkap || '');
  const [telepon, setTelepon] = useState(authUser?.no_telepon || '');
  const [foto, setFoto] = useState(authUser?.foto_profil || '');
  const [saving, setSaving] = useState(false);

  const [pwdLama, setPwdLama] = useState('');
  const [pwdBaru, setPwdBaru] = useState('');
  const [pwdKonfirmasi, setPwdKonfirmasi] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const refreshProfil = async () => {
    const me = await api.getMe();
    useAppStore.setState({ authUser: me, currentUser: me.nama_lengkap || '' });
    try {
      localStorage.setItem('bengkel_auth_user', JSON.stringify(me));
    } catch {
      /* abaikan */
    }
  };

  const handleSimpanProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error('Nama Belum Diisi', 'Nama lengkap wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfil({
        nama_lengkap: nama.trim(),
        nama_pic: authUser?.nama_pic || undefined,
        nama_perusahaan: authUser?.nama_perusahaan || undefined,
        alamat: authUser?.alamat || undefined,
        npwp: authUser?.npwp || undefined,
        no_telepon: telepon.trim(),
        foto_profil: foto ?? '',
      });
      await refreshProfil();
      toast.success('Profil Disimpan', 'Data profil & foto Anda telah diperbarui.');
      onClose();
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err?.message || 'Coba beberapa saat lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleGantiPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdLama || !pwdBaru || !pwdKonfirmasi) {
      toast.error('Belum Lengkap', 'Isi kata sandi lama, baru, dan konfirmasi.');
      return;
    }
    if (pwdBaru.length < 6) {
      toast.error('Terlalu Pendek', 'Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (pwdBaru !== pwdKonfirmasi) {
      toast.error('Tidak Cocok', 'Konfirmasi kata sandi baru tidak sama.');
      return;
    }
    if (!authUser?.email) {
      toast.error('Gagal', 'Email akun tidak ditemukan.');
      return;
    }
    setChangingPwd(true);
    try {
      // Verifikasi kata sandi lama via login (gagal -> throw).
      await api.login(authUser.email, pwdLama);
      await api.gantiPassword(pwdBaru);
      setPwdLama('');
      setPwdBaru('');
      setPwdKonfirmasi('');
      toast.success('Kata Sandi Diubah', 'Gunakan kata sandi baru saat masuk berikutnya.');
    } catch (err: any) {
      toast.error('Gagal Mengubah', err?.message || 'Kata sandi lama salah.');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 md:py-10 app-backdrop-in">
        <div className="bg-surface-raised rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-border my-auto max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden app-modal-in">
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent-subtle rounded-md text-accent">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Profil Saya</h3>
                <p className="text-[11px] text-ink-muted">Kelola data akun & kata sandi Anda</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md text-ink-subtle hover:text-ink hover:bg-surface transition-colors"
              aria-label="Tutup profil"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Isi scroll di dalam modal */}
          <div className="overflow-y-auto space-y-5 pr-0.5">
          {/* Foto + Data Dasar */}          <form onSubmit={handleSimpanProfil} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-accent text-white font-black flex items-center justify-center text-xl shrink-0 shadow-xs">
                {foto ? (
                  <img src={foto} alt="Foto profil" className="w-full h-full object-cover" />
                ) : (
                  <span>{(nama || authUser?.nama_lengkap || 'U').charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <PhotoUploader
                  label="Foto Profil"
                  value={foto}
                  onChange={(url) => setFoto(url)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="profil_nama">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="profil_nama"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-border bg-surface text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="profil_telp">
                No. WhatsApp / HP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="profil_telp"
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0812xxxxxxx"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-border bg-surface text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-subtle bg-surface rounded-lg border border-border px-3 py-2">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{authUser?.email || '-'}</span>
              <span className="ml-auto shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Mitra Fleet</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-semibold text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Profil</span>
                </>
              )}
            </button>
          </form>

          {/* Ganti Kata Sandi */}
          <form onSubmit={handleGantiPassword} className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-bold text-ink">Ganti Kata Sandi</h4>
            </div>
            {[
              { id: 'pwd_lama', label: 'Kata Sandi Lama', value: pwdLama, set: setPwdLama, ph: 'Masukkan kata sandi saat ini' },
              { id: 'pwd_baru', label: 'Kata Sandi Baru (min. 6 karakter)', value: pwdBaru, set: setPwdBaru, ph: 'Buat kata sandi baru' },
              { id: 'pwd_konfirmasi', label: 'Konfirmasi Kata Sandi Baru', value: pwdKonfirmasi, set: setPwdKonfirmasi, ph: 'Ulangi kata sandi baru' },
            ].map((f) => (
              <div key={f.id}>
                <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor={f.id}>
                  {f.label}
                </label>
                <div className="relative">
                  <input
                    id={f.id}
                    type={showPwd ? 'text' : 'password'}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-lg border border-border bg-surface text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all font-sans"
                  />
                  <button
                    type="button"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-subtle hover:text-ink cursor-pointer"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 text-[11px] text-ink-subtle">
              <Camera className="w-3.5 h-3.5 shrink-0 text-accent" />
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPwd}
                  onChange={(e) => setShowPwd(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-xs border-border accent-accent cursor-pointer"
                />
                <span>Tampilkan kata sandi</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={changingPwd}
              className="w-full py-2.5 px-4 bg-surface-raised border border-border hover:border-accent hover:text-accent text-ink font-semibold text-sm rounded-md shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {changingPwd ? (
                <>
                  <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Ubah Kata Sandi</span>
                </>
              )}
            </button>
          </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ProfileModal;
