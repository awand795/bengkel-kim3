import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { Kendaraan, BookingService } from '../types';
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
  Wrench
} from 'lucide-react';

interface WebFleetCustomerViewProps {
  initialMenu?: 'dashboard' | 'booking' | 'status' | 'history' | 'kendaraan' | 'dokumen' | 'profil';
}

export const WebFleetCustomerView: React.FC<WebFleetCustomerViewProps> = ({ initialMenu }) => {
  const queryClient = useQueryClient();
  const [fleetMenu, setFleetMenu] = useState<'dashboard' | 'booking' | 'status' | 'history' | 'kendaraan' | 'dokumen' | 'profil'>(
    initialMenu || 'status'
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

  // Active SPK being monitored
  const activeTrackSpk = spkList?.[0];

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
      alert('Booking Service Berhasil Dibuat! Jadwal otomatis masuk ke sistem bengkel prioritas.');
      setBookingStep(1);
      setFleetMenu('history');
    },
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Fleet */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Web Fleet Customer - PT. Andi Jaya</h1>
            <p className="text-xs text-slate-500">Monitoring Realtime Armada Bengkel KIM 3 Medan</p>
          </div>
        </div>

        {/* Fleet Submenu Tabs (image5.png Sidebar Items) */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'status', label: 'Status Service (Live)' },
            { id: 'booking', label: 'Booking Service' },
            { id: 'history', label: 'History Service' },
            { id: 'kendaraan', label: 'Kendaraan Saya' },
            { id: 'dokumen', label: 'Dokumen Saya' },
            { id: 'profil', label: 'Profil Perusahaan' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFleetMenu(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                fleetMenu === item.id ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

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

            {/* Stepper Progress Bar (image5.png Mockup 2 Stepper) */}
            <div className="py-6 px-2 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[650px]">
                {[
                  { step: 1, title: 'Check In', desc: 'Diterima Security', done: true },
                  { step: 2, title: 'Proses Pekerjaan', desc: 'Mekanik Aktif', done: true, current: true },
                  { step: 3, title: 'QC Passed', desc: 'Inspeksi Foreman', done: false },
                  { step: 4, title: 'FIR Closed', desc: 'Final Check SA', done: false },
                  { step: 5, title: 'Invoice', desc: 'Proses Kasir', done: false },
                  { step: 6, title: 'Check Out', desc: 'Armada Keluar', done: false },
                ].map((s, idx) => (
                  <div key={s.step} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1 text-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                        s.current 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110' 
                          : s.done 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {s.done ? <CheckCircle2 className="w-5 h-5" /> : s.step}
                      </div>
                      <div className={`text-xs font-bold ${s.current ? 'text-blue-600' : 'text-slate-800'}`}>
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
              <span className="text-xs font-bold text-slate-800 block">Pilih armada yang akan diservice:</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Armada Kendaraan Perusahaan</h2>
              <p className="text-xs text-slate-500">Daftar unit truk dan kendaraan operasional PT. Andi Jaya</p>
            </div>
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
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Dokumen Digital Armada (STNK, BPKB, KIR, Asuransi)</h2>
            <p className="text-xs text-slate-500">Kelola dan unduh berkas perizinan kendaraan secara terpusat</p>
          </div>

          <div className="overflow-x-auto">
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

          <div className="overflow-x-auto">
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
        </div>
      )}

    </div>
  );
};
