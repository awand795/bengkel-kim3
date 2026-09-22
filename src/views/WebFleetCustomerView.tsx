import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { Kendaraan, BookingService } from '../types';
import { useAppStore } from '../store/useAppStore';
import { realtimeHub } from '../services/realtimeService';
import { 
  Truck, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Download, 
  Plus, 
  ShieldCheck, 
  Building, 
  Phone, 
  Mail, 
  User, 
  ArrowRight,
  Search,
  ChevronRight,
  Wrench,
  AlertCircle,
  XCircle,
  X
} from 'lucide-react';

interface WebFleetCustomerViewProps {
  initialMenu?: 'dashboard' | 'booking' | 'status' | 'history' | 'kendaraan' | 'dokumen' | 'profil';
}

export const WebFleetCustomerView: React.FC<WebFleetCustomerViewProps> = ({ initialMenu }) => {
  const queryClient = useQueryClient();
  const { setActiveTab } = useAppStore();
  const [fleetMenu, setFleetMenu] = useState<'dashboard' | 'booking' | 'status' | 'history' | 'kendaraan' | 'dokumen' | 'profil'>(
    initialMenu || 'dashboard'
  );

  React.useEffect(() => {
    if (initialMenu) {
      setFleetMenu(initialMenu);
    }
  }, [initialMenu]);

  // Booking Wizard Step (image5.png Mockup 1)
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [bookingForm, setBookingForm] = useState({
    no_polisi: 'BK 5678 CD',
    jenis_layanan: 'Service Berkala (Ganti Oli & Filter)',
    tanggal_booking: new Date().toISOString().slice(0, 10),
    jam_booking: '09:00',
    keluhan: 'Rem bunyi saat pengereman dan tarikan mesin agak berat.',
    catatan: 'Harap dicek juga filter solar dan tekanan angin ban.',
  });

  // Queries
  const { data: kendaraanList } = useQuery({
    queryKey: ['kendaraan-list'],
    queryFn: api.getKendaraan,
  });

  const { data: bookingList } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
  });

  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: dokumenList } = useQuery({
    queryKey: ['dokumen-list'],
    queryFn: api.getDokumen,
  });

  const { data: tambahanList } = useQuery({
    queryKey: ['tambahan-pekerjaan'],
    queryFn: api.getTambahanPekerjaan,
    refetchInterval: 10000,
  });

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 8000,
  });

  // Active SPK being monitored
  const activeTrackSpk = spkList?.[0];

  // Active PR untuk SPK yang sedang dimonitor
  const activePr = purchasingList?.find(
    (p) => p.id_spk === activeTrackSpk?.id || p.no_polisi === activeTrackSpk?.no_polisi
  );

  // Pekerjaan tambahan yang masih menunggu persetujuan customer untuk SPK aktif
  const approvalTambahanList = (tambahanList || []).filter(
    (t) =>
      t.status_approval_customer === 'Menunggu Approval' &&
      (!activeTrackSpk || t.id_spk === activeTrackSpk.id)
  );

  // Approval Mutation (Setujui / Tolak pekerjaan tambahan)
  const approvalTambahanMutation = useMutation({
    mutationFn: (payload: { id: number; status_approval_customer: 'Disetujui' | 'Ditolak' }) =>
      api.approvalCustomer(payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tambahan-pekerjaan'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      alert(
        variables.status_approval_customer === 'Disetujui'
          ? 'Pekerjaan tambahan DISETUJUI. Mekanik akan melanjutkan pengerjaan.'
          : 'Pekerjaan tambahan DITOLAK. Bengkel akan melanjutkan sesuai SPK awal.'
      );
    },
    onError: (err: any) => alert('Gagal mengirim keputusan approval: ' + (err?.message || 'Coba lagi.')),
  });

  // Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const bookNo = `BK${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      return api.tambahBooking({
        no_booking: bookNo,
        id_pelanggan: 1,
        no_polisi: bookingForm.no_polisi,
        jenis_layanan: bookingForm.jenis_layanan,
        tanggal_booking: bookingForm.tanggal_booking,
        jam_booking: bookingForm.jam_booking,
        keluhan: bookingForm.keluhan,
        catatan: bookingForm.catatan,
        prioritas: 'Prioritas Booking',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-list'] });
      realtimeHub.publish({
        type: 'BOOKING_CREATED',
        targetRoles: ['SA', 'Security'],
        title: 'Booking Baru Diterima',
        message: `Customer telah membuat booking service nopol ${bookingForm.no_polisi} (${bookingForm.jenis_layanan}) untuk ${bookingForm.tanggal_booking} jam ${bookingForm.jam_booking}.`,
        linkTab: 'security-booking',
        urgency: 'info',
      });
      alert('Booking Service Berhasil Dibuat! Jadwal otomatis masuk ke sistem bengkel prioritas.');
      setBookingStep(1);
      setFleetMenu('history');
    },
  });

  // Tambah Armada State & Mutation
  const [openTambahArmadaModal, setOpenTambahArmadaModal] = useState(false);
  const [armadaForm, setArmadaForm] = useState({
    no_polisi: '',
    jenis_armada: 'Truk',
    merk: 'Hino',
    model: 'Dutro 130HD',
    tahun: new Date().getFullYear(),
    nama_pemilik: 'PT. Andi Jaya',
    no_rangka: '',
    no_mesin: '',
    asuransi: 'Asuransi Astra',
    masa_berlaku_asuransi: '',
  });

  const tambahArmadaMutation = useMutation({
    mutationFn: async (data: typeof armadaForm) => {
      return api.tambahKendaraan({
        no_polisi: data.no_polisi.trim().toUpperCase(),
        jenis_armada: data.jenis_armada as any,
        merk: data.merk,
        model: data.model,
        tahun: Number(data.tahun) || new Date().getFullYear(),
        nama_pemilik: data.nama_pemilik,
        no_rangka: data.no_rangka,
        no_mesin: data.no_mesin,
        asuransi: data.asuransi,
        masa_berlaku_asuransi: data.masa_berlaku_asuransi || undefined,
        id_pelanggan: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kendaraan-list'] });
      alert('Unit armada berhasil ditambahkan ke sistem Bengkel KIM 3!');
      setOpenTambahArmadaModal(false);
      setArmadaForm({
        no_polisi: '',
        jenis_armada: 'Truk',
        merk: 'Hino',
        model: 'Dutro 130HD',
        tahun: new Date().getFullYear(),
        nama_pemilik: 'PT. Andi Jaya',
        no_rangka: '',
        no_mesin: '',
        asuransi: 'Asuransi Astra',
        masa_berlaku_asuransi: '',
      });
    },
    onError: (err: any) => alert('Gagal menambahkan unit armada: ' + (err?.message || 'Periksa kembali data Anda.')),
  });

  // Tambah Dokumen State & Mutation
  const [openTambahDokumenModal, setOpenTambahDokumenModal] = useState(false);
  const [dokumenForm, setDokumenForm] = useState({
    no_polisi: '',
    nama_dokumen: '',
    jenis_dokumen: 'STNK',
    masa_berlaku: '',
    keterangan: '',
    file_url: 'https://bengkelkim3.com/dokumen/sample-doc.pdf',
  });

  const tambahDokumenMutation = useMutation({
    mutationFn: async (data: typeof dokumenForm) => {
      return api.tambahDokumen({
        no_polisi: data.no_polisi,
        nama_dokumen: data.nama_dokumen,
        jenis_dokumen: data.jenis_dokumen as any,
        masa_berlaku: data.masa_berlaku || undefined,
        keterangan: data.keterangan,
        file_url: data.file_url,
        id_pelanggan: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dokumen-list'] });
      alert('Dokumen digital armada berhasil disimpan!');
      setOpenTambahDokumenModal(false);
      setDokumenForm({
        no_polisi: '',
        nama_dokumen: '',
        jenis_dokumen: 'STNK',
        masa_berlaku: '',
        keterangan: '',
        file_url: 'https://bengkelkim3.com/dokumen/sample-doc.pdf',
      });
    },
    onError: (err: any) => alert('Gagal mengunggah dokumen: ' + (err?.message || 'Periksa kembali data Anda.')),
  });

  return (
    <div className="space-y-6">
      
      {/* MENU 0: DASHBOARD RINGKASAN ARMADA */}
      {fleetMenu === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold mb-2">
                <Truck className="w-3.5 h-3.5 text-blue-300" />
                Portal Monitoring Fleet KIM 3 Medan
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Selamat Datang, PT. Andi Jaya</h1>
              <p className="text-xs text-blue-200 mt-1 max-w-xl leading-relaxed">
                Pantau status perbaikan armada, jadwalkan booking perawatan berkala, serta kelola dokumen perizinan STNK & KIR secara realtime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFleetMenu('booking');
                  setActiveTab('fleet-booking');
                }}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Booking Service
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Armada Truk</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{kendaraanList?.length || 0}</span>
                <span className="text-[11px] text-slate-400 ml-2 font-medium">Unit Terdaftar</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sedang Diservis</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-amber-600">
                  {spkList?.filter(s => s.status_spk !== 'Selesai').length || 0}
                </span>
                <span className="text-[11px] text-slate-400 ml-2 font-medium">Di Bengkel KIM 3</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Booking Terjadwal</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-emerald-600">
                  {bookingList?.length || 0}
                </span>
                <span className="text-[11px] text-slate-400 ml-2 font-medium">Antrian Masuk</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Dokumen Digital</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{dokumenList?.length || 0}</span>
                <span className="text-[11px] text-slate-400 ml-2 font-medium">STNK & KIR</span>
              </div>
            </div>
          </div>

          {/* Active Unit Live Tracker Highlight */}
          {activeTrackSpk ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">{activeTrackSpk.no_polisi}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold animate-pulse">
                        Sedang Dikerjakan
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">{activeTrackSpk.no_spk} • {activeTrackSpk.keluhan_customer}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFleetMenu('status');
                    setActiveTab('fleet-status');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  Lihat Detail Tracker <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Status SPK:</span>
                  <span className="font-bold text-slate-800">{activeTrackSpk.status_spk}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Estimasi Lead Time:</span>
                  <span className="font-bold text-blue-700">{activeTrackSpk.lead_time_jam || 6} Jam Pengerjaan</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Estimasi Biaya:</span>
                  <span className="font-bold text-emerald-700">Rp {Number(activeTrackSpk.estimasi_biaya || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Semua Unit Armada Beroperasi Prima</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Saat ini tidak ada unit armada Anda yang sedang menginap atau diservis di bengkel KIM 3.
              </p>
            </div>
          )}

          {/* Quick Previews: Jadwal Booking & Unit Terdaftar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Bookings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Jadwal Booking Terdekat
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setFleetMenu('booking');
                    setActiveTab('fleet-booking');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  + Buat Baru
                </button>
              </div>

              {bookingList && bookingList.length > 0 ? (
                <div className="space-y-2.5">
                  {bookingList.slice(0, 3).map((b) => (
                    <div key={b.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-xs">{b.no_polisi}</span>
                        <p className="text-[11px] text-slate-500">{b.jenis_layanan}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-semibold text-blue-700 block">
                          {b.tanggal_booking} {b.jam_booking}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada booking service terjadwal.</p>
              )}
            </div>

            {/* Quick Fleet Units */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" /> Armada Truk Anda
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setFleetMenu('kendaraan');
                    setActiveTab('fleet-kendaraan');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Lihat Semua
                </button>
              </div>

              {kendaraanList && kendaraanList.length > 0 ? (
                <div className="space-y-2.5">
                  {kendaraanList.slice(0, 3).map((k) => (
                    <div key={k.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-xs">{k.no_polisi}</span>
                        <p className="text-[11px] text-slate-500">{k.merk} {k.model} • {k.jenis_armada}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada armada terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Status if no active SPK */}
      {fleetMenu === 'status' && !activeTrackSpk && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Tidak Ada Servis Berjalan</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Saat ini tidak ada unit armada PT. Andi Jaya yang sedang dalam proses pengerjaan di Bengkel KIM 3 Medan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFleetMenu('booking');
              setActiveTab('fleet-booking');
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Jadwalkan Booking Service
          </button>
        </div>
      )}

      {/* MENU 1: STATUS SERVICE REALTIME TRACKER (image5.png Mockup 2) */}
      {fleetMenu === 'status' && activeTrackSpk && (
        <div className="space-y-6">
          
          {/* Active Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">
                  🚚
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{activeTrackSpk.no_polisi}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Service Berjalan</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">{activeTrackSpk.nama_customer || 'PT. Andi Jaya'} | {activeTrackSpk.no_spk}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[10px]">Layanan:</span>
                  <span className="text-slate-800">Service Berkala & Rem</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Waktu Check In:</span>
                  <span className="text-slate-800">09:00 WIB</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Estimasi Selesai (ETA):</span>
                  <span className="text-blue-700 font-bold">15:00 WIB ({activeTrackSpk.lead_time_jam || 6} Jam)</span>
                </div>
              </div>
            </div>

            {/* Banner Menunggu Part / Pending (Kotak 6 & 9 Excel, Memo Poin 4 & 5) */}
            {activeTrackSpk.status_spk === 'Waiting Part' && (
              <div className="mt-4 p-4 sm:p-5 rounded-2xl border-2 border-purple-300 bg-purple-50/90 text-purple-900 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-lg shrink-0">
                    📦
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-purple-950">
                        Status Kendaraan: Menunggu Ketersediaan Sparepart (Pending)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 text-[10px] font-black animate-pulse">
                        Waiting Part
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-700 font-semibold">
                      Pengadaan suku cadang resmi sedang diproses oleh Tim Purchasing Bengkel KIM 3 (Alur Kotak Merah).
                    </span>
                  </div>
                </div>

                <p className="text-xs text-purple-900/90 leading-relaxed font-medium">
                  Pekerjaan perbaikan armada Anda sementara dijeda karena memerlukan suku cadang yang sedang dalam proses pengadaan vendor distributor. Estimasi waktu selesai akan diperbarui secara otomatis saat barang telah ready di bengkel.
                </p>

                {activePr && (
                  <div className="mt-2 pt-2 border-t border-purple-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                      <span className="text-[10px] text-slate-500 block font-semibold">Suku Cadang Dipesan:</span>
                      <span className="font-bold text-slate-800">{activePr.catatan_pr || 'Sparepart Indent Khusus'}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                      <span className="text-[10px] text-purple-600 block font-semibold">Estimasi Kedatangan Barang (ETA):</span>
                      <span className="font-mono font-bold text-purple-900">
                        {activePr.estimasi_tanggal_ready_eta
                          ? `${activePr.estimasi_tanggal_ready_eta} ${activePr.estimasi_jam_ready_eta ? `(${activePr.estimasi_jam_ready_eta} WIB)` : ''}`
                          : 'Dalam Konfirmasi Penawaran Vendor'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Approval Pekerjaan Tambahan (di atas stepper) */}
            {approvalTambahanList.length > 0 && (
              <div className="mt-4 space-y-3">
                {approvalTambahanList.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-amber-900">
                            Ada Pekerjaan Tambahan Perlu Persetujuan
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold animate-pulse">
                            Menunggu Approval
                          </span>
                        </div>

                        <p className="text-xs text-amber-900/90 mt-1.5 leading-relaxed font-medium">
                          {t.deskripsi_tambahan}
                        </p>
                        {t.rekomendasi_perbaikan && (
                          <p className="text-[11px] text-amber-700 mt-1 italic">
                            Rekomendasi: {t.rekomendasi_perbaikan}
                          </p>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/80 rounded-xl border border-amber-200 p-2.5">
                            <span className="text-amber-600/80 text-[10px] block">Estimasi Biaya Tambahan</span>
                            <span className="font-black text-amber-900">
                              Rp {Number(t.estimasi_biaya_tambahan || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="bg-white/80 rounded-xl border border-amber-200 p-2.5">
                            <span className="text-amber-600/80 text-[10px] block">Estimasi Waktu Tambahan</span>
                            <span className="font-black text-amber-900">
                              {t.estimasi_waktu_tambahan_jam || 0} Jam
                            </span>
                          </div>
                        </div>

                        {(t.diajukan_oleh_mekanik || t.diverifikasi_foreman) && (
                          <p className="text-[10px] text-amber-600 mt-2">
                            {t.diajukan_oleh_mekanik ? `Diajukan mekanik: ${t.diajukan_oleh_mekanik}` : ''}
                            {t.diajukan_oleh_mekanik && t.diverifikasi_foreman ? ' • ' : ''}
                            {t.diverifikasi_foreman ? `Diverifikasi foreman: ${t.diverifikasi_foreman}` : ''}
                          </p>
                        )}

                        <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            disabled={approvalTambahanMutation.isPending}
                            onClick={() =>
                              approvalTambahanMutation.mutate({ id: t.id, status_approval_customer: 'Disetujui' })
                            }
                            className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Setujui Pekerjaan Tambahan
                          </button>
                          <button
                            type="button"
                            disabled={approvalTambahanMutation.isPending}
                            onClick={() =>
                              approvalTambahanMutation.mutate({ id: t.id, status_approval_customer: 'Ditolak' })
                            }
                            className="flex-1 min-h-[44px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" /> Tolak
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stepper Progress Bar (image5.png Mockup 2 Stepper) */}
            <div className="py-6 px-2 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[650px]">
                {[
                  { step: 1, title: 'Check In', desc: 'Diterima Security', done: true },
                  { 
                    step: 2, 
                    title: activeTrackSpk.status_spk === 'Waiting Part' ? 'Waiting Part' : 'Proses Pekerjaan', 
                    desc: activeTrackSpk.status_spk === 'Waiting Part' ? 'Menunggu Part (Pending)' : 'Mekanik Aktif', 
                    done: activeTrackSpk.status_spk !== 'Waiting Part' && activeTrackSpk.status_spk !== 'Check In' && activeTrackSpk.status_spk !== 'Menunggu Pengecekan Mekanik', 
                    current: activeTrackSpk.status_spk === 'Waiting Part' || activeTrackSpk.status_spk === 'Dalam Pengerjaan',
                    isWaitingPart: activeTrackSpk.status_spk === 'Waiting Part'
                  },
                  { step: 3, title: 'QC Passed', desc: 'Inspeksi Foreman', done: activeTrackSpk.status_spk === 'QC Passed' || activeTrackSpk.status_spk === 'FIR Closed' || activeTrackSpk.status_spk === 'Selesai' },
                  { step: 4, title: 'FIR Closed', desc: 'Final Check SA', done: activeTrackSpk.status_spk === 'FIR Closed' || activeTrackSpk.status_spk === 'Selesai' },
                  { step: 5, title: 'Invoice', desc: 'Proses Kasir', done: activeTrackSpk.status_spk === 'Selesai' },
                  { step: 6, title: 'Check Out', desc: 'Armada Keluar', done: false },
                ].map((s, idx) => (
                  <div key={s.step} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1 text-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                        s.isWaitingPart
                          ? 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-md scale-110'
                          : s.current 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110' 
                          : s.done 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {s.done ? <CheckCircle2 className="w-5 h-5" /> : s.step}
                      </div>
                      <div className={`text-xs font-bold ${s.isWaitingPart ? 'text-purple-700' : s.current ? 'text-blue-600' : 'text-slate-800'}`}>
                        {s.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
                    </div>
                    {idx < 5 && (
                      <div className={`h-1 flex-1 mx-2 rounded-full ${s.done ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Progress Logs */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <span className="font-bold text-slate-800 block">Riwayat Aktivitas Terkini:</span>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Kendaraan Masuk di Pos Security</div>
                      <div className="text-[11px] text-slate-400">09:00 WIB | Petugas: Hisar Pardede</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Penerimaan & Cek Odometer oleh SA</div>
                      <div className="text-[11px] text-slate-400">09:15 WIB | SA: Budi Santoso | KM: 125,680</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-ping"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Pekerjaan Sedang Dilakukan oleh Mekanik</div>
                      <div className="text-[11px] text-slate-400">09:30 WIB | Mekanik: Andi Wijaya</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Informasi Armada & Catatan SA:</span>
                <p className="text-slate-600 leading-relaxed">
                  Keluhan Customer: "{activeTrackSpk.keluhan_customer}"
                </p>
                <div className="pt-2 border-t border-slate-200 text-slate-500">
                  Customer tidak perlu konfirmasi via WhatsApp manual karena status akan otomatis diperbarui oleh sistem bengkel.
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MENU 2: BOOKING SERVICE 4-STEP WIZARD (image5.png Mockup 1) */}
      {fleetMenu === 'booking' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Booking Service Armada Perusahaan</h2>
            <p className="text-xs text-slate-500">Jadwalkan service armada Anda untuk mendapatkan antrian prioritas di Bengkel KIM 3</p>
          </div>

          {/* 4 Steps Indicator */}
          <div className="flex items-center justify-between text-xs font-semibold">
            {[
              { num: 1, label: 'Pilih Kendaraan' },
              { num: 2, label: 'Pilih Layanan' },
              { num: 3, label: 'Tanggal & Waktu' },
              { num: 4, label: 'Konfirmasi' },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  bookingStep === step.num ? 'bg-blue-600 text-white shadow-xs' : bookingStep > step.num ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.num}
                </div>
                <span className={`hidden sm:inline ${bookingStep === step.num ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: PILIH KENDARAAN */}
          {bookingStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Pilih armada yang akan diservice:</span>
                <button
                  type="button"
                  onClick={() => setOpenTambahArmadaModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kendaraan</span>
                </button>
              </div>
              <div className="space-y-2">
                {kendaraanList?.map((k) => (
                  <label
                    key={k.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      bookingForm.no_polisi === k.no_polisi
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="booking_kendaraan"
                        checked={bookingForm.no_polisi === k.no_polisi}
                        onChange={() => setBookingForm({ ...bookingForm, no_polisi: k.no_polisi })}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-black text-slate-900">{k.no_polisi}</div>
                        <div className="text-xs text-slate-500">{k.merk} {k.model} ({k.tahun})</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      Armada Aktif
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setBookingStep(2)}
                className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                Lanjut: Pilih Layanan <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PILIH LAYANAN */}
          {bookingStep === 2 && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Pilih jenis perbaikan atau service berkala:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Service Berkala (Ganti Oli & Filter)',
                  'Perbaikan Rem & Kaki-kaki',
                  'Tune Up & Performa Mesin',
                  'Kelistrikan & Starter / Alternator',
                  'Overhaul Mesin / Transmisi',
                  'Pemeriksaan Umum / Keluhan Khusus',
                ].map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, jenis_layanan: srv })}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      bookingForm.jenis_layanan === srv
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {srv}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">Jelaskan Keluhan Kendaraan:</label>
                <textarea
                  rows={2}
                  value={bookingForm.keluhan}
                  onChange={(e) => setBookingForm({ ...bookingForm, keluhan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Lanjut: Jadwal
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PILIH TANGGAL & WAKTU */}
          {bookingStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Rencana Masuk</label>
                  <input
                    type="date"
                    value={bookingForm.tanggal_booking}
                    onChange={(e) => setBookingForm({ ...bookingForm, tanggal_booking: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Jam Kedatangan (Slot)</label>
                  <select
                    value={bookingForm.jam_booking}
                    onChange={(e) => setBookingForm({ ...bookingForm, jam_booking: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none bg-white"
                  >
                    <option value="08:00">08:00 WIB (Slot Pagi Awal)</option>
                    <option value="09:00">09:00 WIB (Slot Pagi)</option>
                    <option value="10:30">10:30 WIB (Slot Menjelang Siang)</option>
                    <option value="13:30">13:30 WIB (Slot Siang)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep(4)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Lanjut: Konfirmasi
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: KONFIRMASI */}
          {bookingStep === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">Ringkasan Pemesanan Booking Service</div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Armada:</span>
                  <span className="font-bold text-slate-800">{bookingForm.no_polisi}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Jenis Layanan:</span>
                  <span className="font-bold text-slate-800">{bookingForm.jenis_layanan}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Jadwal Masuk:</span>
                  <span className="font-mono font-bold text-blue-600">{bookingForm.tanggal_booking} ({bookingForm.jam_booking} WIB)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 text-slate-600 italic">
                  "{bookingForm.keluhan}"
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={createBookingMutation.isPending}
                  onClick={() => createBookingMutation.mutate()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                >
                  {createBookingMutation.isPending ? 'Menyimpan...' : 'KONFIRMASI BOOKING'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MENU 3: KENDARAAN SAYA (image5.png Mockup 4) */}
      {fleetMenu === 'kendaraan' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Armada Kendaraan Perusahaan</h2>
              <p className="text-xs text-slate-500">Daftar unit truk dan kendaraan operasional PT. Andi Jaya</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenTambahArmadaModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Armada</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kendaraanList?.map((k) => (
              <div key={k.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">{k.no_polisi}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Aktif
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-bold mt-0.5">{k.merk} {k.model} ({k.jenis_armada})</div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tahun Pembuatan:</span>
                      <span className="font-semibold text-slate-800">{k.tahun || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Asuransi:</span>
                      <span className="font-semibold text-slate-800">{k.asuransi || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">No. Rangka:</span>
                      <span className="font-mono text-[11px] text-slate-600">{k.no_rangka || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">No. Mesin:</span>
                      <span className="font-mono text-[11px] text-slate-600">{k.no_mesin || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingForm({ ...bookingForm, no_polisi: k.no_polisi });
                      setFleetMenu('booking');
                    }}
                    className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Jadwalkan Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MENU 4: DOKUMEN SAYA (image5.png Mockup 5) */}
      {fleetMenu === 'dokumen' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Dokumen Digital Armada (STNK, BPKB, KIR, Asuransi)</h2>
              <p className="text-xs text-slate-500">Kelola dan unduh berkas perizinan kendaraan secara terpusat</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (kendaraanList && kendaraanList.length > 0) {
                  setDokumenForm(prev => ({ ...prev, no_polisi: kendaraanList[0].no_polisi }));
                }
                setOpenTambahDokumenModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Dokumen Baru</span>
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Nama Dokumen</th>
                  <th className="py-2.5 px-3 font-semibold">Jenis</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Masa Berlaku</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dokumenList?.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{doc.nama_dokumen}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                        {doc.jenis_dokumen}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{doc.no_polisi}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {doc.masa_berlaku ? new Date(doc.masa_berlaku).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
          <div className="block md:hidden space-y-2.5">
            {dokumenList?.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 leading-snug">{doc.nama_dokumen}</div>
                    <div className="font-mono text-[11px] font-bold text-slate-500 mt-0.5">{doc.no_polisi}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold shrink-0">
                    {doc.jenis_dokumen}
                  </span>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Masa Berlaku</span>
                  <span className="font-mono font-semibold text-slate-600">
                    {doc.masa_berlaku ? new Date(doc.masa_berlaku).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>

                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-700 active:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MENU 5: PROFIL PERUSAHAAN (image5.png Mockup 6) */}
      {fleetMenu === 'profil' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Profil Pelanggan Fleet</h2>
            <p className="text-xs text-slate-500">Informasi entitas perusahaan dan kontak PIC penanggung jawab</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 block text-sm">Informasi Perusahaan:</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Perusahaan:</span>
                  <span className="font-bold text-slate-800">PT. Andi Jaya</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">NPWP:</span>
                  <span className="font-mono font-semibold text-slate-800">01.234.567.8-901.000</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Alamat Workshop / Kantor:</span>
                  <span className="font-semibold text-slate-800">Jl. Industri Raya No. 88, Medan, Sumatera Utara 20152</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 block text-sm">Kontak PIC Utama:</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama PIC:</span>
                  <span className="font-bold text-slate-800">Hisar</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Jabatan:</span>
                  <span className="font-semibold text-slate-800">Warehouse & Fleet Manager</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">No. Telepon / WhatsApp:</span>
                  <span className="font-semibold text-slate-800">0812-3456-7890</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email:</span>
                  <span className="font-semibold text-slate-800">hisar@andijaya.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU 6: HISTORY SERVICE (image5.png Mockup 3) */}
      {fleetMenu === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Riwayat Service Armada (History)</h2>
            <p className="text-xs text-slate-500">Histori lengkap pengerjaan service dan penggantian part armada Anda</p>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. Booking / SPK</th>
                  <th className="py-2.5 px-3 font-semibold">Kendaraan</th>
                  <th className="py-2.5 px-3 font-semibold">Layanan</th>
                  <th className="py-2.5 px-3 font-semibold">Tanggal Masuk</th>
                  <th className="py-2.5 px-3 font-semibold">Biaya</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spkList?.map((spk) => (
                  <tr key={spk.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{spk.no_spk}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{spk.no_polisi}</td>
                    <td className="py-3 px-3 text-slate-700">{spk.keluhan_customer}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{new Date(spk.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">Rp {Number(spk.estimasi_biaya || 0).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
          <div className="block md:hidden space-y-2.5">
            {spkList?.map((spk) => (
              <div key={spk.id} className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold text-blue-600">{spk.no_spk}</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{spk.no_polisi}</div>
                  </div>
                  <StatusBadge status={spk.status_spk} size="sm" />
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <p className="text-xs text-slate-700 leading-relaxed">{spk.keluhan_customer}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Tanggal Masuk</span>
                    <span className="font-mono font-semibold text-slate-600">
                      {new Date(spk.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Biaya</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH ARMADA KENDARAAN BARU                                     */}
      {/* ========================================================================= */}
      {openTambahArmadaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Unit Armada Baru</h3>
                  <p className="text-[11px] text-slate-500">Daftarkan kendaraan operasional ke database Bengkel KIM 3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahArmadaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!armadaForm.no_polisi.trim()) {
                  alert('Nomor Polisi wajib diisi.');
                  return;
                }
                tambahArmadaMutation.mutate(armadaForm);
              }}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Polisi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BK 9999 XX"
                    value={armadaForm.no_polisi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_polisi: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Armada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={armadaForm.jenis_armada}
                    onChange={(e) => setArmadaForm({ ...armadaForm, jenis_armada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    <option value="Truk">Truk Engkel / Box</option>
                    <option value="Tronton">Tronton / Wingbox</option>
                    <option value="Trailer">Trailer / Kontainer</option>
                    <option value="Pick Up">Pick Up Operasional</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Merk</label>
                  <select
                    value={armadaForm.merk}
                    onChange={(e) => setArmadaForm({ ...armadaForm, merk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    <option value="Hino">Hino</option>
                    <option value="Mitsubishi Fuso">Mitsubishi Fuso</option>
                    <option value="Isuzu">Isuzu</option>
                    <option value="Toyota Dyna">Toyota Dyna</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="Volvo">Volvo</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model / Seri</label>
                  <input
                    type="text"
                    placeholder="Dutro 130HD"
                    value={armadaForm.model}
                    onChange={(e) => setArmadaForm({ ...armadaForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pembuatan</label>
                  <input
                    type="number"
                    min="1995"
                    max={new Date().getFullYear() + 1}
                    value={armadaForm.tahun}
                    onChange={(e) => setArmadaForm({ ...armadaForm, tahun: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rangka (VIN)</label>
                  <input
                    type="text"
                    placeholder="MHKHINO..."
                    value={armadaForm.no_rangka}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_rangka: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Mesin</label>
                  <input
                    type="text"
                    placeholder="J08E-..."
                    value={armadaForm.no_mesin}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_mesin: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Asuransi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Asuransi Astra / Sinarmas"
                    value={armadaForm.asuransi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Masa Berlaku Asuransi</label>
                  <input
                    type="date"
                    value={armadaForm.masa_berlaku_asuransi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, masa_berlaku_asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenTambahArmadaModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={tambahArmadaMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tambahArmadaMutation.isPending ? 'Menyimpan...' : 'Simpan Unit Armada'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UNGGAH DOKUMEN DIGITAL ARMADA                                   */}
      {/* ========================================================================= */}
      {openTambahDokumenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Unggah Dokumen Digital Armada</h3>
                  <p className="text-[11px] text-slate-500">Simpan arsip STNK, KIR, BPKB, atau polis asuransi unit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahDokumenModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dokumenForm.no_polisi || !dokumenForm.nama_dokumen.trim()) {
                  alert('Pilih armada dan isi nama dokumen.');
                  return;
                }
                tambahDokumenMutation.mutate(dokumenForm);
              }}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Unit Armada <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={dokumenForm.no_polisi}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, no_polisi: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                >
                  <option value="">-- Pilih Nomor Polisi --</option>
                  {kendaraanList?.map((k) => (
                    <option key={k.id} value={k.no_polisi}>
                      {k.no_polisi} — {k.merk} {k.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Dokumen <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dokumenForm.jenis_dokumen}
                    onChange={(e) => setDokumenForm({ ...dokumenForm, jenis_dokumen: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    <option value="STNK">STNK (Pajak Tahunan / 5 Tahunan)</option>
                    <option value="KIR">KIR (Uji Berkala Dishub)</option>
                    <option value="BPKB">BPKB Unit</option>
                    <option value="Asuransi">Polis Asuransi All Risk / TLO</option>
                    <option value="Izin Usaha">Izin Usaha Angkutan / Dishub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Masa Berlaku Dokumen</label>
                  <input
                    type="date"
                    value={dokumenForm.masa_berlaku}
                    onChange={(e) => setDokumenForm({ ...dokumenForm, masa_berlaku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Dokumen / Keterangan Berkas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: STNK Pajak Berlaku s/d Mei 2027"
                  value={dokumenForm.nama_dokumen}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, nama_dokumen: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan nomor seri atau barcode dokumen"
                  value={dokumenForm.keterangan}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenTambahDokumenModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={tambahDokumenMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tambahDokumenMutation.isPending ? 'Menyimpan...' : 'Simpan Dokumen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
