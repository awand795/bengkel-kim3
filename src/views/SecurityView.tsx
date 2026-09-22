import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  LogOut, 
  FileText, 
  Search, 
  CheckCircle2, 
  Printer, 
  Truck, 
  PlusCircle,
  X
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'checkin' | 'booking' | 'onprogress' | 'selesai' | 'memo'>('onprogress');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<any | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState<any | null>(null);

  // Check In Form State
  const [formCheckin, setFormCheckin] = useState({
    no_polisi: '',
    nama_customer: '',
    no_hp_customer: '',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service' as 'Service' | 'Beli Part' | 'Kunjungan' | 'Lainnya',
    pic_tujuan: 'Budi Santoso (SA)',
    keperluan: '',
    foto_kendaraan_masuk: '',
    catatan_security: '',
    id_booking: undefined as number | undefined,
  });

  // Check Out Form State
  const [formCheckout, setFormCheckout] = useState({
    barang_dibawa_keluar: false,
    detail_barang_keluar: '',
    foto_kendaraan_keluar: '',
    foto_barang: '',
    no_memo_keluar: '',
  });

  // Queries
  const { data: antrianList, isLoading: loadingAntrian } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const { data: bookingList } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
  });

  const { data: memoList } = useQuery({
    queryKey: ['memo-list'],
    queryFn: api.getMemoKeluarList,
  });

  // Check-In Mutation
  const checkinMutation = useMutation({
    mutationFn: async (data: typeof formCheckin) => {
      const ticketNo = `ANT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      return api.checkInSecurity({
        no_tiket: ticketNo,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('Kendaraan berhasil di-Check In oleh Security!');
      setFormCheckin({
        no_polisi: '',
        nama_customer: '',
        no_hp_customer: '',
        jenis_armada: 'Truk',
        tujuan_kedatangan: 'Service',
        pic_tujuan: 'Budi Santoso (SA)',
        keperluan: '',
        foto_kendaraan_masuk: '',
        catatan_security: '',
        id_booking: undefined,
      });
      setSubTab('onprogress');
    },
    onError: (err: any) => alert('Gagal check in: ' + err?.message),
  });

  // Check-Out Mutation
  const checkoutMutation = useMutation({
    mutationFn: async (item: any) => {
      const memoNo = `MK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      
      // Update antrian
      await api.checkOutSecurity({
        id: item.id,
        barang_dibawa_keluar: formCheckout.barang_dibawa_keluar,
        detail_barang_keluar: formCheckout.detail_barang_keluar,
        foto_kendaraan_keluar: formCheckout.foto_kendaraan_keluar,
        foto_barang: formCheckout.foto_barang,
        no_memo_keluar: memoNo,
      });

      // Terbitkan memo keluar
      return api.buatMemoKeluar({
        no_memo: memoNo,
        id_antrian: item.id,
        no_polisi: item.no_polisi,
        jenis_armada: item.jenis_armada,
        nama_customer: item.nama_customer,
        tujuan_kedatangan: item.tujuan_kedatangan,
        foto_keluar: formCheckout.foto_kendaraan_keluar,
        catatan: formCheckout.barang_dibawa_keluar ? `Barang dibawa: ${formCheckout.detail_barang_keluar}` : 'Kendaraan keluar bengkel.',
        petugas_security: 'Hisar Pardede',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('Kendaraan berhasil Check Out dan Memo Keluar resmi diterbitkan!');
      setShowCheckoutModal(null);
    },
    onError: (err: any) => alert('Gagal check out: ' + err?.message),
  });

  const onProgressList = antrianList?.filter(a => a.status_kunjungan !== 'Keluar' && a.status_kunjungan !== 'Selesai') || [];
  const selesaiList = antrianList?.filter(a => a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai') || [];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Pos Security - Bengkel KIM 3</h1>
            <p className="text-xs text-slate-500">Pintu Masuk & Keluar, Validasi Plat Nomor, dan Penerbitan Memo Keluar</p>
          </div>
        </div>

        {/* Subtab Navigation */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('onprogress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'onprogress' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Di Bengkel ({onProgressList.length})
          </button>
          <button
            onClick={() => setSubTab('checkin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'checkin' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Check In Baru
          </button>
          <button
            onClick={() => setSubTab('booking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'booking' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            List Booking ({bookingList?.length || 0})
          </button>
          <button
            onClick={() => setSubTab('selesai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'selesai' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat Keluar
          </button>
          <button
            onClick={() => setSubTab('memo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'memo' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Memo Keluar ({memoList?.length || 0})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: FORM CHECK IN BARU */}
      {subTab === 'checkin' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs max-w-2xl mx-auto">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Form Check-In Kendaraan Masuk</h2>
            <p className="text-xs text-slate-500">Security input data fisik plat nomor dan tujuan kedatangan</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              checkinMutation.mutate(formCheckin);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Polisi (Plat Nomor) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BK 5678 CD"
                  value={formCheckin.no_polisi}
                  onChange={(e) => setFormCheckin({ ...formCheckin, no_polisi: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Armada</label>
                <select
                  value={formCheckin.jenis_armada}
                  onChange={(e) => setFormCheckin({ ...formCheckin, jenis_armada: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Truk">Truk (Canter / Dutro / Tronton)</option>
                  <option value="Mobil">Mobil Pribadi / Operasional</option>
                  <option value="Pickup">Pickup / Box Kecil</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tujuan Kedatangan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Service', label: '1. Service', desc: 'Perbaikan / Service' },
                  { id: 'Beli Part', label: '2. Beli Part', desc: 'Hanya beli sparepart' },
                  { id: 'Kunjungan', label: '3. Kunjungan', desc: 'Tamu / Dinas' },
                  { id: 'Lainnya', label: '4. Lainnya', desc: 'Keperluan lain' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setFormCheckin({
                        ...formCheckin,
                        tujuan_kedatangan: t.id as any,
                        pic_tujuan: t.id === 'Service' ? 'Budi Santoso (SA)' : t.id === 'Beli Part' ? 'Hisar (Warehouse)' : 'Hisar (Warehouse)',
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formCheckin.tujuan_kedatangan === t.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Driver / Customer</label>
                <input
                  type="text"
                  placeholder="Nama pembawa armada"
                  value={formCheckin.nama_customer}
                  onChange={(e) => setFormCheckin({ ...formCheckin, nama_customer: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. HP Driver</label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={formCheckin.no_hp_customer}
                  onChange={(e) => setFormCheckin({ ...formCheckin, no_hp_customer: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIC / Tujuan Dalam Bengkel</label>
                <input
                  type="text"
                  value={formCheckin.pic_tujuan}
                  onChange={(e) => setFormCheckin({ ...formCheckin, pic_tujuan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keperluan / Keluhan Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: Service berkala, ganti oli"
                  value={formCheckin.keperluan}
                  onChange={(e) => setFormCheckin({ ...formCheckin, keperluan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Photo Odometer / Kendaraan */}
            <PhotoUploader
              label="Foto Kendaraan Saat Masuk (Kamera / File)"
              value={formCheckin.foto_kendaraan_masuk}
              onChange={(url) => setFormCheckin({ ...formCheckin, foto_kendaraan_masuk: url })}
              bucket="foto_kendaraan"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Security</label>
              <textarea
                rows={2}
                placeholder="Catatan kondisi awal fisik atau barang bawaan..."
                value={formCheckin.catatan_security}
                onChange={(e) => setFormCheckin({ ...formCheckin, catatan_security: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={checkinMutation.isPending}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {checkinMutation.isPending ? 'Menyimpan...' : 'SUBMIT CHECK IN KENDARAAN'}
            </button>
          </form>
        </div>
      )}

      {/* SUBTAB 2: LIST NOPOL YANG TELAH BOOKING (image4.png Mockup 1) */}
      {subTab === 'booking' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">List Nopol Yang Telah Booking Service</h2>
              <p className="text-xs text-slate-500">Booking prioritas sesuai jadwal dari Web Fleet Customer</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. Booking</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Layanan</th>
                  <th className="py-2.5 px-3 font-semibold">Tgl & Jam</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookingList && bookingList.length > 0 ? (
                  bookingList.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{b.no_booking}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{b.no_polisi}</td>
                      <td className="py-3 px-3 text-slate-800 font-medium">{b.nama_perusahaan || '-'}</td>
                      <td className="py-3 px-3 text-slate-600">{b.jenis_layanan}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {b.tanggal_booking} ({b.jam_booking})
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={b.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setFormCheckin({
                              ...formCheckin,
                              no_polisi: b.no_polisi,
                              nama_customer: b.nama_perusahaan || '',
                              keperluan: b.jenis_layanan,
                              id_booking: b.id,
                              tujuan_kedatangan: 'Service',
                            });
                            setSubTab('checkin');
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-xs transition-colors"
                        >
                          Pilih & Isi Otomatis →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada daftar booking hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SELURUH NOPOL YANG MASIH BERADA DIBENGKEL (image4.png Mockup 2) */}
      {subTab === 'onprogress' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Seluruh Nopol Berada Di Bengkel (Status On Progress)</h2>
              <p className="text-xs text-slate-500">Total {onProgressList.length} armada terpantau realtime di dalam bengkel</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari No. Polisi / Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. Tiket</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Customer / Driver</th>
                  <th className="py-2.5 px-3 font-semibold">Tujuan</th>
                  <th className="py-2.5 px-3 font-semibold">Waktu Masuk</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">PIC Terkait</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {onProgressList.filter(item => 
                  item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())
                ).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-600">{item.no_tiket}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm">{item.no_polisi}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{item.nama_customer || '-'}</div>
                      <div className="text-[11px] text-slate-400">{item.jenis_armada}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{item.tujuan_kedatangan}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={item.status_kunjungan} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{item.pic_tujuan || '-'}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckoutModal(item);
                          setFormCheckout({
                            barang_dibawa_keluar: false,
                            detail_barang_keluar: '',
                            foto_kendaraan_keluar: '',
                            foto_barang: '',
                            no_memo_keluar: '',
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Check Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: SELURUH NOPOL YANG TELAH MENINGGALKAN BENGKEL (image4.png Mockup 3) */}
      {subTab === 'selesai' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Seluruh Nopol Yang Telah Meninggalkan Bengkel</h2>
            <p className="text-xs text-slate-500">Histori keluar kendaraan beserta memo jalan security</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. Tiket</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Tujuan</th>
                  <th className="py-2.5 px-3 font-semibold">Waktu Masuk</th>
                  <th className="py-2.5 px-3 font-semibold">Waktu Keluar</th>
                  <th className="py-2.5 px-3 font-semibold">No. Memo Keluar</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selesaiList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">{item.no_tiket}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.no_polisi}</td>
                    <td className="py-3 px-3 text-slate-800">{item.nama_customer}</td>
                    <td className="py-3 px-3 text-slate-600">{item.tujuan_kedatangan}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{item.no_memo_keluar || '-'}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status="Selesai" size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: MEMO KELUAR & CETAK (image4.png Mockup 4) */}
      {subTab === 'memo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* List Memo Keluar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Daftar Memo Keluar (Surat Jalan)</h2>
            <p className="text-xs text-slate-500 mb-4">Otorisasi resmi keluarnya kendaraan dari Pos Security</p>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {memoList && memoList.length > 0 ? (
                memoList.map((memo) => (
                  <div
                    key={memo.id}
                    onClick={() => setSelectedMemo(memo)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      selectedMemo?.id === memo.id ? 'bg-blue-50 border border-blue-200 shadow-xs' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">{memo.no_memo}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(memo.waktu_keluar).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 mt-1">{memo.no_polisi} - {memo.nama_customer}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                      <span>Tujuan: {memo.tujuan_kedatangan}</span>
                      <span className="text-blue-600 font-semibold">Klik untuk Preview →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada memo keluar yang diterbitkan.
                </div>
              )}
            </div>
          </div>

          {/* Preview Memo Keluar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            {selectedMemo ? (
              <div>
                <div className="border-b-2 border-slate-800 pb-4 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">MEMO KELUAR KENDARAAN</h3>
                    <p className="text-[11px] text-slate-500">BENGKEL KIM 3 MEDAN - SECURITY DIVISION</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-sm text-blue-700">{selectedMemo.no_memo}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(selectedMemo.waktu_keluar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">No. Polisi</span>
                      <span className="text-sm font-black text-slate-900">{selectedMemo.no_polisi}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Jenis Armada</span>
                      <span className="text-sm font-bold text-slate-800">{selectedMemo.jenis_armada || 'Truk'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                      <span className="font-semibold text-slate-800">{selectedMemo.nama_customer || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Tujuan Kedatangan</span>
                      <span className="font-semibold text-slate-800">{selectedMemo.tujuan_kedatangan}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block mb-1">Keterangan / Catatan Barang Bawaan:</span>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                      {selectedMemo.catatan || 'Pekerjaan telah selesai dan kendaraan dalam kondisi baik.'}
                    </p>
                  </div>

                  <div className="pt-6 flex items-center justify-between text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-10">Driver / Customer</div>
                      <div className="font-bold text-slate-800 border-t border-slate-300 pt-1 px-4">
                        ( {selectedMemo.nama_customer || 'Driver'} )
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-10">Petugas Security</div>
                      <div className="font-bold text-slate-800 border-t border-slate-300 pt-1 px-4">
                        ( {selectedMemo.petugas_security || 'Security KIM 3'} )
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> CETAK MEMO KELUAR
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Pilih salah satu memo di sebelah kiri untuk melihat preview dan cetak.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* CHECK OUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Check Out Kendaraan</h3>
                <p className="text-xs text-slate-500 font-mono">{showCheckoutModal.no_polisi} - {showCheckoutModal.nama_customer}</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="font-semibold text-slate-800">Tujuan Kedatangan: {showCheckoutModal.tujuan_kedatangan}</div>
                <div className="text-slate-500 mt-0.5">Waktu Masuk: {new Date(showCheckoutModal.waktu_masuk).toLocaleTimeString()} WIB</div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCheckout.barang_dibawa_keluar}
                    onChange={(e) => setFormCheckout({ ...formCheckout, barang_dibawa_keluar: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Ada Barang yang Dibawa Keluar? (Sparepart lama / berkas / box)
                </label>
              </div>

              {formCheckout.barang_dibawa_keluar && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rincian Barang yang Dibawa Keluar</label>
                  <input
                    type="text"
                    placeholder="Contoh: 1 Dus Sparepart Bekas, Dokumen Faktur"
                    value={formCheckout.detail_barang_keluar}
                    onChange={(e) => setFormCheckout({ ...formCheckout, detail_barang_keluar: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Foto Keluar */}
              <PhotoUploader
                label="Foto Kendaraan Saat Keluar (Opsional)"
                value={formCheckout.foto_kendaraan_keluar}
                onChange={(url) => setFormCheckout({ ...formCheckout, foto_kendaraan_keluar: url })}
                bucket="foto_kendaraan"
              />

              {formCheckout.barang_dibawa_keluar && (
                <PhotoUploader
                  label="Foto Barang Bawaan (Opsional)"
                  value={formCheckout.foto_barang}
                  onChange={(url) => setFormCheckout({ ...formCheckout, foto_barang: url })}
                  bucket="foto_barang"
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate(showCheckoutModal)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
              >
                {checkoutMutation.isPending ? 'Memproses...' : 'KONFIRMASI KELUAR'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
