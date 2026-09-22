import React from 'react';
import { SpkService, SpkItemPekerjaan, SpkItemPart } from '../../types';
import { Printer, X, FileText, CheckCircle2, Wrench } from 'lucide-react';

interface PrintSpkModalProps {
  spk: SpkService;
  pekerjaanList?: SpkItemPekerjaan[];
  partList?: SpkItemPart[];
  onClose: () => void;
}

export const PrintSpkModal: React.FC<PrintSpkModalProps> = ({ spk, pekerjaanList = [], partList = [], onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = spk.created_at
    ? new Date(spk.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs printable-container">
      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            <h3 className="font-black text-sm tracking-tight">Preview Surat Perintah Kerja (SPK) - Standar HVS A4</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable A4 Document Preview Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center flex-1">
          
          {/* Printable A4 Container */}
          <div
            id="printable-a4-document"
            className="bg-white p-8 sm:p-10 shadow-lg border border-slate-300 w-full max-w-[210mm] min-h-[297mm] text-slate-900 mx-auto select-text text-xs leading-relaxed"
          >
            {/* KOP SURAT RESMI */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
                    KIM3
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      PT. BENGKEL KIM 3 MEDAN
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-700">
                      Pusat Pelayanan Perawatan, Perbaikan Armada Truk &amp; Kendaraan Industri
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Jl. Pulau Bunyu, Kawasan Industri Medan III (KIM 3), Deli Serdang, Sumatera Utara
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Telp: (061) 8888-KIM3 / 0812-3456-7890 | Email: service@bengkelkim3.com
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono font-bold text-slate-500">DOKUMEN RESMI</div>
                  <div className="text-xs font-mono font-black text-blue-700">{spk.no_spk}</div>
                </div>
              </div>
              <div className="border-b border-slate-400 mt-2"></div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center my-3">
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
                SURAT PERINTAH KERJA (WORK ORDER)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dokumen Instruksi Resmi Teknisi Mekanik &amp; Lembar Kontrol Kualitas Bengkel KIM 3
              </p>
            </div>

            {/* IDENTITAS KENDARAAN & SPK (Tabel 2 Kolom) */}
            <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3.5 mb-4 bg-slate-50/50">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-28 text-slate-500">No. SPK</span>
                  <span className="font-bold text-slate-900 font-mono">: {spk.no_spk}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500">Tanggal Masuk</span>
                  <span className="font-semibold text-slate-800">: {formattedDate}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500">Estimasi Selesai</span>
                  <span className="font-semibold text-slate-800">: {spk.lead_time_jam ? `${spk.lead_time_jam} Jam Kerja` : '4 Jam Kerja'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500">Service Advisor</span>
                  <span className="font-semibold text-slate-800">: {spk.nama_sa || 'Budi Santoso'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-28 text-slate-500">No. Polisi</span>
                  <span className="font-black text-slate-900 text-sm">: {spk.no_polisi}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500">Customer / Armada</span>
                  <span className="font-semibold text-slate-800">: {spk.nama_customer || 'Pelanggan'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500">Odometer Saat Ini</span>
                  <span className="font-mono font-semibold text-slate-800">: {spk.odometer_km ? `${spk.odometer_km.toLocaleString('id-ID')} KM` : '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500">Mekanik Ditugaskan</span>
                  <span className="font-bold text-blue-700">: {spk.nama_mekanik || 'Andi Wijaya'}</span>
                </div>
              </div>
            </div>

            {/* KELUHAN & CATATAN AWAL */}
            <div className="border border-slate-300 rounded-xl p-3.5 mb-4 space-y-1">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                Keluhan Customer &amp; Analisis Awal SA:
              </div>
              <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200">
                "{spk.keluhan_customer || 'Perawatan berkala dan pemeriksaan sistem rem serta kelistrikan.'}"
              </p>
            </div>

            {/* TABEL INSTRUKSI PEKERJAAN MEKANIK */}
            <div className="mb-4">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>1. Rincian Instruksi Pekerjaan Mekanik</span>
                <span className="text-[10px] text-slate-500 font-normal">Centang kolom [ ✓ ] jika pengerjaan selesai</span>
              </div>
              <table className="w-full text-left border border-slate-300 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700">
                  <tr>
                    <th className="py-2 px-2.5 w-8 text-center font-bold">No</th>
                    <th className="py-2 px-3 font-bold">Uraian Pekerjaan / Jasa Servis</th>
                    <th className="py-2 px-3 font-bold w-24 text-center">Estimasi Jam</th>
                    <th className="py-2 px-3 font-bold w-20 text-center">Selesai</th>
                    <th className="py-2 px-3 font-bold w-24 text-center">Paraf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {pekerjaanList.length > 0 ? (
                    pekerjaanList.map((job, idx) => (
                      <tr key={job.id || idx}>
                        <td className="py-2 px-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium">{job.nama_pekerjaan}</td>
                        <td className="py-2 px-3 text-center">{job.estimasi_durasi_jam || 2} Jam</td>
                        <td className="py-2 px-3 text-center">
                          <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-300">______</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="py-2 px-2.5 text-center font-mono">1</td>
                        <td className="py-2 px-3 font-medium">Service Berkala &amp; Pengecekan Sistem Pelumasan</td>
                        <td className="py-2 px-3 text-center">1.5 Jam</td>
                        <td className="py-2 px-3 text-center"><div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div></td>
                        <td className="py-2 px-3 text-center text-slate-300">______</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 text-center font-mono">2</td>
                        <td className="py-2 px-3 font-medium">Overhaul / Pembongkaran &amp; Pembersihan Kampas Rem</td>
                        <td className="py-2 px-3 text-center">2.0 Jam</td>
                        <td className="py-2 px-3 text-center"><div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div></td>
                        <td className="py-2 px-3 text-center text-slate-300">______</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* TABEL PENGGANTIAN SPAREPART */}
            <div className="mb-4">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-1.5">
                2. Rincian Kebutuhan Sparepart &amp; Material
              </div>
              <table className="w-full text-left border border-slate-300 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700">
                  <tr>
                    <th className="py-2 px-2.5 w-8 text-center font-bold">No</th>
                    <th className="py-2 px-3 font-bold">Kode / Nama Sparepart</th>
                    <th className="py-2 px-3 font-bold w-16 text-center">Jumlah</th>
                    <th className="py-2 px-3 font-bold w-20 text-center">Satuan</th>
                    <th className="py-2 px-3 font-bold w-36 text-center">Ketersediaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {partList.length > 0 ? (
                    partList.map((part, idx) => (
                      <tr key={part.id || idx}>
                        <td className="py-2 px-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium">{part.nama_part}</td>
                        <td className="py-2 px-3 text-center font-bold">{part.jumlah}</td>
                        <td className="py-2 px-3 text-center">{part.satuan || 'Pcs'}</td>
                        <td className="py-2 px-3 text-center text-[10px] font-semibold">
                          {part.status_ketersediaan === 'Tidak Ready di Stock' ? (
                            <span className="text-purple-700 font-bold">PO Kotak Merah</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Ready di Gudang</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="py-2 px-2.5 text-center font-mono">1</td>
                        <td className="py-2 px-3 font-medium">Brake Pad Set Depan Truk Heavy Duty</td>
                        <td className="py-2 px-3 text-center font-bold">1</td>
                        <td className="py-2 px-3 text-center">Set</td>
                        <td className="py-2 px-3 text-center text-emerald-700 font-bold text-[10px]">Ready di Gudang</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 text-center font-mono">2</td>
                        <td className="py-2 px-3 font-medium">Oli Mesin Diesel 15W-40 (Drum)</td>
                        <td className="py-2 px-3 text-center font-bold">12</td>
                        <td className="py-2 px-3 text-center">Liter</td>
                        <td className="py-2 px-3 text-center text-emerald-700 font-bold text-[10px]">Ready di Gudang</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* CATATAN FOREMAN & K3 */}
            <div className="border border-slate-300 rounded-xl p-3 mb-6 bg-slate-50 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Catatan Keselamatan Kerja &amp; Instruksi Foreman:</span> Wajib gunakan kacamata pelindung dan sarung tangan saat membongkar sistem rem. Bila ditemukan kerusakan lain di luar SPK ini, segera laporkan ke Foreman untuk diajukan form Pekerjaan Tambahan.
            </div>

            {/* 4 KOLOM TANDA TANGAN */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] pt-2 border-t border-slate-300 avoid-break">
              <div>
                <div className="text-slate-500 font-semibold mb-12">Service Advisor (SA)</div>
                <div className="font-bold text-slate-900 underline">{spk.nama_sa || 'Budi Santoso'}</div>
                <div className="text-[10px] text-slate-400">Penerima &amp; Estimator</div>
              </div>

              <div>
                <div className="text-slate-500 font-semibold mb-12">Foreman / QC</div>
                <div className="font-bold text-slate-900 underline">{spk.nama_foreman || 'Joko Susilo'}</div>
                <div className="text-[10px] text-slate-400">Supervisor &amp; Pengawas</div>
              </div>

              <div>
                <div className="text-slate-500 font-semibold mb-12">Mekanik Pelaksana</div>
                <div className="font-bold text-slate-900 underline">{spk.nama_mekanik || 'Andi Wijaya'}</div>
                <div className="text-[10px] text-slate-400">Teknisi Pengerjaan</div>
              </div>

              <div>
                <div className="text-slate-500 font-semibold mb-12">Driver / Customer</div>
                <div className="font-bold text-slate-900 underline">( ............................ )</div>
                <div className="text-[10px] text-slate-400">Pemberi Kuasa Servis</div>
              </div>
            </div>

          </div>

        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 no-print shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Standar Cetak HVS A4 Resmi Siap Cetak
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak SPK (A4)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintSpkModal;
