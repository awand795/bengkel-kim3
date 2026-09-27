import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, normalizePlat } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import type { AntrianKunjungan, TransaksiBeliPart, SpkService } from '../../types';

// Peran internal yang mengonfirmasi kunjungan via modul Kunjungan / PIC Terkait.
// (Security = pengirim; Super Admin navigasi manual.)
const KUNJUNGAN_ROLES = [
  'SA',
  'Foreman',
  'Mekanik',
  'Admin Purchasing',
  'Admin Invoice',
  'Warehouse',
  'PIC Terkait',
];

const SPK_APPROVAL_STATUSES = ['Menunggu Approval Customer', 'Waiting Approval'];

/**
 * ApprovalAutoPopup — watcher global approval realtime.
 *
 * Data-driven (bukan event-driven): BroadcastChannel hanya instan di browser
 * yang sama, sedangkan antar-device mengandalkan polling. Dengan mengawasi
 * query yang memang sudah di-poll (cache dipakai ulang — tanpa beban server
 * tambahan), popup konsisten di semua kondisi: tab lain, modul lain,
 * bahkan backlog yang sudah menunggu sebelum login (ikut antre FIFO).
 *
 * Aturan: satu modal dalam satu waktu (kunci approvalModalOpen), id ditandai
 * seen saat ditembak (tutup tanpa aksi = tak muncul lagi sesi ini), aksi
 * Setujui/Tolak mengeluarkan item dari antre via perubahan status.
 */
export const ApprovalAutoPopup: React.FC = () => {
  const {
    currentRole,
    authUser,
    currentUser,
    isLoggedIn,
    setActiveTab,
    approvalModalOpen,
    fleetPendingPartId,
    fleetPendingSpkId,
    kunjunganPendingId,
    setFleetPendingPartId,
    setFleetPendingSpkId,
    setKunjunganPendingId,
  } = useAppStore();

  const seenRef = useRef<Set<string>>(new Set());
  const userKeyRef = useRef<string>('');

  const watchFleet = isLoggedIn && currentRole === 'Customer Fleet';
  const watchKunjungan = isLoggedIn && KUNJUNGAN_ROLES.includes(currentRole);

  // QueryKey SAMA dengan view (cache dipakai ulang — tanpa request tambahan
  // bila view terkait sudah mem-poll).
  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
    enabled: watchKunjungan,
  });
  const { data: beliPartList } = useQuery({
    queryKey: ['beli-part-list'],
    queryFn: api.getBeliPartList,
    refetchInterval: 8000,
    enabled: watchFleet,
  });
  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
    enabled: watchFleet,
  });
  const { data: kendaraanList } = useQuery({
    queryKey: ['kendaraan-list'],
    queryFn: api.getKendaraan,
    enabled: watchFleet,
  });

  // Ganti user login → reset seen (mencegah popup milik sesi lama bocor).
  const userKey = authUser?.email || authUser?.nama_lengkap || currentUser || '';
  useEffect(() => {
    if (userKeyRef.current !== userKey) {
      userKeyRef.current = userKey;
      seenRef.current = new Set();
    }
  }, [userKey]);

  // Predikat kepemilikan (cerminan WebFleetCustomerView — guard atas filter tenant SQL)
  const myPelangganId = authUser?.id_pelanggan ?? null;
  const myCompanyName = (authUser?.nama_perusahaan || authUser?.nama_lengkap || '').toLowerCase().trim();
  const myPlateSet = new Set(
    (kendaraanList || []).map((k) => normalizePlat(k.no_polisi || ''))
  );
  const isMySpk = (s: SpkService) => {
    if (myPelangganId && s.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && s.nama_customer && s.nama_customer.toLowerCase().trim() === myCompanyName) return true;
    if (s.no_polisi && myPlateSet.has(normalizePlat(s.no_polisi))) return true;
    return false;
  };
  const isMyBeliPart = (t: TransaksiBeliPart) => {
    if (t.no_polisi && myPlateSet.has(normalizePlat(t.no_polisi))) return true;
    if (myCompanyName && t.nama_customer && t.nama_customer.toLowerCase().trim() === myCompanyName) return true;
    return false;
  };
  const isKunjunganMurni = (a: AntrianKunjungan) =>
    a.tujuan_kedatangan === 'Kunjungan' || a.tujuan_kedatangan === 'Lainnya';

  // Tembak satu item tertua yang belum seen, bila tak ada modal/link tertunda.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (approvalModalOpen) return;
    if (fleetPendingPartId != null || fleetPendingSpkId != null || kunjunganPendingId != null) return;

    type Candidate = { key: string; ts: string; fire: () => void };
    const candidates: Candidate[] = [];

    if (watchFleet) {
      (beliPartList || [])
        .filter((t) => t.status_transaksi === 'Menunggu Approval' && isMyBeliPart(t))
        .forEach((t) =>
          candidates.push({
            key: `part:${t.id}`,
            ts: String(t.created_at || ''),
            fire: () => {
              setActiveTab('fleet-history');
              setFleetPendingPartId(t.id);
            },
          })
        );
      (spkList || [])
        .filter((s) => SPK_APPROVAL_STATUSES.includes(s.status_spk as string) && isMySpk(s))
        .forEach((s) =>
          candidates.push({
            key: `spk:${s.id}`,
            ts: String(s.created_at || ''),
            fire: () => {
              setActiveTab('fleet-history');
              setFleetPendingSpkId(s.id);
            },
          })
        );
    }

    if (watchKunjungan) {
      (antrianList || [])
        .filter(
          (a) =>
            isKunjunganMurni(a) &&
            (a.status_kunjungan === 'Check In' || a.status_kunjungan === 'Sedang Dikerjakan') &&
            (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi')
        )
        .forEach((a) =>
          candidates.push({
            key: `kunj:${a.id}`,
            ts: String(a.waktu_masuk || ''),
            fire: () => {
              setActiveTab(currentRole === 'PIC Terkait' ? 'pic-terkait' : 'kunjungan');
              setKunjunganPendingId(a.id);
            },
          })
        );
    }

    const fresh = candidates
      .filter((c) => !seenRef.current.has(c.key))
      .sort((x, y) => x.ts.localeCompare(y.ts));
    if (fresh.length === 0) return;
    seenRef.current.add(fresh[0].key);
    fresh[0].fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoggedIn,
    approvalModalOpen,
    fleetPendingPartId,
    fleetPendingSpkId,
    kunjunganPendingId,
    antrianList,
    beliPartList,
    spkList,
    kendaraanList,
    currentRole,
    watchFleet,
    watchKunjungan,
  ]);

  return null;
};
