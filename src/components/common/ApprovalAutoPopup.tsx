import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import type { SpkService } from '../../types';

const SPK_APPROVAL_STATUSES = ['Menunggu Approval Customer', 'Waiting Approval'];

/**
 * ApprovalAutoPopup — watcher global approval realtime untuk Customer Fleet.
 */
export const ApprovalAutoPopup: React.FC = () => {
  const {
    authUser,
    currentUser,
    isLoggedIn,
    setActiveTab,
    approvalModalOpen,
    fleetPendingSpkId,
    setFleetPendingSpkId,
  } = useAppStore();

  const seenRef = useRef<Set<string>>(new Set());
  const userKeyRef = useRef<string>('');

  const { data: spkPageData } = useQuery({
    queryKey: ['spk-approval-watch'],
    queryFn: () => api.getSpkListPage({ page: 1, limit: 20 }),
    refetchInterval: 8000,
    enabled: isLoggedIn,
  });
  const spkList = spkPageData?.rows;

  const userKey = authUser?.email || authUser?.nama_lengkap || currentUser || '';
  useEffect(() => {
    if (userKeyRef.current !== userKey) {
      userKeyRef.current = userKey;
      seenRef.current = new Set();
    }
  }, [userKey]);

  const myPelangganId = authUser?.id_pelanggan ?? null;
  const myCompanyName = (authUser?.nama_perusahaan || authUser?.nama_lengkap || '').toLowerCase().trim();

  const isMySpk = (s: SpkService) => {
    if (myPelangganId && s.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && s.nama_customer && s.nama_customer.toLowerCase().trim() === myCompanyName) return true;
    if (authUser?.role === 'Customer_Fleet') return true;
    return false;
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (approvalModalOpen) return;
    if (fleetPendingSpkId != null) return;

    type Candidate = { key: string; ts: string; fire: () => void };
    const candidates: Candidate[] = [];

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

    const fresh = candidates
      .filter((c) => !seenRef.current.has(c.key))
      .sort((x, y) => x.ts.localeCompare(y.ts));
    if (fresh.length === 0) return;
    seenRef.current.add(fresh[0].key);
    fresh[0].fire();
  }, [
    isLoggedIn,
    approvalModalOpen,
    fleetPendingSpkId,
    spkList,
  ]);

  return null;
};

export default ApprovalAutoPopup;
