import React, { useMemo } from 'react';
import { Check, Clock } from 'lucide-react';
import { formatPlat } from '../../api/client';
import { fmtWaktuFull } from '../../utils/dateFormat';
import {
  resolveServiceTimeline,
  visibleServiceStages,
  type ServiceStageKey,
  type ServiceStageState,
} from '../../utils/serviceTimeline';
import type {
  InvoicePembayaran,
  SpkItemPart,
  SpkItemPekerjaan,
  SpkService,
} from '../../types';

/**
 * Standar warna dot timeline servis (lihat utils/serviceTimeline):
 * hijau = selesai, biru = berlangsung, merah = tertunda, amber = butuh persetujuan.
 * Label teks disertakan agar status tetap terbaca tanpa mengandalkan warna.
 */
const TIMELINE_TONE: Record<ServiceStageState, { dot: string; chip: string; label: string }> = {
  done: {
    dot: 'bg-status-green ring-white dark:ring-slate-900',
    chip: 'border-status-green/25 bg-status-green-bg text-status-green',
    label: 'Selesai',
  },
  active: {
    dot: 'bg-status-blue ring-status-blue/20 animate-pulse',
    chip: 'border-status-blue/25 bg-status-blue-bg text-status-blue',
    label: 'Berlangsung',
  },
  blocked: {
    dot: 'bg-status-red ring-status-red/20 animate-pulse',
    chip: 'border-status-red/25 bg-status-red-bg text-status-red',
    label: 'Tertunda',
  },
  attention: {
    dot: 'bg-status-amber ring-status-amber/20 animate-pulse',
    chip: 'border-status-amber/30 bg-status-amber-bg text-status-amber',
    label: 'Perlu Persetujuan',
  },
  pending: {
    dot: 'bg-white dark:bg-slate-900 border-2 border-dashed border-border ring-white dark:ring-slate-900',
    chip: 'border-border bg-surface text-ink-subtle',
    label: 'Menunggu',
  },
};

interface TimelineMetaRow {
  label: string;
  value: React.ReactNode;
}

interface ServiceTimelineItemProps {
  state: ServiceStageState;
  isLast?: boolean;
  title: string;
  time?: React.ReactNode;
  rows?: TimelineMetaRow[];
  children?: React.ReactNode;
}

const ServiceTimelineItem: React.FC<ServiceTimelineItemProps> = ({
  state,
  isLast,
  title,
  time,
  rows,
  children,
}) => {
  const tone = TIMELINE_TONE[state];
  const validRows = (rows || []).filter(
    (r) => r.value !== null && r.value !== undefined && r.value !== ''
  );

  return (
    <div className="relative">
      {/* Rel progres: hanya tersambung hijau setelah tahap yang sudah selesai */}
      {!isLast && state === 'done' && (
        <span
          aria-hidden="true"
          className="absolute -left-[18px] top-5 -bottom-4 w-[2px] rounded-full bg-status-green"
        />
      )}
      <span
        aria-hidden="true"
        className={`absolute -left-[24px] top-3.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ${tone.dot}`}
        title={tone.label}
      >
        {state === 'done' && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
      </span>

      <div className="rounded-xl border border-border/80 bg-white/95 dark:bg-slate-900/60 p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-ink">{title}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${tone.chip}`}
            >
              {tone.label}
            </span>
          </div>
          {time && (
            <span className="text-xs font-semibold text-accent whitespace-nowrap">{time}</span>
          )}
        </div>

        {validRows.length > 0 && (
          <div className="divide-y divide-border/40 rounded-lg bg-surface/60 dark:bg-slate-800/40 px-3 py-1 border border-border/40">
            {validRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 py-1.5 text-xs"
              >
                <span className="text-ink-muted shrink-0">{row.label}</span>
                <span className="font-semibold text-ink text-right break-words">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {children && (
          <div className="pt-2 border-t border-border/60 text-xs text-ink-muted space-y-1.5 leading-relaxed">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ServiceActivityTimelineProps {
  spk: SpkService;
  pekerjaanList?: SpkItemPekerjaan[];
  partSpkList?: SpkItemPart[];
  activeInvoice?: InvoicePembayaran | null;
  /** Catatan status tambahan, mis. "Menunggu Penerimaan Awal oleh SA" untuk gate-only. */
  statusNote?: string;
  className?: string;
}

const cleanText = (val?: string | null): string | null => {
  const trimmed = val?.trim();
  if (!trimmed || trimmed === '-') return null;
  return trimmed;
};

const getMulaiDikerjakanIso = (spk: SpkService): string | null => {
  if (spk.waktu_mulai_pekerjaan) return spk.waktu_mulai_pekerjaan;
  if (spk.tanggal_mulai_dikerjakan) {
    const jam = spk.jam_mulai_dikerjakan?.trim();
    return jam ? `${spk.tanggal_mulai_dikerjakan}T${jam}:00` : spk.tanggal_mulai_dikerjakan;
  }
  return null;
};

const getDurasiAktual = (spk: SpkService): string | null => {
  const mulaiIso = getMulaiDikerjakanIso(spk);
  if (spk.waktu_selesai_pekerjaan && mulaiIso) {
    const ms = new Date(spk.waktu_selesai_pekerjaan).getTime() - new Date(mulaiIso).getTime();
    if (!isNaN(ms) && ms >= 0) {
      const totalMinutes = Math.round(ms / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 0 && mins > 0) return `${hours} Jam ${mins} Menit`;
      if (hours > 0) return `${hours} Jam`;
      return `${mins} Menit`;
    }
  }
  return null;
};

const getEstimasiSelesaiLabel = (spk: SpkService): string | null => {
  const latestJam =
    spk.jam_estimasi_selesai_t3 ||
    spk.jam_estimasi_selesai_t2 ||
    spk.jam_estimasi_selesai_t1 ||
    spk.jam_estimasi_selesai_awal ||
    null;
  const candidates: Array<[string | null | undefined, string | null | undefined]> = [
    [spk.estimasi_selesai_t3, spk.jam_estimasi_selesai_t3 || latestJam],
    [spk.estimasi_selesai_t2, spk.jam_estimasi_selesai_t2 || latestJam],
    [spk.estimasi_selesai_t1, spk.jam_estimasi_selesai_t1 || latestJam],
    [spk.estimasi_selesai_awal, spk.jam_estimasi_selesai_awal],
    [spk.estimasi_selesai_ta, latestJam],
  ];
  for (const [tgl, jam] of candidates) {
    if (!tgl) continue;
    const parsed = new Date(tgl);
    if (isNaN(parsed.getTime())) continue;
    const dateStr = parsed.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${dateStr}${jam ? ` • ${jam} WIB` : ''}`;
  }
  return null;
};

/**
 * Satu-satunya implementasi timeline Riwayat Aktivitas Service.
 * Dipakai oleh detail SPK maupun detail check-in gerbang (sebelum WO terbit).
 */
export const ServiceActivityTimeline: React.FC<ServiceActivityTimelineProps> = ({
  spk,
  pekerjaanList,
  partSpkList,
  activeInvoice,
  statusNote,
  className,
}) => {
  const activeInvoiceLunas =
    !!activeInvoice &&
    (activeInvoice.status_pembayaran === 'Paid' || activeInvoice.status_pembayaran === 'Lunas');

  const serviceTimeline = useMemo(
    () => resolveServiceTimeline(spk, activeInvoiceLunas),
    [spk, activeInvoiceLunas]
  );
  const visibleStages = useMemo(() => visibleServiceStages(serviceTimeline), [serviceTimeline]);
  const isLastStage = (key: ServiceStageKey) =>
    visibleStages[visibleStages.length - 1] === key;

  const activePekerjaan = (pekerjaanList || []).filter((p) => p.id_spk === spk?.id);
  const activeParts = (partSpkList || []).filter((p) => p.id_spk === spk?.id);

  const mulaiIso = getMulaiDikerjakanIso(spk);
  const estimasiSelesai = getEstimasiSelesaiLabel(spk);
  const durasiAktual = getDurasiAktual(spk);
  const mekanikList = (spk.semua_mekanik || spk.nama_mekanik || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const teknisiText =
    mekanikList.length > 1
      ? mekanikList.map((m, idx) => `Mekanik ${idx + 1}: ${m}`).join(', ')
      : mekanikList[0] || '-';

  const namaSupir = cleanText(spk.nama_supir);
  const jenisPekerjaan = cleanText(spk.jenis_pekerjaan);
  const produkBelumDipakai = cleanText(spk.produk_belum_dipakai);
  const jasaBelumDipakai = cleanText(spk.jasa_belum_dipakai);
  const keteranganEstimasi = cleanText(spk.keterangan_estimasi);

  return (
    <div
      className={`space-y-3 p-4 rounded-2xl border border-border bg-gradient-to-b from-[#F8FAFF] to-surface-raised dark:from-slate-800/40 dark:to-transparent ${className || ''}`}
    >
      <span className="font-black text-ink flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center shadow-2xs shrink-0">
          <Clock className="w-3.5 h-3.5" />
        </span>
        Timeline Riwayat Aktivitas Service
      </span>

      <div className="space-y-3 relative pl-4 border-l-2 border-border ml-2">
        {/* Step Booking */}
        {serviceTimeline.booking !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.booking}
            isLast={isLastStage('booking')}
            title="Booking Service Terjadwal"
            time={
              fmtWaktuFull(
                spk.waktu_booking ||
                  (spk.tanggal_booking
                    ? `${spk.tanggal_booking}T${spk.jam_booking || '08:00'}:00`
                    : undefined)
              ) ||
              (spk.tanggal_booking
                ? `${spk.tanggal_booking}${spk.jam_booking ? ` • ${spk.jam_booking} WIB` : ''}`
                : '-')
            }
            rows={[
              { label: 'Unit', value: formatPlat(spk.no_polisi) },
              {
                label: 'Jadwal Kedatangan',
                value: spk.tanggal_booking
                  ? `${spk.tanggal_booking}${spk.jam_booking ? ` (${spk.jam_booking} WIB)` : ''}`
                  : '-',
              },
              ...(spk.jenis_layanan_booking || spk.jenis_layanan
                ? [{ label: 'Layanan', value: spk.jenis_layanan_booking || spk.jenis_layanan }]
                : []),
            ]}
          />
        )}

        {/* Step 1: Kendaraan Masuk di Pos Security */}
        <ServiceTimelineItem
          state={serviceTimeline.masuk}
          isLast={isLastStage('masuk')}
          title="Kendaraan Masuk di Pos Security"
          time={fmtWaktuFull(spk.waktu_check_in || spk.created_at) || '-'}
          rows={[
            { label: 'Petugas', value: 'Pos Security Master Truck' },
            ...(namaSupir ? [{ label: 'Supir', value: namaSupir }] : []),
            { label: 'No. Polisi', value: formatPlat(spk.no_polisi) },
          ]}
        />

        {/* Step 2: Penerimaan & Cek Awal oleh SA */}
        {serviceTimeline.penerimaan !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.penerimaan}
            isLast={isLastStage('penerimaan')}
            title="Penerimaan & Cek Awal oleh SA"
            time={fmtWaktuFull(spk.waktu_check_in || spk.created_at) || '-'}
            rows={[
              { label: 'Service Advisor', value: spk.nama_sa || '-' },
              {
                label: 'Status Penerimaan',
                value: (
                  <span
                    className={
                      serviceTimeline.penerimaan === 'done'
                        ? 'text-status-green'
                        : 'text-status-blue'
                    }
                  >
                    {serviceTimeline.penerimaan === 'done' ? 'Diterima' : 'Dalam Proses'}
                  </span>
                ),
              },
            ]}
          >
            {statusNote && <div className="font-semibold text-status-blue">{statusNote}</div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <div className="rounded-md bg-surface px-2 py-1 border border-border/50">
                <span className="text-ink-subtle block">Bodi</span>
                <span className="font-semibold text-ink">{spk.cek_body || 'Belum Diperiksa'}</span>
              </div>
              <div className="rounded-md bg-surface px-2 py-1 border border-border/50">
                <span className="text-ink-subtle block">Mesin</span>
                <span className="font-semibold text-ink">{spk.cek_mesin || 'Belum Diperiksa'}</span>
              </div>
              <div className="rounded-md bg-surface px-2 py-1 border border-border/50">
                <span className="text-ink-subtle block">Kelistrikan</span>
                <span className="font-semibold text-ink">
                  {spk.cek_kelistrikan || 'Belum Diperiksa'}
                </span>
              </div>
              <div className="rounded-md bg-surface px-2 py-1 border border-border/50">
                <span className="text-ink-subtle block">Kaki-kaki</span>
                <span className="font-semibold text-ink">
                  {spk.cek_kaki_kaki || 'Belum Diperiksa'}
                </span>
              </div>
            </div>
            <div>
              Keluhan:{' '}
              <span className="font-medium text-ink">
                "{spk.keluhan_customer || 'Perawatan berkala armada'}"
              </span>
            </div>
          </ServiceTimelineItem>
        )}

        {/* Step 3: Pengecekan Mekanik & Penerbitan WO */}
        {serviceTimeline.wo !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.wo}
            isLast={isLastStage('wo')}
            title="Pengecekan Mekanik & Penerbitan WO"
            time={
              spk.waktu_mulai_pekerjaan
                ? fmtWaktuFull(spk.waktu_mulai_pekerjaan)
                : spk.waktu_check_in
                ? fmtWaktuFull(spk.waktu_check_in)
                : '-'
            }
            rows={[
              { label: 'Foreman & SA', value: spk.nama_sa || '-' },
              {
                label: 'Status WO',
                value:
                  serviceTimeline.wo === 'done' ? (
                    <span className="text-status-green">Disetujui</span>
                  ) : serviceTimeline.wo === 'attention' ? (
                    <span className="text-status-amber">Menunggu Persetujuan Anda</span>
                  ) : (
                    <span className="text-status-blue">Sedang Dicek</span>
                  ),
              },
              { label: 'Teknisi Ditugaskan', value: spk.nama_mekanik || 'Teknisi' },
              ...(spk.mulai_inspeksi
                ? [{ label: 'Mulai Inspeksi', value: spk.mulai_inspeksi }]
                : []),
              ...(jenisPekerjaan
                ? [{ label: 'Kategori Pekerjaan', value: jenisPekerjaan }]
                : []),
            ]}
          />
        )}

        {/* Step 4: Pengerjaan Service Teknisi */}
        {serviceTimeline.pengerjaan !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.pengerjaan}
            isLast={isLastStage('pengerjaan')}
            title={
              serviceTimeline.pengerjaan === 'blocked'
                ? 'Menunggu Ketersediaan Sparepart'
                : serviceTimeline.pengerjaan === 'done'
                ? 'Pengerjaan Service Teknisi Selesai'
                : spk.status_spk === 'Estimasi Disetujui'
                ? 'WO Terbit — Siap Dikerjakan Mekanik'
                : 'Pengerjaan Sedang Dilakukan Mekanik'
            }
            time={
              spk.waktu_selesai_pekerjaan
                ? `Selesai ${fmtWaktuFull(spk.waktu_selesai_pekerjaan)}`
                : mulaiIso
                ? `Mulai ${fmtWaktuFull(mulaiIso)}`
                : 'Dijadwalkan di bay servis'
            }
            rows={[
              { label: 'Teknisi', value: teknisiText },
              ...(mulaiIso ? [{ label: 'Mulai Dikerjakan', value: fmtWaktuFull(mulaiIso) }] : []),
              ...(estimasiSelesai ? [{ label: 'Estimasi Selesai', value: estimasiSelesai }] : []),
              ...(durasiAktual ? [{ label: 'Durasi Aktual', value: durasiAktual }] : []),
              {
                label: 'Lingkup Pekerjaan',
                value: `${activePekerjaan.length} jasa perbaikan • ${activeParts.length} suku cadang`,
              },
            ]}
            children={
              keteranganEstimasi || produkBelumDipakai || jasaBelumDipakai ? (
                <>
                  {keteranganEstimasi && (
                    <div>
                      Catatan Penyesuaian:{' '}
                      <span className="font-medium text-ink">"{keteranganEstimasi}"</span>
                    </div>
                  )}
                  {produkBelumDipakai && (
                    <div>
                      Part Belum Dipakai:{' '}
                      <span className="font-medium text-ink">{produkBelumDipakai}</span>
                    </div>
                  )}
                  {jasaBelumDipakai && (
                    <div>
                      Jasa Belum Dipakai:{' '}
                      <span className="font-medium text-ink">{jasaBelumDipakai}</span>
                    </div>
                  )}
                </>
              ) : undefined
            }
          />
        )}

        {/* Step 5: Quality Control (QC) */}
        {serviceTimeline.qc !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.qc}
            isLast={isLastStage('qc')}
            title={
              serviceTimeline.qc === 'done'
                ? 'Quality Control (QC) Lulus'
                : 'Quality Control (QC) — Inspeksi Foreman'
            }
            time={
              fmtWaktuFull(spk.waktu_qc || spk.tanggal_qc || spk.waktu_selesai_pekerjaan) ||
              (serviceTimeline.qc === 'done' ? 'Selesai' : '-')
            }
            rows={[
              { label: 'Foreman', value: spk.nama_foreman || '-' },
              {
                label: 'Hasil Uji',
                value:
                  serviceTimeline.qc === 'done' ? (
                    <span className="text-status-green">QC PASSED</span>
                  ) : (
                    <span className="text-status-blue">Sedang Diuji</span>
                  ),
              },
              ...(spk.waktu_qc || spk.tanggal_qc || spk.tanggal_uji_jalan_fir
                ? [
                    {
                      label: 'Uji Jalan (FIR)',
                      value: fmtWaktuFull(
                        spk.waktu_qc || spk.tanggal_qc || spk.tanggal_uji_jalan_fir
                      ),
                    },
                  ]
                : []),
            ]}
          >
            {cleanText(spk.catatan_foreman) ? (
              <div>
                Catatan Foreman:{' '}
                <span className="font-medium text-ink">"{cleanText(spk.catatan_foreman)}"</span>
              </div>
            ) : undefined}
          </ServiceTimelineItem>
        )}

        {/* Step 6: FIR Closed — Final Check SA */}
        {serviceTimeline.fir !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.fir}
            isLast={isLastStage('fir')}
            title="FIR Closed — Final Check SA"
            time={
              fmtWaktuFull(
                spk.waktu_fir_closed ||
                  spk.waktu_qc ||
                  spk.tanggal_qc ||
                  spk.waktu_selesai_pekerjaan
              ) || (serviceTimeline.fir === 'done' ? 'Selesai' : '-')
            }
            rows={[
              { label: 'Service Advisor', value: spk.nama_sa || '-' },
              {
                label: 'Status FIR',
                value:
                  serviceTimeline.fir === 'done' ? (
                    <span className="text-status-green">Disetujui • Faktur Terbit</span>
                  ) : (
                    <span className="text-status-blue">Menunggu Final Check SA</span>
                  ),
              },
            ]}
          >
            {cleanText(spk.catatan_sa) ? (
              <div>
                Catatan SA:{' '}
                <span className="font-medium text-ink">"{cleanText(spk.catatan_sa)}"</span>
              </div>
            ) : undefined}
          </ServiceTimelineItem>
        )}

        {/* Step 7: Pembayaran */}
        {serviceTimeline.pembayaran !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.pembayaran}
            isLast={isLastStage('pembayaran')}
            title={serviceTimeline.pembayaran === 'done' ? 'Pembayaran Lunas' : 'Pembayaran'}
            time={
              fmtWaktuFull(
                activeInvoice?.tanggal_bayar ||
                  activeInvoice?.tanggal_invoice ||
                  spk.waktu_fir_closed
              ) || '-'
            }
            rows={[
              { label: 'Kasir & Keuangan', value: activeInvoice?.kasir_pic || '-' },
              ...(activeInvoice
                ? [
                    {
                      label: 'Metode Pembayaran',
                      value: activeInvoice.metode_pembayaran || 'Transfer',
                    },
                    {
                      label: 'Total Tagihan',
                      value: `Rp ${Number(activeInvoice.grand_total || 0).toLocaleString('id-ID')}`,
                    },
                  ]
                : [{ label: 'Status', value: 'Menunggu penerbitan invoice' }]),
            ]}
          />
        )}

        {/* Step 8: Kendaraan Keluar Bengkel */}
        {serviceTimeline.keluar !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.keluar}
            isLast={isLastStage('keluar')}
            title="Kendaraan Keluar Bengkel"
            time={fmtWaktuFull(spk.waktu_check_out) || '-'}
            rows={[
              { label: 'Petugas', value: 'Pos Security Master Truck' },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default ServiceActivityTimeline;
