import React from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Phone,
  Truck,
  User,
  Wrench,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import type { KunjunganService } from '../../types';

interface KunjunganServiceDetailProps {
  kunjungan: KunjunganService;
}

const resolvePhotoSrc = (raw?: string | null): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
};

const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value?: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
      {icon}
      {label}
    </div>
    <div className="text-xs font-semibold leading-relaxed text-ink">{value || '-'}</div>
  </div>
);

const ConditionItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  const finalValue = value && value.trim() ? value : 'Belum Diperiksa';
  const isChecked = finalValue !== 'Belum Diperiksa';
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          isChecked
            ? 'bg-status-green-bg text-status-green'
            : 'bg-surface text-ink-subtle border border-border'
        }`}
      >
        {finalValue}
      </span>
    </div>
  );
};

/**
 * Detail ringan untuk kunjungan SERVICE yang sudah check-in di gerbang
 * tetapi SA belum menerbitkan WO/SPK. Sengaja tidak menampilkan tab
 * invoice/approval/pekerjaan karena belum ada transaksi POS.
 */
export const KunjunganServiceDetail: React.FC<KunjunganServiceDetailProps> = ({ kunjungan }) => {
  const keluhan =
    kunjungan.keluhan_customer ||
    kunjungan.tujuan_kunjungan ||
    'Service Kendaraan';
  const fotoMasuk = resolvePhotoSrc(kunjungan.foto_kendaraan_masuk);

  return (
    <div className="space-y-5">
      {/* Status utama */}
      <div className="rounded-2xl border border-[#BFD3F5] bg-gradient-to-br from-[#F3F7FF] to-white p-4 dark:border-blue-900/50 dark:from-blue-950/30 dark:to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={kunjungan.status_spk} size="md" />
            <span className="text-xs font-semibold text-ink">
              {kunjungan.status_keterangan || 'Menunggu Penerimaan Awal oleh SA'}
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[#34517C] dark:text-blue-300">
            {kunjungan.nomor_tiket}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Unit sudah tercatat masuk di Pos Security KIM 3. SA belum menerbitkan Work Order,
          sehingga riwayat ini masih berada pada tahap penerimaan awal.
        </p>
      </div>

      {/* Informasi check-in */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <InfoItem icon={<Clock className="h-3 w-3" />} label="Waktu Check In" value={fmtDateTime(kunjungan.waktu_check_in)} />
        <InfoItem icon={<Truck className="h-3 w-3" />} label="No. Polisi" value={kunjungan.no_polisi} />
        <InfoItem icon={<User className="h-3 w-3" />} label="Pengemudi" value={kunjungan.nama_pengemudi} />
        <InfoItem icon={<Building2 className="h-3 w-3" />} label="Perusahaan" value={kunjungan.nama_perusahaan || kunjungan.nama_customer} />
        <InfoItem icon={<Phone className="h-3 w-3" />} label="No. HP" value={kunjungan.no_telepon_pengemudi} />
        <InfoItem icon={<FileText className="h-3 w-3" />} label="Tiket Gerbang" value={kunjungan.nomor_tiket} />
      </div>

      {/* Keluhan & catatan */}
      <div className="rounded-2xl border border-border bg-surface-raised p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-ink">
          <Wrench className="h-4 w-4 text-accent" />
          Keperluan / Keluhan
        </div>
        <p className="text-xs leading-relaxed text-ink-muted">"{keluhan}"</p>
        {kunjungan.tujuan_kunjungan && kunjungan.tujuan_kunjungan !== keluhan && (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
            Catatan booking: {kunjungan.tujuan_kunjungan}
          </p>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-ink">
            <FileText className="h-4 w-4 text-accent" />
            Catatan Masuk Gerbang
          </div>
          <p className="text-xs leading-relaxed text-ink-muted">
            {kunjungan.catatan_masuk?.trim() || '-'}
          </p>
        </div>
      </div>

      {/* Pemeriksaan awal */}
      <div className="rounded-2xl border border-border bg-surface-raised p-4">
        <div className="mb-3 flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
          <div>
            <div className="text-xs font-bold text-ink">
              Pemeriksaan Fisik Awal (Walk-around check 4 titik)
            </div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
              Akan diisi SA saat penerimaan awal. Selama WO belum terbit, kondisi unit
              ditampilkan sebagai "Belum Diperiksa".
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ConditionItem label="Bodi" value={kunjungan.cek_body} />
          <ConditionItem label="Mesin" value={kunjungan.cek_mesin} />
          <ConditionItem label="Kelistrikan" value={kunjungan.cek_kelistrikan} />
          <ConditionItem label="Kaki-kaki" value={kunjungan.cek_kaki_kaki} />
        </div>
      </div>

      {/* Foto check-in */}
      {fotoMasuk && (
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-ink">
            <Camera className="h-4 w-4 text-accent" />
            Foto Kendaraan Masuk
          </div>
          <img
            src={fotoMasuk}
            alt={`Foto kendaraan masuk ${kunjungan.no_polisi}`}
            className="max-h-64 w-full rounded-xl border border-border object-cover"
          />
        </div>
      )}

      {/* Timeline singkat */}
      <div className="rounded-2xl border border-border bg-surface-raised p-4">
        <div className="mb-3 text-xs font-bold text-ink">Timeline Riwayat Aktivitas Service</div>
        <div className="relative ml-2 space-y-4 border-l-2 border-border pl-4">
          <div className="relative">
            <span className="absolute -left-[25px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-green text-white">
              <CheckCircle2 className="h-3 w-3" />
            </span>
            <div className="text-xs font-bold text-ink">Kendaraan Masuk di Pos Security</div>
            <div className="mt-0.5 text-[11px] text-ink-subtle">{fmtDateTime(kunjungan.waktu_check_in)}</div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
              Kendaraan tiba, tiket gerbang diterbitkan, dan unit menunggu penerimaan SA.
            </p>
          </div>
          <div className="relative">
            <span className="absolute -left-[25px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-blue text-white">
              <Clock className="h-3 w-3" />
            </span>
            <div className="text-xs font-bold text-ink">Penerimaan & Cek Awal oleh SA</div>
            <div className="mt-0.5 text-[11px] font-semibold text-status-blue">
              Menunggu Penerimaan Awal oleh SA
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
              Setelah SA menerbitkan WO, status dan timeline akan otomatis diperbarui ke tahap
              pengecekan mekanik.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KunjunganServiceDetail;
