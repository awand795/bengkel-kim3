import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ShoppingBag,
  Receipt,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { realtimeHub } from '../../services/realtimeService';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  tab: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
}

export const NotificationDropdown: React.FC = () => {
  const { currentRole, currentUser, authUser, setActiveTab } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fast differential polling queries (3s)
  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 3000,
  });

  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 3000,
  });

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 3000,
  });

  const { data: invoiceList } = useQuery({
    queryKey: ['invoice-list'],
    queryFn: api.getInvoiceList,
    refetchInterval: 3000,
  });

  const { data: tambahanList } = useQuery({
    queryKey: ['tambahan-pekerjaan'],
    queryFn: api.getTambahanPekerjaan,
    refetchInterval: 3000,
  });

  const { data: bookingList } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
    refetchInterval: 3000,
  });

  // Track previous items to broadcast real-time delta notifications
  const prevBookingsRef = useRef<number[]>([]);
  const prevAntrianRef = useRef<number[]>([]);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!bookingList && !antrianList) return;

    if (isFirstLoad.current) {
      if (bookingList) prevBookingsRef.current = bookingList.map((b) => b.id);
      if (antrianList) prevAntrianRef.current = antrianList.map((a) => a.id);
      isFirstLoad.current = false;
      return;
    }

    // Check for new bookings
    if (bookingList && bookingList.length > 0) {
      const newBookings = bookingList.filter((b) => !prevBookingsRef.current.includes(b.id));
      newBookings.forEach((b) => {
        realtimeHub.publish({
          type: 'BOOKING_CREATED',
          targetRoles: ['SA', 'Security'],
          title: 'Booking Baru Diterima',
          message: `Customer ${b.nama_customer || b.nama_perusahaan} (${b.no_polisi}) memesan service untuk ${b.tanggal_booking} jam ${b.jam_booking}.`,
          linkTab: 'security-booking',
          urgency: 'info',
        });
      });
      prevBookingsRef.current = bookingList.map((b) => b.id);
    }

    // Check for new checkins in antrian
    if (antrianList && antrianList.length > 0) {
      const newAntrian = antrianList.filter((a) => !prevAntrianRef.current.includes(a.id));
      newAntrian.forEach((a) => {
        if (a.tujuan_kedatangan === 'Kunjungan') {
          realtimeHub.publish({
            type: 'KUNJUNGAN_ARRIVED',
            targetRoles: ['PIC Terkait'],
            title: 'Tamu Tiba di Pos Security',
            message: `Tamu ${a.nama_customer || 'Pengunjung'} (${a.no_polisi}) telah tiba menuju ${a.pic_tujuan || 'PIC Bengkel'}.`,
            linkTab: 'pic-terkait',
            urgency: 'urgent',
          });
        } else if (a.tujuan_kedatangan === 'Beli Part') {
          realtimeHub.publish({
            type: 'VEHICLE_CHECKED_IN',
            targetRoles: ['Admin Invoice', 'Admin Purchasing'],
            title: 'Customer Beli Part Datang',
            message: `${a.nama_customer || 'Pelanggan'} (${a.no_polisi}) tiba di pos untuk pembelian part.`,
            linkTab: 'beli-part',
            urgency: 'info',
          });
        } else {
          realtimeHub.publish({
            type: 'VEHICLE_CHECKED_IN',
            targetRoles: ['SA', 'Customer Fleet'],
            title: 'Kendaraan Masuk Bengkel',
            message: `Unit ${a.no_polisi} (${a.nama_customer || 'Customer'}) telah di-check in. Siap diperiksa SA.`,
            linkTab: 'sa',
            urgency: 'urgent',
          });
        }
      });
      prevAntrianRef.current = antrianList.map((a) => a.id);
    }
  }, [bookingList, antrianList]);

  // Calculate dynamic notifications according to workflow & current role
  const notifications: NotificationItem[] = [];

  if (currentRole === 'SA') {
    // 1. Check-ins without SPK
    const unhandled = (antrianList || []).filter(
      (a) => a.tujuan_kedatangan === 'Service' && a.status_kunjungan === 'Check In'
    );
    unhandled.forEach((a) => {
      notifications.push({
        id: `sa-checkin-${a.id}`,
        title: 'Kendaraan Masuk (Perlu SPK)',
        desc: `Unit ${a.no_polisi} (${a.nama_customer || 'Pelanggan'}) siap dibuatkan SPK & checklist awal.`,
        time: new Date(a.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        tab: 'sa',
        type: 'urgent',
      });
    });

    // 2. PO from Purchasing awaiting SA confirmation
    const pendingPo = (purchasingList || []).filter(
      (p) => p.status_pr === 'PO Diterbitkan' && p.status_konfirmasi_sa === 'Menunggu Konfirmasi'
    );
    pendingPo.forEach((p) => {
      notifications.push({
        id: `sa-po-${p.pr_id}`,
        title: 'Konfirmasi PO & ETA Part',
        desc: `Purchasing telah memilih vendor untuk ${p.no_polisi || 'unit'}. Cek penawaran harga & ETA.`,
        time: 'Hari ini',
        tab: 'sa',
        type: 'warning',
      });
    });

    // 3. SPKs with QC Passed ready for FIR Closed
    const qcPassed = (spkList || []).filter((s) => s.status_spk === 'QC Passed');
    qcPassed.forEach((s) => {
      notifications.push({
        id: `sa-qc-${s.id}`,
        title: 'QC Selesai (Siap FIR Closed)',
        desc: `Foreman telah menyetujui hasil kerja unit ${s.no_polisi}. Lakukan final check & tutup FIR.`,
        time: 'Terkini',
        tab: 'sa',
        type: 'success',
      });
    });
  } else if (currentRole === 'Foreman') {
    // 1. SPKs needing mechanic assignment
    const needAssign = (spkList || []).filter(
      (s) => s.status_spk === 'Menunggu Pengecekan Mekanik' || !s.nama_mekanik
    );
    needAssign.forEach((s) => {
      notifications.push({
        id: `foreman-assign-${s.id}`,
        title: 'SPK Baru (Belum Ditugaskan)',
        desc: `Unit ${s.no_polisi} (${s.nama_customer || 'Armada'}) menunggu penugasan mekanik dari Foreman.`,
        time: 'Menunggu penugasan',
        tab: 'foreman',
        type: 'urgent',
      });
    });

    // 2. Finished work awaiting QC FIR inspection
    const needQc = (spkList || []).filter((s) => s.status_spk === 'Waiting QC');
    needQc.forEach((s) => {
      notifications.push({
        id: `foreman-qc-${s.id}`,
        title: 'Inspeksi QC FIR Diperlukan',
        desc: `Mekanik telah menyelesaikan pengerjaan ${s.no_polisi}. Periksa 5 poin QC untuk approval.`,
        time: 'Menunggu QC',
        tab: 'foreman',
        type: 'warning',
      });
    });

    // 3. Tambahan Pekerjaan waiting for review
    const unverifiedTambahan = (tambahanList || []).filter(
      (t) => !t.diverifikasi_foreman || t.diverifikasi_foreman === 'Menunggu Verifikasi'
    );
    unverifiedTambahan.forEach((t) => {
      notifications.push({
        id: `foreman-tambahan-${t.id}`,
        title: 'Temuan Pekerjaan Tambahan',
        desc: `Mekanik mengajukan temuan: ${t.deskripsi_tambahan.slice(0, 50)}...`,
        time: 'Hari ini',
        tab: 'foreman',
        type: 'info',
      });
    });
  } else if (currentRole === 'Mekanik') {
    // Active jobs assigned
    const activeJobs = (spkList || []).filter(
      (s) =>
        s.status_spk === 'Dalam Pengerjaan' &&
        (!s.nama_mekanik || s.nama_mekanik === currentUser)
    );
    activeJobs.forEach((s) => {
      notifications.push({
        id: `mekanik-job-${s.id}`,
        title: 'Perintah Kerja Aktif (WO)',
        desc: `Unit ${s.no_polisi} - ${s.keluhan_customer || 'Service rutin'}. Lanjutkan pekerjaan & stopwatch.`,
        time: 'Sedang Berjalan',
        tab: 'mekanik',
        type: 'info',
      });
    });
  } else if (currentRole === 'Admin Purchasing') {
    // PRs awaiting PO
    const pendingPr = (purchasingList || []).filter(
      (p) => p.status_pr === 'Diajukan' || p.status_pr === 'Diproses Purchasing'
    );
    pendingPr.forEach((p) => {
      notifications.push({
        id: `purchasing-pr-${p.pr_id}`,
        title: 'Purchase Request Masuk (Kotak Merah)',
        desc: `SA meminta pengadaan part untuk ${p.no_polisi || 'unit SPK'}. Input penawaran min. 2 vendor & ETA.`,
        time: 'Menunggu PO',
        tab: 'purchasing',
        type: 'urgent',
      });
    });
  } else if (currentRole === 'Admin Invoice') {
    // 1. SPKs finished FIR closed needing invoice
    const readyForInv = (spkList || []).filter((s) => s.status_spk === 'FIR Closed');
    readyForInv.forEach((s) => {
      notifications.push({
        id: `kasir-inv-ready-${s.id}`,
        title: 'SPK FIR Closed (Penerbitan Faktur)',
        desc: `Unit ${s.no_polisi} selesai service. Siapkan tagihan & faktur resmi.`,
        time: 'Siap Faktur',
        tab: 'kasir',
        type: 'info',
      });
    });

    // 2. Unpaid invoices
    const unpaidInvoices = (invoiceList || []).filter(
      (i) => i.status_pembayaran === 'Unpaid'
    );
    unpaidInvoices.forEach((i) => {
      notifications.push({
        id: `kasir-unpaid-${i.id}`,
        title: 'Tagihan Menunggu Pembayaran',
        desc: `${i.no_invoice} (${i.no_polisi}): Rp ${Number(i.grand_total).toLocaleString('id-ID')} belum lunas.`,
        time: 'Unpaid',
        tab: 'kasir',
        type: 'warning',
      });
    });
  } else if (currentRole === 'Security') {
    // 1. Ready for checkout
    const paidInvoices = (invoiceList || []).filter(
      (i) => i.status_pembayaran === 'Paid'
    );
    paidInvoices.slice(0, 3).forEach((i) => {
      notifications.push({
        id: `sec-checkout-${i.id}`,
        title: 'Armada Lunas (Validasi Check Out)',
        desc: `Unit ${i.no_polisi} pembayaran lunas. Periksa barang bawaan & cetak Memo Keluar.`,
        time: 'Siap Keluar',
        tab: 'security',
        type: 'success',
      });
    });

    // 2. Today's bookings
    const bookings = (bookingList || []).filter(
      (b) => b.status === 'Booked'
    );
    bookings.slice(0, 3).forEach((b) => {
      notifications.push({
        id: `sec-booking-${b.id}`,
        title: 'Booking Service Hari Ini',
        desc: `Unit ${b.no_polisi} dijadwalkan jam ${b.jam_booking || '08:00'} WIB. Siapkan kartu antrian prioritas.`,
        time: b.jam_booking || 'Hari ini',
        tab: 'security',
        type: 'info',
      });
    });
  } else if (currentRole === 'Customer Fleet') {
    // 1. Additional work approval
    const pendingApproval = (tambahanList || []).filter(
      (t) => t.status_approval_customer === 'Menunggu Approval'
    );
    pendingApproval.forEach((t) => {
      notifications.push({
        id: `fleet-tambahan-${t.id}`,
        title: 'Persetujuan Pekerjaan Tambahan',
        desc: `Ada temuan baru pada unit Anda: ${t.deskripsi_tambahan}. Total: Rp ${Number(t.estimasi_biaya_tambahan).toLocaleString('id-ID')}.`,
        time: 'Penting',
        tab: 'fleet-status',
        type: 'urgent',
      });
    });

    // 2. Active monitored vehicles
    const activeUnits = (spkList || []).filter((s) => s.status_spk !== 'Selesai');
    activeUnits.slice(0, 2).forEach((s) => {
      notifications.push({
        id: `fleet-status-${s.id}`,
        title: `Monitoring Unit ${s.no_polisi}`,
        desc: `Status saat ini: ${s.status_spk}. Estimasi selesai: ${s.lead_time_jam || 6} Jam.`,
        time: 'Realtime',
        tab: 'fleet-status',
        type: 'info',
      });
    });
  } else if (currentRole === 'PIC Terkait') {
    // Incoming visits
    const incoming = (antrianList || []).filter(
      (a) =>
        a.tujuan_kedatangan === 'Kunjungan' &&
        a.status_kunjungan === 'Check In' &&
        (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi') &&
        (!authUser?.id || !a.id_pic || a.id_pic === authUser.id)
    );
    incoming.forEach((a) => {
      notifications.push({
        id: `pic-visit-${a.id}`,
        title: 'Kunjungan Tamu di Pos Security',
        desc: `Tamu ${a.nama_customer || 'Pengunjung'} (${a.no_polisi}) menunggu konfirmasi kedatangan.`,
        time: new Date(a.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        tab: 'pic-terkait',
        type: 'urgent',
      });
    });
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (tab: string) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'info':
      default:
        return <Wrench className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBadgeColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-rose-50 border-rose-200 text-rose-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Button (min 44x44px touch target) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[6px] text-[#525C65] hover:text-[#1B2126] hover:bg-[#F2F4F5] active:bg-[#E6F3F5] transition-colors cursor-pointer"
        title="Pusat Notifikasi Sistem"
        aria-label="Pusat Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#DC2626] text-white rounded-[4px] text-[10px] font-bold flex items-center justify-center animate-pulse shadow-2xs font-mono">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-sm bg-white rounded-[6px] border border-[#D8DCDF] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="p-3.5 border-b border-[#D8DCDF] bg-[#F2F4F5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[4px] bg-[#E6F3F5] text-[#0F6674] flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1B2126] leading-tight">Pusat Notifikasi</h4>
                <p className="text-[10px] text-[#79838C] font-medium">Alur Operasional • {currentRole}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#E6F3F5] text-[#0F6674] border border-[#B2D8DC] text-[10px] font-bold tabular-nums">
              {notifications.length} Menunggu
            </span>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#D8DCDF]">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item.tab)}
                  className="p-3 hover:bg-[#F2F4F5] transition-colors cursor-pointer flex items-start gap-2.5 group"
                >
                  <div className={`w-8 h-8 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5 ${getBadgeColor(item.type)}`}>
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#1B2126] group-hover:text-[#0F6674] transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono font-medium text-[#79838C] shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#525C65] mt-0.5 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#0F6674] group-hover:underline">
                      <span>Tindak Lanjuti</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-[6px] bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mx-auto mb-2.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h5 className="text-xs font-bold text-[#1B2126]">Semua Tugas Beres</h5>
                <p className="text-[11px] text-[#79838C] mt-1">Tidak ada tindakan mendesak atau pekerjaan yang menunggu di role Anda saat ini.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#F2F4F5] border-t border-[#D8DCDF] text-center">
            <span className="text-[10px] text-[#79838C] font-mono">
              KIM3 Workshop Shell • Backendless API
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
