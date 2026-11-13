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
import { spkStatusLabel } from '../../utils/statusLabel';
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

interface ServiceTimelineItemProps {
  state: ServiceStageState;
  isLast?: boolean;
  title: string;
  time: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}

const ServiceTimelineItem: React.FC<ServiceTimelineItemProps> = ({
  state,
  isLast,
  title,
  time,
  meta,
  children,
}) => {
  const tone = TIMELINE_TONE[state];
  return (
    <div className="relative space-y-1">
      {/* Rel progres: hanya tersambung hijau setelah tahap yang sudah selesai */}
      {!isLast && state === 'done' && (
        <span
          aria-hidden="true"
          className="absolute -left-[18px] top-4 -bottom-4 w-[2px] rounded-full bg-status-green"
        />
      )}
      <span
        aria-hidden="true"
        className={`absolute -left-[24px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ${tone.dot}`}
        title={tone.label}
      >
        {state === 'done' && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-bold text-ink">{title}</span>
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${tone.chip}`}>
          {tone.label}
        </span>
      </div>
      <div className="text-xs font-semibold text-accent">{time}</div>
      {meta && <div className="text-xs text-ink-muted">{meta}</div>}
      {children && (
        <div className="text-xs text-ink/80 bg-surface/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-border/60 leading-relaxed space-y-1">
          {children}
        </div>
      )}
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

/**
 * Satu-satunya implementasi timeline Riwayat Aktivitas Service.
 * Dipakai oleh detail SPK maupun detail check-in gerbang (sebelum WO terbit).
 */
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
  const candidates: Array<[string | null | undefined, string | null | undefined]> = [
    [spk.estimasi_selesai_ta, null],
    [spk.estimasi_selesai_t3, spk.jam_estimasi_selesai_t3],
    [spk.estimasi_selesai_t2, spk.jam_estimasi_selesai_t2],
    [spk.estimasi_selesai_t1, spk.jam_estimasi_selesai_t1],
    [spk.estimasi_selesai_awal, spk.jam_estimasi_selesai_awal],
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

  return (
    <div
      className={`space-y-3 p-4 rounded-2xl border border-border bg-gradient-to-b from-[#F8FAFF] to-surface-raised dark:from-slate-800/40 dark:to-transparent ${className || ''}`}
    >
      <span className="font-black text-ink flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center shadow-2xs shrink-0">
          <Clock className="w-3.5 h-3.5" />
        </span>
        Timeline Riwayat Aktivitas Service:
      </span>
      <div className="space-y-4 relative pl-4 border-l-2 border-border ml-2">
        {/* Step Booking: hanya tampil bila servis ini berasal dari Booking Service */}
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
            meta={
              <>
                No. Booking:{' '}
                <span className="font-mono font-semibold text-ink">
                  {spk.no_booking || (spk.booking_id ? `#${spk.booking_id}` : '-')}
                </span>
                {spk.tanggal_booking && (
                  <>
                    {' '}
                    | Jadwal Kedatangan:{' '}
                    <span className="font-medium text-ink">
                      {spk.tanggal_booking}
                      {spk.jam_booking ? ` (${spk.jam_booking} WIB)` : ''}
                    </span>
                  </>
                )}
              </>
            }
          >
            <div>
              Unit <span className="font-semibold text-ink">{formatPlat(spk.no_polisi)}</span> telah didaftarkan melalui layanan Booking Service sebelum kedatangan ke bengkel.
            </div>
            {(spk.jenis_layanan_booking || spk.jenis_layanan) && (
              <div className="text-ink-muted">
                Layanan Dibooking:{' '}
                <span className="font-medium text-ink">
                  {spk.jenis_layanan_booking || spk.jenis_layanan}
                </span>
              </div>
            )}
          </ServiceTimelineItem>
        )}

        {/* Step 1: Kendaraan Masuk di Pos Security */}
        <ServiceTimelineItem
          state={serviceTimeline.masuk}
          isLast={isLastStage('masuk')}
          title="Kendaraan Masuk di Pos Security"
          time={fmtWaktuFull(spk.waktu_check_in || spk.created_at) || '-'}
          meta={
            <>
              Petugas: <strong className="font-bold text-ink">Pos Security Master Truck</strong>
              {spk.nama_supir && spk.nama_supir.trim() !== '' && spk.nama_supir.trim() !== '-' && (
                <> | Supir: <strong className="font-bold text-ink">{spk.nama_supir.trim()}</strong></>
              )}
            </>
          }
        >
          Kendaraan tiba di area gerbang Master Truck. Petugas security melakukan pemeriksaan kedatangan, validasi nomor polisi ({formatPlat(spk.no_polisi)}), dan pencatatan tiket masuk armada.
        </ServiceTimelineItem>

        {/* Step 2: Penerimaan & Cek Awal oleh SA */}
        {serviceTimeline.penerimaan !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.penerimaan}
            isLast={isLastStage('penerimaan')}
            title="Penerimaan & Cek Awal oleh SA"
            time={(() => {
              const tIn = spk.waktu_check_in ? new Date(spk.waktu_check_in).getTime() : NaN;
              const tCr = spk.created_at ? new Date(spk.created_at).getTime() : NaN;
              // Penerimaan SA tidak mungkin terjadi sebelum kendaraan masuk gerbang.
              const t = !isNaN(tIn) && (isNaN(tCr) || tIn > tCr) ? spk.waktu_check_in : spk.created_at;
              return fmtWaktuFull(t || spk.waktu_check_in) || '-';
            })()}
            meta={
              <>
                SA: <strong className="font-bold text-ink">{spk.nama_sa || '-'}</strong> | Odometer: <span className="font-semibold text-ink">{spk.odometer_km ? `${spk.odometer_km.toLocaleString('id-ID')} KM` : '-'}</span>
              </>
            }
          >
            {statusNote && (
              <div className="font-semibold text-status-blue">{statusNote}</div>
            )}
            <div>
              Pemeriksaan fisik awal (Walk-around check 4 titik): Bodi [{spk.cek_body || 'Belum Diperiksa'}], Mesin [{spk.cek_mesin || 'Belum Diperiksa'}], Kelistrikan [{spk.cek_kelistrikan || 'Belum Diperiksa'}], Kaki-kaki [{spk.cek_kaki_kaki || 'Belum Diperiksa'}].
            </div>
            <div className="text-ink-muted">
              Keluhan: <span className="font-medium text-ink">"{spk.keluhan_customer || 'Perawatan berkala armada'}"</span>
            </div>
          </ServiceTimelineItem>
        )}

        {/* Step 3: Pengecekan Mekanik & Penerbitan WO (SOP Langkah 4-6) */}
        {serviceTimeline.wo !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.wo}
            isLast={isLastStage('wo')}
            title="Pengecekan Mekanik & Penerbitan WO"
            time={spk.waktu_mulai_pekerjaan ? fmtWaktuFull(spk.waktu_mulai_pekerjaan) : (spk.waktu_check_in ? fmtWaktuFull(spk.waktu_check_in) : '-')}
            meta={
              <>
                Foreman & SA: <strong className="font-bold text-ink">{spk.nama_sa || '-'}</strong> | Status WO:{' '}
                {serviceTimeline.wo === 'done' ? (
                  <span className="font-semibold text-status-green">Disetujui</span>
                ) : serviceTimeline.wo === 'attention' ? (
                  <span className="font-semibold text-status-amber">Menunggu Persetujuan Anda</span>
                ) : (
                  <span className="font-semibold text-status-blue">Sedang Dicek</span>
                )}
                {spk.mulai_inspeksi ? (
                  <> | Mulai Inspeksi: <span className="font-semibold text-ink">{spk.mulai_inspeksi}</span></>
                ) : null}
                {spk.jenis_pekerjaan && spk.jenis_pekerjaan.trim() !== '' && spk.jenis_pekerjaan.trim() !== '-' ? (
                  <> | Kategori: <span className="font-semibold text-ink">{spk.jenis_pekerjaan.trim()}</span></>
                ) : null}
              </>
            }
          >
            <div>
              Foreman mendistribusikan penanganan ke teknisi <strong className="font-bold text-ink">{spk.nama_mekanik || 'Teknisi'}</strong> untuk inspeksi detail di stall servis.
            </div>
            <div className="text-ink-muted">
              {serviceTimeline.wo === 'done'
                ? 'Estimasi biaya dan durasi pengerjaan disetujui. Suku cadang diverifikasi siap pasang di gudang, dan Surat Perintah Kerja'
                : serviceTimeline.wo === 'attention'
                ? 'Estimasi biaya dan durasi sudah diajukan. Surat Perintah Kerja'
                : 'Pengecekan kondisi unit dan penyusunan estimasi sedang berlangsung. Surat Perintah Kerja'}{' '}
              (WO No. <span className="font-mono font-medium text-ink">{spk.no_wo || spk.no_spk}</span>)
              {serviceTimeline.wo === 'done' ? ' resmi diterbitkan.' : ' akan diterbitkan setelah Anda menyetujui estimasi.'}
            </div>
          </ServiceTimelineItem>
        )}

        {/* Step 4: Pengerjaan Service Teknisi (SOP Langkah 7-10) */}
        {serviceTimeline.pengerjaan !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.pengerjaan}
            isLast={isLastStage('pengerjaan')}
            title={
              serviceTimeline.pengerjaan === 'blocked'
                ? 'Menunggu Ketersediaan Sparepart (Pengerjaan Ditunda)'
                : serviceTimeline.pengerjaan === 'done'
                ? 'Pengerjaan Service Teknisi Selesai'
                : spk.status_spk === 'Estimasi Disetujui'
                ? 'WO Terbit — Siap Dikerjakan Mekanik'
                : 'Pengerjaan Sedang Dilakukan oleh Mekanik'
            }
            time={(() => {
              const mulaiIso = getMulaiDikerjakanIso(spk);
              if (spk.waktu_selesai_pekerjaan) {
                return <>Selesai {fmtWaktuFull(spk.waktu_selesai_pekerjaan)}</>;
              }
              if (mulaiIso) {
                return <>Mulai pengerjaan: {fmtWaktuFull(mulaiIso)}</>;
              }
              return <>Dijadwalkan di bay servis</>;
            })()}
            meta={
              (() => {
                const mekanikList = (spk.semua_mekanik || spk.nama_mekanik || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                const teknisiText =
                  mekanikList.length > 1
                    ? mekanikList.map((m, idx) => `Mekanik ${idx + 1}: ${m}`).join(', ')
                    : mekanikList[0] || '-';
                const mulaiIso = getMulaiDikerjakanIso(spk);
                const estimasiSelesai = getEstimasiSelesaiLabel(spk);
                const durasiAktual = getDurasiAktual(spk);
                return (
                  <>
                    Teknisi: <strong className="font-bold text-ink">{teknisiText}</strong>
                    {mulaiIso && (
                      <>
                        {' '}| Mulai Dikerjakan:{' '}
                        <span className="font-semibold text-ink">{fmtWaktuFull(mulaiIso)}</span>
                      </>
                    )}
                    {estimasiSelesai && (
                      <>
                        {' '}| Estimasi Selesai:{' '}
                        <span className="font-semibold text-ink">{estimasiSelesai}</span>
                      </>
                    )}
                    {durasiAktual && (
                      <>
                        {' '}| Durasi Aktual:{' '}
                        <span className="font-semibold text-ink">{durasiAktual}</span>
                      </>
                    )}
                  </>
                );
              })()
            }
          >
            <div>
              {(() => {
                const jc = activePekerjaan.length;
                const pc = activeParts.length;
                const jText = jc > 0 ? `${jc} jasa perbaikan` : 'pekerjaan servis';
                const pText = pc > 0 ? `${pc} item suku cadang` : 'pemeriksaan komponen';
                if (spk.status_spk === 'Waiting Part') {
                  return `Pengerjaan di stall servis ditunda sementara menunggu ketersediaan komponen/sparepart (${pc} part dibutuhkan).`;
                }
                if (spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai' || spk.status_spk === 'Siap Keluar' || spk.status_spk === 'Waiting QC') {
                  return `Teknisi telah menyelesaikan seluruh instruksi pengerjaan pada unit (${jText} dan ${pText}). Unit diserahkan untuk inspeksi pengujian mutu.`;
                }
                if (spk.waktu_mulai_pekerjaan) {
                  return `Teknisi sedang aktif melakukan tindakan perbaikan dan perawatan unit di stall servis (${jText}, ${pText}).`;
                }
                return `Unit telah didaftarkan dan dijadwalkan untuk penanganan oleh teknisi di stall servis bengkel.`;
              })()}
            </div>

            {spk.keterangan_estimasi && (
              <div className="pt-2 border-t border-border/60 text-[11px] text-ink-muted italic">
                Catatan Penyesuaian: <span className="font-medium text-ink not-italic">"{spk.keterangan_estimasi}"</span>
              </div>
            )}
            {((spk.produk_belum_dipakai && spk.produk_belum_dipakai.trim() !== '' && spk.produk_belum_dipakai.trim() !== '-') ||
              (spk.jasa_belum_dipakai && spk.jasa_belum_dipakai.trim() !== '' && spk.jasa_belum_dipakai.trim() !== '-')) && (
              <div className="pt-2 border-t border-border/60 text-[11px] text-ink-muted space-y-0.5">
                {spk.produk_belum_dipakai && spk.produk_belum_dipakai.trim() !== '' && spk.produk_belum_dipakai.trim() !== '-' && (
                  <div>
                    Part Belum Dipakai: <span className="font-medium text-ink">{spk.produk_belum_dipakai}</span>
                  </div>
                )}
                {spk.jasa_belum_dipakai && spk.jasa_belum_dipakai.trim() !== '' && spk.jasa_belum_dipakai.trim() !== '-' && (
                  <div>
                    Jasa Belum Dipakai: <span className="font-medium text-ink">{spk.jasa_belum_dipakai}</span>
                  </div>
                )}
              </div>
            )}
          </ServiceTimelineItem>
        )}

        {/* Step 5: Quality Control (QC) */}
        {serviceTimeline.qc !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.qc}
            isLast={isLastStage('qc')}
            title={serviceTimeline.qc === 'done' ? 'Quality Control (QC) Lulus' : 'Quality Control (QC) — Inspeksi Foreman'}
            time={fmtWaktuFull(spk.waktu_qc || spk.tanggal_qc || spk.waktu_selesai_pekerjaan) || (serviceTimeline.qc === 'done' ? 'Selesai (Otomatis Bersama WO)' : '-')}
            meta={
              <>
                Foreman: <strong className="font-bold text-ink">{spk.nama_foreman || '-'}</strong> | Hasil Uji:{' '}
                {serviceTimeline.qc === 'done' ? (
                  <span className="font-semibold text-status-green">QC PASSED</span>
                ) : (
                  <span className="font-semibold text-status-blue">Sedang diuji</span>
                )}
                {(spk.waktu_qc || spk.tanggal_qc || spk.tanggal_uji_jalan_fir) ? (
                  <> | Uji Jalan (FIR): <span className="font-semibold text-ink">{fmtWaktuFull(spk.waktu_qc || spk.tanggal_qc || spk.tanggal_uji_jalan_fir)}</span></>
                ) : null}
              </>
            }
          >
            {spk.catatan_foreman || null}
          </ServiceTimelineItem>
        )}

        {/* Step 6: FIR Closed — Final Check SA */}
        {serviceTimeline.fir !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.fir}
            isLast={isLastStage('fir')}
            title="FIR Closed — Final Check SA"
            time={fmtWaktuFull(spk.waktu_fir_closed || spk.waktu_qc || spk.tanggal_qc || spk.waktu_selesai_pekerjaan) || (serviceTimeline.fir === 'done' ? 'Selesai (Otomatis Bersama WO)' : '-')}
            meta={
              <>
                SA: <strong className="font-bold text-ink">{spk.nama_sa || '-'}</strong> | Dokumen: Faktur Servis
              </>
            }
          >
            {serviceTimeline.fir === 'done' ? (
              <>{spk.catatan_sa ? `${spk.catatan_sa}. ` : ''}Pemeriksaan akhir (Final Inspection Report) disetujui Service Advisor dan faktur servis diterbitkan.</>
            ) : (
              <>Menunggu pemeriksaan akhir (Final Inspection Report) oleh Service Advisor sebelum faktur servis diterbitkan.</>
            )}
          </ServiceTimelineItem>
        )}

        {/* Step 7: Pembayaran */}
        {serviceTimeline.pembayaran !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.pembayaran}
            isLast={isLastStage('pembayaran')}
            title={serviceTimeline.pembayaran === 'done' ? 'Pembayaran Lunas' : 'Pembayaran'}
            time={fmtWaktuFull(activeInvoice?.tanggal_bayar || activeInvoice?.tanggal_invoice || spk.waktu_fir_closed) || '-'}
            meta={
              <>
                Kasir & Keuangan: <strong className="font-bold text-ink">{activeInvoice?.kasir_pic || '-'}</strong>
                {activeInvoice ? <> | Metode: {activeInvoice.metode_pembayaran || 'Transfer'}</> : null}
              </>
            }
          >
            {activeInvoice ? (
              <>
                Invoice No. {activeInvoice.no_invoice} senilai Rp {Number(activeInvoice.grand_total || 0).toLocaleString('id-ID')}{' '}
                {serviceTimeline.pembayaran === 'done' ? 'telah diselesaikan lunas.' : 'menunggu pembayaran.'}
              </>
            ) : (
              <>Menunggu penerbitan invoice oleh kasir bengkel.</>
            )}
          </ServiceTimelineItem>
        )}

        {/* Step 8: Kendaraan Keluar Bengkel */}
        {serviceTimeline.keluar !== 'pending' && (
          <ServiceTimelineItem
            state={serviceTimeline.keluar}
            isLast={isLastStage('keluar')}
            title="Kendaraan Keluar Bengkel"
            time={fmtWaktuFull(spk.waktu_check_out) || '-'}
            meta={
              serviceTimeline.keluar === 'done' ? (
                <>Petugas: <strong className="font-bold text-ink">Pos Security Master Truck</strong> | Gate Pass: Valid</>
              ) : (
                <>Petugas: <strong className="font-bold text-ink">Pos Security Master Truck</strong> | Gate Pass: Menunggu Verifikasi</>
              )
            }
          >
            {serviceTimeline.keluar === 'done' ? (
              spk.sumber === 'kunjungan' ? (
                <>Verifikasi Gate Pass / Memo Keluar di Pos Security Master Truck selesai. Kendaraan telah resmi checkout dan meninggalkan area bengkel (tanpa pengerjaan servis bengkel).</>
              ) : (
                <>Verifikasi Gate Pass / Memo Keluar di Pos Security Master Truck selesai. Kendaraan telah resmi checkout dan meninggalkan area bengkel.</>
              )
            ) : (
              <>Kendaraan menunggu diverifikasi dan dicatat keluar oleh Pos Security Master Truck.</>
            )}
          </ServiceTimelineItem>
        )}
      </div>
    </div>
  );
};

export default ServiceActivityTimeline;
