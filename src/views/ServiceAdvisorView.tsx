import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { SpkService } from '../types';
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
import { useAppStore } from '../store/useAppStore';
import { usePpnRate } from '../hooks/usePpnRate';
import { 
  ClipboardList, 
  Wrench, 
  PlusCircle, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Check, 
  X, 
  ShoppingBag,
  Eye,
  FileCheck,
  Printer,
  Package,
  AlertCircle,
  Trash2,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Car,
  Zap
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';
import { PaginationBar } from '../components/common/PaginationBar';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';

export const ServiceAdvisorView: React.FC<{ initialTab?: 'penerimaan' | 'spk-list' | 'estimasi-pr' | 'fir-closed' }> = ({ initialTab = 'spk-list' }) => {
  const queryClient = useQueryClient();
  const { currentUser, saPendingAntrianId, setSaPendingAntrianId, navTick, activeTab: storeActiveTab } = useAppStore();
  const [activeTab, setActiveTab] = useState<'penerimaan' | 'spk-list' | 'estimasi-pr' | 'fir-closed'>(initialTab);

  // Sinkron tab internal saat navigasi deep-link (mis. Dashboard "Buat SPK" -> penerimaan)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Reset ke tab utama saat menu sidebar diklik (termasuk klik ulang menu yang sama)
  useEffect(() => {
    if (!navTick) return;
    if (storeActiveTab === 'sa-penerimaan') setActiveTab('penerimaan');
    else if (storeActiveTab === 'purchasing') setActiveTab('estimasi-pr');
    else if (storeActiveTab === 'sa') setActiveTab('spk-list');
  }, [navTick, storeActiveTab]);
  const [selectedSpk, setSelectedSpk] = useState<SpkService | null>(null);
  const [showPrModal, setShowPrModal] = useState<SpkService | null>(null);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);
  const [showFinalCheckModal, setShowFinalCheckModal] = useState<SpkService | null>(null);

  // Form Pemeriksaan Akhir (Final Check SA) Checklist State
  const [finalCheckForm, setFinalCheckForm] = useState({
    kebersihan: false,
    tes_jalan: false,
    kelengkapan_surat: false,
    catatan_final: '',
  });

  const handleOpenFinalCheck = (spk: SpkService) => {
    setShowFinalCheckModal(spk);
    setFinalCheckForm({
      kebersihan: false,
      tes_jalan: false,
      kelengkapan_surat: false,
      catatan_final: '',
    });
  };

  const isFinalCheckValid = 
    finalCheckForm.kebersihan && 
    finalCheckForm.tes_jalan && 
    finalCheckForm.kelengkapan_surat;

  // Search & Filter State for SPK List
  const [saSearchQuery, setSaSearchQuery] = useState('');
  const [saStatusFilter, setSaStatusFilter] = useState<'Semua' | 'Dalam Pengerjaan' | 'Waiting Part' | 'QC Passed' | 'FIR Closed'>('Semua');
  const [spkPage, setSpkPage] = useState(1);
  const [spkLimit, setSpkLimit] = useState(10);

  // Form Penerimaan State (Create SPK awal)
  const [formPenerimaan, setFormPenerimaan] = useState({
    id_antrian: undefined as number | undefined,
    no_polisi: '',
    nama_customer: '',
    no_hp_customer: '',
    jenis_layanan: 'Service Truk / Berkala',
    odometer_km: 0,
    foto_kendaraan_masuk: '',
    foto_odometer: '',
    foto_stnk: '',
    foto_kir: '',
    keluhan_customer: '',
    cek_body: 'OK',
    cek_mesin: 'OK',
    cek_kelistrikan: 'OK',
    cek_kaki_kaki: 'OK',
    catatan_kondisi_awal: '',
    estimasi_waktu_jam: 6,
    lead_time_jam: 6,
    catatan_sa: '',
  });

  // Part Selection State for Estimasi Modal
  const [showEstimasiModal, setShowEstimasiModal] = useState<SpkService | null>(null);
  const [selectedParts, setSelectedParts] = useState<Array<{
    kode_part: string;
    nama_part: string;
    jumlah: number;
    satuan: string;
    harga_satuan: number;
    stok: number;
  }>>([]);
  const [partPickerId, setPartPickerId] = useState<string>('');
  const [partPickerQty, setPartPickerQty] = useState<number>(1);
  const [estimasiWaktu, setEstimasiWaktu] = useState<number>(6);
  // Picker tambahan SA tersembunyi di balik tombol (sumber utama = inputan Foreman)
  const [showPartPicker, setShowPartPicker] = useState<boolean>(false);

  // Jasa Servis Dasar: pilihan sistem — sertakan atau tidak + nominal bisa diisi.
  // Default ikut & Rp 250.000 (mempertahankan perilaku lama).
  const [jasaTermasuk, setJasaTermasuk] = useState<boolean>(true);
  const [jasaNominal, setJasaNominal] = useState<number>(250000);

  const resetEstimasiForm = () => {
    setSelectedParts([]);
    setPartPickerId('');
    setPartPickerQty(1);
    setShowPartPicker(false);
    setEstimasiWaktu(6);
    setJasaTermasuk(true);
    setJasaNominal(250000);
  };

  // Form PR (Purchase Request)
  const [prNote, setPrNote] = useState('');

  // Picker part PR manual: select + jumlah, bisa beberapa item (sesuai kondisi)
  const [prParts, setPrParts] = useState<Array<{
    kode_part: string;
    nama_part: string;
    jumlah: number;
    satuan: string;
    stok: number;
  }>>([]);
  const [prPickerId, setPrPickerId] = useState<string>('');
  const [prPickerQty, setPrPickerQty] = useState<number>(1);

  const resetPrForm = () => {
    setPrParts([]);
    setPrPickerId('');
    setPrPickerQty(1);
    setPrNote('');
  };

  // Prefill PR dari part SPK yang tidak ready (SA tinggal tambah/kurangi)
  useEffect(() => {
    if (!showPrModal) return;
    resetPrForm();
    const indent = (spkPartList || [])
      .filter((p) => p.id_spk === showPrModal.id && (p.status_ketersediaan || '') !== 'Ready di Stock')
      .map((ep) => {
        const master = masterStokPart?.find((m) => m.kode_part === ep.kode_part);
        return {
          kode_part: ep.kode_part || '',
          nama_part: ep.nama_part,
          jumlah: ep.jumlah,
          satuan: ep.satuan || '',
          stok: master ? master.stok : 0,
        };
      });
    if (indent.length > 0) setPrParts(indent);
  }, [showPrModal]);

  // Queries
  const { data: spkList, isLoading: loadingSpk } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: masterStokPart } = useQuery({
    queryKey: ['stok-part'],
    queryFn: api.getStokPart,
  });

  // Part inputan Foreman (sumber utama kebutuhan SPK — SA tinggal verifikasi
  // harga/jumlah, bukan input ulang dari nol)
  const { data: spkPartList } = useQuery({
    queryKey: ['part-spk-list'],
    queryFn: api.getPartSpk,
    refetchInterval: 8000,
  });

  // Baris pekerjaan SPK (untuk prefill & sinkron Jasa Servis Dasar)
  const { data: spkPekerjaanList } = useQuery({
    queryKey: ['pekerjaan-spk-list'],
    queryFn: api.getPekerjaanSpk,
    refetchInterval: 8000,
  });

  // Nama baku baris jasa (sama persis di submit & prefill agar tidak ganda)
  const JASA_NAMA = 'Jasa Servis Dasar';

  // Prefill modal estimasi saat dibuka: part foreman tampil read-only (derivasi),
  // buffer tambahan SA dikosongkan, picker tertutup.
  useEffect(() => {
    if (!showEstimasiModal) return;
    setSelectedParts([]);
    setPartPickerId('');
    setPartPickerQty(1);
    setShowPartPicker(false);
    if (showEstimasiModal.estimasi_waktu_jam) setEstimasiWaktu(showEstimasiModal.estimasi_waktu_jam);
    // Prefill jasa dari baris tersimpan (bila ada); default ikut Rp 250.000
    const existingJasa = (spkPekerjaanList || []).find(
      (p) => p.id_spk === showEstimasiModal.id && (p.nama_pekerjaan || '').trim().toLowerCase() === JASA_NAMA.toLowerCase()
    );
    if (existingJasa) {
      const nominal = Number(existingJasa.biaya_jasa) || 0;
      setJasaTermasuk(nominal > 0);
      setJasaNominal(nominal > 0 ? nominal : 250000);
    } else {
      setJasaTermasuk(true);
      setJasaNominal(250000);
    }
  }, [showEstimasiModal, spkPekerjaanList]);

  // Part inputan Foreman (sumber utama, read-only): stok live dari master gudang,
  // fallback status ketersediaan tersimpan bila master belum termuat.
  const foremanParts = (spkPartList || [])
    .filter((p) => p.id_spk === showEstimasiModal?.id)
    .map((ep) => {
      const master = masterStokPart?.find((m) => m.kode_part === ep.kode_part);
      const stok = master ? master.stok : (ep.status_ketersediaan === 'Ready di Stock' ? ep.jumlah : 0);
      return {
        kode_part: ep.kode_part || '',
        nama_part: ep.nama_part,
        jumlah: ep.jumlah,
        satuan: ep.satuan || '',
        harga_satuan: Number(ep.harga_satuan) || 0,
        stok,
      };
    });

  const { data: antrianList, isError: antrianError, error: antrianErrorDetail, refetch: refetchAntrian, isFetching: antrianFetching } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const antrianMenungguSA = (antrianList || []).filter(
    a => a.status_kunjungan === 'Check In' && a.tujuan_kedatangan === 'Service'
  );

  // Helper: populate formPenerimaan from an antrian record
  const fillAntrianToForm = useCallback((antrian: typeof antrianMenungguSA[0]) => {
    setFormPenerimaan(prev => ({
      ...prev,
      id_antrian: antrian.id,
      no_polisi: antrian.no_polisi,
      nama_customer: antrian.nama_customer || '',
      no_hp_customer: antrian.no_hp_customer || '',
      keluhan_customer: antrian.keperluan || antrian.catatan_security || '',
      foto_kendaraan_masuk: antrian.foto_kendaraan_masuk || '',
    }));
  }, []);

  // Auto-select antrian when opening "penerimaan" tab and no vehicle is selected yet
  useEffect(() => {
    if (activeTab === 'penerimaan' && !formPenerimaan.id_antrian && antrianMenungguSA.length > 0) {
      fillAntrianToForm(antrianMenungguSA[0]);
    }
  }, [activeTab, antrianMenungguSA.length, formPenerimaan.id_antrian, fillAntrianToForm]);

  // Deep-link dari Dashboard: pilihan "Buat SPK" pada baris antrian tertentu
  // langsung mengisi form penerimaan dengan antrian tersebut (konsumsi sekali).
  useEffect(() => {
    if (saPendingAntrianId && antrianMenungguSA.length > 0) {
      const target = antrianMenungguSA.find(a => a.id === saPendingAntrianId);
      if (target) {
        fillAntrianToForm(target);
      }
      setSaPendingAntrianId(null);
    }
  }, [saPendingAntrianId, antrianMenungguSA, fillAntrianToForm, setSaPendingAntrianId]);

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
  });

  // PR aktif untuk sebuah SPK (belum selesai barangnya): kunci ajuan PR ganda
  // dan jadi penanda bahwa estimasi sudah terkirim (bagian "ketutup").
  const prAktifUntukSpk = (idSpk: number) =>
    (purchasingList || []).find(
      (p) => p.id_spk === idSpk && p.status_pr !== 'Barang Ready' && (p.status_pr || '') !== 'Ditolak'
    );

  // Tab Kotak Merah SA: default sembunyikan PR yang sudah selesai (Barang Ready).
  // Toggle untuk melihat riwayat selesai (read-only).
  const [prShowSelesai, setPrShowSelesai] = useState<boolean>(false);
  const prListSA = (purchasingList || []).filter((p) =>
    prShowSelesai ? p.status_pr === 'Barang Ready' : p.status_pr !== 'Barang Ready'
  );

  const handleAddPartToEstimasi = () => {
    if (!partPickerId) return;
    const item = masterStokPart?.find(p => p.kode_part === partPickerId);
    if (!item) return;

    const exists = selectedParts.find(p => p.kode_part === item.kode_part);
    if (exists) {
      setSelectedParts(selectedParts.map(p => 
        p.kode_part === item.kode_part ? { ...p, jumlah: p.jumlah + partPickerQty } : p
      ));
    } else {
      setSelectedParts([...selectedParts, {
        kode_part: item.kode_part,
        nama_part: item.nama_part,
        jumlah: partPickerQty,
        satuan: item.satuan,
        harga_satuan: Number(item.harga_jual),
        stok: item.stok,
      }]);
    }
    setPartPickerId('');
    setPartPickerQty(1);
  };

  const handleRemovePartFromEstimasi = (kode: string) => {
    setSelectedParts(selectedParts.filter(p => p.kode_part !== kode));
  };

  // Total & cek stok gabungan: part foreman (utama) + tambahan SA.
  const allEstimasiParts = [...foremanParts, ...selectedParts];
  const hasEmptyStock = allEstimasiParts.some(p => p.stok === 0 || p.jumlah > p.stok);
  const emptyPartsList = allEstimasiParts.filter(p => p.stok === 0 || p.jumlah > p.stok);
  const partsSubtotal = allEstimasiParts.reduce((acc, p) => acc + (p.harga_satuan * p.jumlah), 0);
  const jasaAktif = jasaTermasuk ? Math.max(0, jasaNominal || 0) : 0;
  const totalEstimasiBiaya = jasaAktif + partsSubtotal; // Jasa servis dasar (opsional) + sparepart

  // Submit Penerimaan Kendaraan ke Foreman.
  // Status awal 'Menunggu Pengecekan Mekanik' ditulis langsung oleh API
  // /kim3/spk-buat (satu panggilan), sesuai alur: SA -> Foreman.
  const createSpkMutation = useMutation({
    mutationFn: async (data: typeof formPenerimaan) => {
      const spkNo = `SPK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      await api.buatSpk({
        no_spk: spkNo,
        id_antrian: data.id_antrian,
        no_polisi: data.no_polisi,
        nama_customer: data.nama_customer,
        odometer_km: Number(data.odometer_km),
        foto_odometer: data.foto_odometer,
        foto_stnk: data.foto_stnk,
        foto_kir: data.foto_kir,
        keluhan_customer: data.keluhan_customer,
        cek_body: data.cek_body,
        cek_mesin: data.cek_mesin,
        cek_kelistrikan: data.cek_kelistrikan,
        cek_kaki_kaki: data.cek_kaki_kaki,
        catatan_kondisi_awal: data.catatan_kondisi_awal,
        nama_sa: currentUser,
        estimasi_waktu_jam: data.estimasi_waktu_jam,
        lead_time_jam: data.lead_time_jam,
        catatan_sa: data.catatan_sa,
      });

      return { spkNo };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // 1. Notifikasi untuk Foreman (distribusi pekerjaan).
      // Mekanik BELUM diberi tahu di tahap ini: WO baru masuk antrian Foreman,
      // notif personal ke mekanik dikirim saat Foreman menugaskan (assign).
      realtimeHub.publish({
        type: 'SPK_CREATED',
        targetRoles: ['Foreman'],
        title: 'SPK Penerimaan Dibuat',
        message: `SPK untuk unit ${formPenerimaan.no_polisi} (${formPenerimaan.nama_customer || 'Armada'}) siap untuk dicek dan didistribusikan ke Mekanik.`,
        linkTab: 'foreman',
        urgency: 'info',
      });

      // 2. Notifikasi untuk Customer PEMILIK plat saja (anti-bocor antar akun)
      await publishKeCustomer({
        type: 'SPK_CREATED',
        title: 'SPK Penerimaan Armada Diterbitkan',
        message: `Unit ${formPenerimaan.no_polisi} telah diinspeksi awal oleh Service Advisor dan SPK resmi telah diterbitkan.`,
        linkTab: 'fleet-status',
        urgency: 'info',
        noPolisi: formPenerimaan.no_polisi,
      });
      toast.success('SPK Penerimaan Kendaraan berhasil dibuat! Kendaraan diserahkan ke Foreman untuk Pengecekan.');

      setFormPenerimaan({
        id_antrian: undefined,
        no_polisi: '',
        nama_customer: '',
        no_hp_customer: '',
        jenis_layanan: 'Service Truk / Berkala',
        odometer_km: 0,
        foto_kendaraan_masuk: '',
        foto_odometer: '',
        foto_stnk: '',
        foto_kir: '',
        keluhan_customer: '',
        cek_body: 'OK',
        cek_mesin: 'OK',
        cek_kelistrikan: 'OK',
        cek_kaki_kaki: 'OK',
        catatan_kondisi_awal: '',
        estimasi_waktu_jam: 6,
        lead_time_jam: 6,
        catatan_sa: '',
      });
      setActiveTab('spk-list');
    },
    onError: (err: any) => toast.error('Gagal membuat SPK: ' + getApiErrorMessage(err)),
  });

  // Submit Estimasi Biaya (Setelah Pengecekan Mekanik)
  const submitEstimasiMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      // Kunci kirim ganda: verifikasi status fresh dari server. Modal basi
      // (dibuka saat Estimasi Dibuat, disubmit setelah status berubah) ditolak.
      const freshList = await api.getSpkList();
      const fresh = freshList.find((s) => s.id === spk.id);
      if (!fresh) throw new Error('SPK tidak ditemukan di server. Muat ulang halaman.');
      if (fresh.status_spk !== 'Estimasi Dibuat') {
        throw new Error(`Estimasi sudah diproses (status kini: ${fresh.status_spk}). Muat ulang untuk status terbaru.`);
      }
      // 1. Simpan item part yang dipilih ke SPK.
      // Anti-duplikat: lewati kode_part yang sudah ada (revisi/re-submit aman).
      const existingParts = await api.getPartSpk();
      const existingCodes = new Set(
        (existingParts || []).filter((ep) => ep.id_spk === spk.id && ep.kode_part).map((ep) => ep.kode_part as string)
      );
      for (const p of selectedParts) {
        if (p.kode_part && existingCodes.has(p.kode_part)) continue;
        await api.tambahPartSpk({
          id_spk: spk.id,
          kode_part: p.kode_part,
          nama_part: p.nama_part,
          jumlah: p.jumlah,
          satuan: p.satuan,
          harga_satuan: p.harga_satuan,
          subtotal: p.harga_satuan * p.jumlah,
          status_ketersediaan: p.stok > 0 ? 'Ready di Stock' : 'Tidak Ready di Stock',
        });
      }

      // 1b. Sinkron baris Jasa Servis Dasar (rinci terpisah, tampil di approval customer).
      // Upsert: update bila baris sudah ada, insert bila belum. Dicentang -> nominal,
      // tidak dicentang -> Rp 0 bila baris sudah ada (jujur tampil), lewati bila belum ada.
      if (jasaAktif > 0) {
        const simpanRes = await api.simpanPekerjaanSpk({
          id_spk: spk.id,
          nama_pekerjaan: JASA_NAMA,
          biaya_jasa: jasaAktif,
          estimasi_durasi_jam: estimasiWaktu,
        });
        if (!(simpanRes?.rows_affected > 0)) {
          await api.tambahPekerjaanSpk({
            id_spk: spk.id,
            nama_pekerjaan: JASA_NAMA,
            kategori: 'Jasa',
            biaya_jasa: jasaAktif,
            estimasi_durasi_jam: estimasiWaktu,
          });
        }
      } else {
        await api.simpanPekerjaanSpk({
          id_spk: spk.id,
          nama_pekerjaan: JASA_NAMA,
          biaya_jasa: 0,
        });
      }

      // Update SPK dgn biaya dan waktu
      await api.updateSpkStatus({
        id: spk.id,
        estimasi_biaya: totalEstimasiBiaya,
        estimasi_waktu_jam: estimasiWaktu,
      });

      // 2. Jika ada part yang kosong (stok = 0): Otomatis terbitkan PR Kotak Merah & Set status Waiting Part
      if (hasEmptyStock) {
        const prNo = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const emptyNames = emptyPartsList.map(p => `${p.nama_part} (${p.kode_part})`).join(', ');

        await api.updateSpkStatus({ id: spk.id, status_spk: 'Waiting Part' });
        await api.ajukanPR({
          no_pr: prNo,
          id_spk: spk.id,
          nama_sa_pemohon: currentUser,
          catatan_pr: `Otomatis dari Estimasi SA: Sparepart [${emptyNames}] stok gudang KOSONG / INDENT. Pengadaan segera melalui alur Kotak Merah.`,
        });

        return { hasEmptyStock: true, emptyNames };
      }

      // Jika ready, langsung lempar ke Approval Customer
      await api.updateSpkStatus({ id: spk.id, status_spk: 'Menunggu Approval Customer' });
      return { hasEmptyStock: false, emptyNames: '' };
    },
    onSuccess: (result, spk) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['pekerjaan-spk-list'] });
      
      if (result.hasEmptyStock) {
        realtimeHub.publish({
          type: 'PURCHASE_REQUEST_CREATED',
          targetRoles: ['Admin Purchasing', 'SA'],
          title: 'PR Part Masuk (Kotak Merah)',
          message: `Estimasi SPK ${spk.no_spk} memerlukan [${result.emptyNames}] yang kosong di gudang. Status kendaraan: Waiting Part.`,
          linkTab: 'purchasing',
          urgency: 'warning',
        });
        toast.warning(`Estimasi Berhasil! Sparepart [${result.emptyNames}] stoknya KOSONG di gudang, PR diajukan dan status armada diset ke "Waiting Part".`);
      } else {
        toast.success('Estimasi Biaya berhasil disubmit ke Customer untuk Approval.');
      }
      setShowEstimasiModal(null);
      resetEstimasiForm();
    },
    onError: (err: any) => toast.error('Gagal submit estimasi: ' + getApiErrorMessage(err)),
  });

  // Buat PR (Purchase Request) jika Sparepart tidak Ready.
  // Rincian disusun otomatis dari part terpilih (multi-item) + catatan SA.
  const prMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      if (prParts.length === 0) {
        throw new Error('Pilih minimal 1 sparepart yang dibutuhkan sebelum mengirim PR.');
      }
      // Kunci PR ganda: verifikasi fresh — tolak bila SPK sudah lewat tahap
      // estimasi atau sudah ada PR aktif.
      const [freshSpkList, freshPrList] = await Promise.all([api.getSpkList(), api.getPurchasingList()]);
      const fresh = freshSpkList.find((s) => s.id === spk.id);
      if (!fresh) throw new Error('SPK tidak ditemukan di server. Muat ulang halaman.');
      if (fresh.status_spk !== 'Estimasi Dibuat') {
        throw new Error(`PR hanya bisa diajukan saat "Estimasi Dibuat" (status kini: ${fresh.status_spk}).`);
      }
      const prAktif = (freshPrList || []).find(
        (p) => p.id_spk === spk.id && p.status_pr !== 'Barang Ready' && (p.status_pr || '') !== 'Ditolak'
      );
      if (prAktif) {
        throw new Error(`SPK ini sudah memiliki PR aktif ${prAktif.no_pr} (${prAktif.status_pr}).`);
      }
      const prNo = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const lines = prParts.map((p, i) =>
        `${i + 1}. ${p.nama_part}${p.kode_part ? ` (${p.kode_part})` : ''} — butuh ${p.jumlah} ${p.satuan} (stok gudang: ${p.stok})`
      );
      const catatan = `Kebutuhan sparepart (${prParts.length} item):\n${lines.join('\n')}${prNote.trim() ? `\nCatatan SA: ${prNote.trim()}` : ''}`;
      return api.ajukanPR({
        no_pr: prNo,
        id_spk: spk.id,
        nama_sa_pemohon: currentUser,
        catatan_pr: catatan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      toast.success('Purchase Request berhasil diajukan ke Admin Purchasing!');
      setShowPrModal(null);
      resetPrForm();
    },
    onError: (err: any) => toast.error('Gagal mengajukan PR: ' + getApiErrorMessage(err)),
  });

  // Konfirmasi SA terhadap Penawaran PO & ETA dari Purchasing
  const konfirmasiPoMutation = useMutation({
    mutationFn: async ({ poId, setuju }: { poId: number; setuju: boolean }) => {
      return api.konfirmasiSA({
        id: poId,
        status_konfirmasi_sa: setuju ? 'Disetujui SA' : 'Ditolak SA',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success('Respon konfirmasi ketersediaan barang berhasil diperbarui!');
    },
  });

  // Tarif PPN dari database (tanpa fallback): wajib ada untuk terbitkan invoice
  const { rate: ppnRate } = usePpnRate();

  // SA FIR Closed & Terbitkan Invoice Otomatis
  const firClosedMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      if (ppnRate === null) {
        throw new Error('Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem.');
      }
      // 1. Update SPK to FIR Closed with SA final check notes
      await api.updateSpkStatus({
        id: spk.id,
        status_spk: 'FIR Closed',
        catatan_sa: `[Final Check SA Disetujui]: Kebersihan (OK), Uji Fisik/Tes Jalan (OK), Dokumen & Surat (OK). Catatan: ${finalCheckForm.catatan_final}`,
      });

      // 2. Buat Invoice otomatis (PPN dari database)
      const invNo = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const subtotal = Number(spk.estimasi_biaya || 0);
      const ppn = Math.round(subtotal * (ppnRate / 100));
      const grandTotal = subtotal + ppn;

      await api.buatInvoice({
        no_invoice: invNo,
        id_spk: spk.id,
        // Tenant linkage agar faktur terlihat customer (filter id_pelanggan di API).
        // Bila SPK tak punya id_pelanggan, server fallback dari SPK itu sendiri.
        id_pelanggan: spk.id_pelanggan ?? undefined,
        no_polisi: spk.no_polisi,
        nama_customer: spk.nama_customer,
        subtotal: subtotal,
        ppn_nominal: ppn,
        diskon: 0,
        grand_total: grandTotal,
        metode_pembayaran: 'Transfer Bank',
        kasir_pic: 'Kasir',
      });

      return { invNo, grandTotal };
    },
    onSuccess: async (result, spk) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // 3. Notifikasi invoice terbit ke customer pemilik SAJA
      // (sebelumnya hilang total; broadcast mentah juga bocor antar akun)
      await publishKeCustomer({
        type: 'SPK_STATUS_CHANGED',
        title: 'Invoice Service Terbit',
        message: `Invoice ${result.invNo} untuk unit ${spk.no_polisi} (SPK: ${spk.no_spk}) sebesar Rp ${Number(result.grandTotal || 0).toLocaleString('id-ID')} telah terbit. Silakan lakukan pembayaran di Kasir.`,
        linkTab: 'fleet-history',
        urgency: 'urgent',
        noPolisi: spk.no_polisi,
        pelangganId: spk.id_pelanggan ?? null,
      });
      realtimeHub.publish({
        type: 'SPK_STATUS_CHANGED',
        targetRoles: ['Admin Invoice'],
        title: 'Invoice Baru Masuk Kasir',
        message: `Invoice ${result.invNo} (${spk.no_polisi}) Rp ${Number(result.grandTotal || 0).toLocaleString('id-ID')} menunggu pembayaran.`,
        linkTab: 'kasir',
        urgency: 'info',
      });

      toast.success('Pemeriksaan Akhir Selesai! FIR Closed berhasil & Invoice otomatis diterbitkan ke Kasir.');
      setShowFinalCheckModal(null);
    },
    onError: (err: any) => toast.error('Gagal menutup FIR: ' + getApiErrorMessage(err)),
  });

  // Derived statistics and filtering for SA
  const allSpks = spkList || [];
  const totalSpkCount = allSpks.length;
  const inProgressCount = allSpks.filter(s => s.status_spk === 'Dalam Pengerjaan').length;
  const waitingPartCount = allSpks.filter(s => s.status_spk === 'Waiting Part').length;
  const qcPassedCount = allSpks.filter(s => s.status_spk === 'QC Passed').length;

  const filteredSpkList = allSpks.filter((spk) => {
    const query = saSearchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      spk.no_spk?.toLowerCase().includes(query) ||
      spk.no_polisi?.toLowerCase().includes(query) ||
      spk.nama_customer?.toLowerCase().includes(query) ||
      spk.keluhan_customer?.toLowerCase().includes(query) ||
      spk.nama_mekanik?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (saStatusFilter === 'Dalam Pengerjaan') return spk.status_spk === 'Dalam Pengerjaan';
    if (saStatusFilter === 'Waiting Part') return spk.status_spk === 'Waiting Part';
    if (saStatusFilter === 'QC Passed') return spk.status_spk === 'QC Passed';
    if (saStatusFilter === 'FIR Closed') return spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai';
    return true;
  });

  const totalSpkRecords = filteredSpkList.length;
  const totalSpkPages = Math.ceil(totalSpkRecords / spkLimit) || 1;
  const paginatedSpkList = filteredSpkList.slice((spkPage - 1) * spkLimit, spkPage * spkLimit);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100 shadow-2xs">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Service Advisor (SA)</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200/70">
                KIM 3 WORKSHOP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Penerimaan Kendaraan, Estimasi Biaya &amp; Waktu, Pengadaan Part, dan FIR Closed</p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('spk-list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'spk-list' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Daftar SPK Aktif
          </button>
          <button
            onClick={() => setActiveTab('penerimaan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'penerimaan' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Buat SPK Baru
          </button>
          <button
            onClick={() => setActiveTab('estimasi-pr')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'estimasi-pr' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 Kotak Merah (PR)
          </button>
        </div>
      </div>

      {/* Mini KPI Banners for SA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setSaStatusFilter('Semua')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'Semua' ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total SPK Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-900 mt-1 tabular-nums">{totalSpkCount}</div>
          <span className="text-[10px] text-slate-400">Seluruh antrian bengkel</span>
        </div>

        <div 
          onClick={() => setSaStatusFilter('Dalam Pengerjaan')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'Dalam Pengerjaan' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">Dalam Pengerjaan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1 tabular-nums">{inProgressCount}</div>
          <span className="text-[10px] text-blue-600">Sedang diservis teknisi</span>
        </div>

        <div 
          onClick={() => setSaStatusFilter('Waiting Part')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'Waiting Part' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Menunggu Part (PR)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 tabular-nums">{waitingPartCount}</div>
          <span className="text-[10px] text-amber-600">Proses purchasing</span>
        </div>

        <div 
          onClick={() => setSaStatusFilter('QC Passed')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'QC Passed' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Siap FIR Closed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 tabular-nums">{qcPassedCount}</div>
          <span className="text-[10px] text-emerald-600">QC Passed siap invoice</span>
        </div>
      </div>


      {/* TAB 1: DAFTAR SPK AKTIF */}
      {activeTab === 'spk-list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Semua Work Order SPK Bengkel</h2>
              <p className="text-xs text-slate-500 mt-0.5">Pantau progres pekerjaan, status approval customer, dan FIR closed</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto border border-slate-200/60">
              {filteredSpkList.length} SPK Ditemukan
            </span>
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari No. SPK, No. Polisi, Customer, Mekanik, atau Keluhan..."
                value={saSearchQuery}
                onChange={(e) => {
                  setSaSearchQuery(e.target.value);
                  setSpkPage(1);
                }}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none transition-all placeholder:text-slate-400"
              />
              {saSearchQuery && (
                <button
                  onClick={() => {
                    setSaSearchQuery('');
                    setSpkPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['Semua', 'Dalam Pengerjaan', 'Waiting Part', 'QC Passed', 'FIR Closed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSaStatusFilter(st);
                    setSpkPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                    saStatusFilter === st
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 font-semibold'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-ink-muted border-y border-border">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. SPK</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Status Alur</th>
                  <th className="py-2.5 px-3 font-semibold">Mekanik / Foreman</th>
                  <th className="py-2.5 px-3 font-semibold">Estimasi Biaya</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi SA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSpkList.length > 0 ? (
                  paginatedSpkList.map((spk) => (
                    <tr key={spk.id} className="hover:bg-surface/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-accent">{spk.no_spk}</td>
                      <td className="py-3 px-3 font-bold text-ink">{spk.no_polisi}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink">{spk.nama_customer || '-'}</div>
                        <div className="text-[11px] text-ink-subtle line-clamp-1">{spk.keluhan_customer}</div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-ink-muted">
                        {spk.nama_mekanik ? `${spk.nama_mekanik}${spk.nama_foreman ? ` (${spk.nama_foreman})` : ''}` : 'Belum Ditugaskan'}
                      </td>
                      <td className="py-3 px-3 font-bold text-ink">
                        Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {spk.status_spk === 'Estimasi Dibuat' && (
                            <button
                              type="button"
                              onClick={() => setShowEstimasiModal(spk)}
                              className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-md font-bold text-xs shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Buat Estimasi Biaya
                            </button>
                          )}

                          {/* Jika QC Passed -> SA Tombol Final Check (FIR Closed) */}
                          {spk.status_spk === 'QC Passed' && (
                            <button
                              type="button"
                              onClick={() => handleOpenFinalCheck(spk)}
                              className="px-2.5 py-1 bg-status-green hover:bg-status-green/90 text-white rounded-md font-bold text-xs shadow-xs flex items-center gap-1 transition-all"
                              title="Pemeriksaan Akhir (Final Check SA) sebelum menutup FIR"
                            >
                              <FileCheck className="w-3.5 h-3.5" /> Final Check (FIR Closed)
                            </button>
                          )}

                          {/* Ajukan PR: hanya saat Estimasi Dibuat & belum ada PR aktif.
                              Otomatis terkunci setelah approval terkirim / PR berjalan. */}
                          {(() => {
                            const prAktif = prAktifUntukSpk(spk.id);
                            if (prAktif) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('estimasi-pr')}
                                  className="px-2.5 py-1 bg-surface text-ink-muted rounded-md font-bold text-xs border border-border flex items-center gap-1"
                                  title={`PR ${prAktif.no_pr} berstatus ${prAktif.status_pr} — lihat di Kotak Merah`}
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" /> PR {prAktif.status_pr}
                                </button>
                              );
                            }
                            if (spk.status_spk !== 'Estimasi Dibuat') return null;
                            return (
                              <button
                                type="button"
                                onClick={() => setShowPrModal(spk)}
                                className="px-2.5 py-1 bg-status-red-bg hover:bg-status-red/10 text-status-red rounded-md font-bold text-xs border border-status-red/30 flex items-center gap-1"
                                title="Ajukan PR ke Purchasing jika part tidak ready"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" /> PR Part
                              </button>
                            );
                          })()}

                          {/* Cetak SPK A4 */}
                          <button
                            type="button"
                            onClick={() => setShowPrintSpk(spk)}
                            className="px-2.5 py-1 bg-surface hover:bg-surface-raised text-ink-muted rounded-md font-bold text-xs border border-border flex items-center gap-1 transition-colors"
                            title="Cetak Surat Perintah Kerja (SPK) A4"
                          >
                            <Printer className="w-3.5 h-3.5" /> Cetak SPK
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-subtle">
                      Tidak ditemukan SPK yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
          <div className="block md:hidden space-y-2.5">
            {filteredSpkList.length > 0 ? (
              paginatedSpkList.map((spk) => (
              <div key={spk.id} className="rounded-md border border-border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold text-accent">{spk.no_spk}</div>
                    <div className="text-base font-black text-ink mt-0.5">{spk.no_polisi}</div>
                    <div className="text-xs font-semibold text-ink-muted mt-0.5">{spk.nama_customer || '-'}</div>
                  </div>
                  <StatusBadge status={spk.status_spk} size="sm" />
                </div>

                <p className="mt-2 text-[11px] text-ink-subtle line-clamp-2">{spk.keluhan_customer}</p>

                <div className="mt-2.5 pt-2.5 border-t border-border space-y-1.5 text-[11px] text-ink-subtle">
                  <div className="flex items-start justify-between gap-3">
                    <span className="shrink-0">Mekanik / Foreman</span>
                    <span className="font-semibold text-ink-muted text-right">
                      {spk.nama_mekanik ? `${spk.nama_mekanik}${spk.nama_foreman ? ` (${spk.nama_foreman})` : ''}` : 'Belum Ditugaskan'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimasi Biaya</span>
                    <span className="font-bold text-ink">
                      Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {spk.status_spk === 'Estimasi Dibuat' && (
                  <button
                    type="button"
                    onClick={() => setShowEstimasiModal(spk)}
                    className="mt-3 w-full min-h-[44px] py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Buat Estimasi Biaya
                  </button>
                )}

                {spk.status_spk === 'QC Passed' && (
                  <button
                    type="button"
                    onClick={() => handleOpenFinalCheck(spk)}
                    className="mt-3 w-full min-h-[44px] py-2.5 bg-status-green hover:bg-status-green/90 text-white rounded-md font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileCheck className="w-4 h-4" /> Final Check (FIR Closed)
                  </button>
                )}

                {(() => {
                  const prAktif = prAktifUntukSpk(spk.id);
                  if (prAktif) {
                    return (
                      <button
                        type="button"
                        onClick={() => setActiveTab('estimasi-pr')}
                        className="mt-2 w-full min-h-[44px] py-2.5 bg-surface text-ink-muted rounded-md font-bold text-xs border border-border flex items-center justify-center gap-1.5"
                        title={`PR ${prAktif.no_pr} berstatus ${prAktif.status_pr} — lihat di Kotak Merah`}
                      >
                        <ShoppingBag className="w-4 h-4" /> PR {prAktif.status_pr}
                      </button>
                    );
                  }
                  if (spk.status_spk !== 'Estimasi Dibuat') return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setShowPrModal(spk)}
                      className="mt-2 w-full min-h-[44px] py-2.5 bg-status-red-bg active:bg-status-red/10 text-status-red rounded-md font-bold text-xs border border-status-red/30 flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-4 h-4" /> Ajukan PR Part
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setShowPrintSpk(spk)}
                  className="mt-2 w-full min-h-[44px] py-2.5 bg-surface active:bg-surface-raised text-ink-muted rounded-md font-bold text-xs border border-border flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Cetak SPK (HVS A4)
                </button>
              </div>
            ))
            ) : (
              <div className="p-8 text-center text-ink-subtle text-xs bg-surface rounded-md border border-dashed border-border">
                Tidak ditemukan SPK yang sesuai dengan filter atau pencarian.
              </div>
            )}
          </div>

          {/* Pagination Bar */}
          <PaginationBar
            page={spkPage}
            totalPages={totalSpkPages}
            totalRecords={totalSpkRecords}
            limit={spkLimit}
            onPageChange={setSpkPage}
            onLimitChange={(newLimit) => {
              setSpkLimit(newLimit);
              setSpkPage(1);
            }}
            label="SPK"
            isLoading={loadingSpk}
          />
        </div>
      )}



      {/* TAB 2: FORM PENERIMAAN KENDARAAN (image1.png Mockup 2 & 3) */}
      {activeTab === 'penerimaan' && (
        <div className="space-y-4">

          {/* Banner: Antrian Siap Di-SPK */}
          {antrianMenungguSA.length > 0 ? (
            <div className="bg-surface-raised rounded-md border border-accent/30 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {antrianMenungguSA.length} Antrian Siap Di-SPK
                  </h3>
                  <p className="text-[11px] text-ink-muted">Kendaraan berikut sudah Check-In di pos security dan menunggu penerimaan SA</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {antrianMenungguSA.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => fillAntrianToForm(a)}
                    className={`text-left p-3 rounded-md border transition-all flex items-start gap-3 ${
                      formPenerimaan.id_antrian === a.id
                        ? 'border-accent bg-accent-subtle ring-2 ring-accent/20'
                        : 'border-border bg-surface hover:border-accent/50 hover:bg-accent-subtle/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-sm text-ink">{a.no_polisi}</div>
                      <div className="text-[11px] text-ink-muted font-semibold truncate">{a.nama_customer || 'Pelanggan'}</div>
                      <div className="text-[11px] text-ink-subtle mt-0.5 line-clamp-1">{a.keperluan || a.catatan_security || 'Service Umum'}</div>
                      <div className="text-[10px] text-ink-subtle mt-0.5">
                        Masuk: {a.waktu_masuk ? new Date(a.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                      </div>
                    </div>
                    {formPenerimaan.id_antrian === a.id && (
                      <div className="ml-auto flex-shrink-0">
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">Dipilih ✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : antrianError ? (
            <div className="bg-status-red-bg rounded-md border border-status-red/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 text-status-red flex-1">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold">Gagal memuat antrian dari server.</span>{' '}
                  {getApiErrorMessage(antrianErrorDetail, 'Periksa koneksi atau hubungi admin.')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => refetchAntrian()}
                disabled={antrianFetching}
                className="px-4 py-2 rounded-md bg-status-red hover:bg-status-red/90 disabled:opacity-50 text-white text-xs font-bold transition-all flex-shrink-0"
              >
                {antrianFetching ? 'Memuat...' : 'Coba Lagi'}
              </button>
            </div>
          ) : (
            <div className="bg-surface-raised rounded-md border border-border p-4 flex items-center gap-3 text-ink-muted">
              <AlertCircle className="w-5 h-5 text-ink-subtle flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-ink">Tidak ada antrian kendaraan</span> yang menunggu penerimaan SA saat ini.
                Tunggu Pos Security melakukan Check-In kendaraan terlebih dahulu.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input Penerimaan (2 Cols) */}
          <div className="lg:col-span-2 bg-surface-raised rounded-md border border-border p-5 shadow-xs">
            <div className="border-b border-border pb-3 mb-4">
              <h2 className="text-base font-bold text-ink">Penerimaan Kendaraan oleh Service Advisor</h2>
              <p className="text-xs text-ink-muted">Cek awal, odometer, keluhan, dan kondisi fisik kendaraan</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSpkMutation.mutate(formPenerimaan);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted mb-1">Pilih Antrian Kendaraan Masuk (Dari Gate Security)</label>
                  <select
                    required
                    value={formPenerimaan.id_antrian || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const antrian = antrianMenungguSA.find(a => a.id === id);
                      if (antrian) {
                        fillAntrianToForm(antrian);
                      } else {
                        setFormPenerimaan(prev => ({
                          ...prev,
                          id_antrian: undefined,
                          no_polisi: '',
                          nama_customer: '',
                          no_hp_customer: '',
                          keluhan_customer: '',
                          foto_kendaraan_masuk: '',
                        }));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-md border border-border font-bold text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  >
                    <option value="">-- Pilih Kendaraan Menunggu SA --</option>
                    {antrianMenungguSA.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.no_polisi} - {a.nama_customer || 'Tanpa Nama'} ({a.jenis_armada || 'Truk'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Odometer (KM)</label>
                  <input
                    type="number"
                    required
                    value={formPenerimaan.odometer_km}
                    onChange={(e) => setFormPenerimaan({ ...formPenerimaan, odometer_km: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-md border border-border font-mono text-sm font-bold focus:ring-2 focus:ring-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Lead Time Estimasi (Jam)</label>
                  <input
                    type="number"
                    value={formPenerimaan.lead_time_jam}
                    onChange={(e) => setFormPenerimaan({ ...formPenerimaan, lead_time_jam: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-md border border-border font-mono text-sm font-bold focus:ring-2 focus:ring-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Foto Dokumen (Odometer, STNK, KIR) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PhotoUploader
                  label="Foto Odometer (Cek Fisik KM)"
                  value={formPenerimaan.foto_odometer}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_odometer: url })}
                  bucket="foto_kendaraan"
                />
                <PhotoUploader
                  label="Foto STNK"
                  value={formPenerimaan.foto_stnk}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_stnk: url })}
                  bucket="dokumen_armada"
                />
                <PhotoUploader
                  label="Foto BUKU KIR"
                  value={formPenerimaan.foto_kir}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_kir: url })}
                  bucket="dokumen_armada"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Catat Keluhan Customer</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Rem bunyi saat pengereman dan tarikan mesin agak berat..."
                  value={formPenerimaan.keluhan_customer}
                  onChange={(e) => setFormPenerimaan({ ...formPenerimaan, keluhan_customer: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              {/* Checklist Kondisi Awal (image1.png Mockup SA) */}
              <div className="bg-surface p-4 rounded-md border border-border">
                <span className="block text-xs font-bold text-ink mb-2">Checklist Awal Kondisi Armada:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'cek_body', label: 'Bodi Kendaraan' },
                    { key: 'cek_mesin', label: 'Ruang Mesin' },
                    { key: 'cek_kelistrikan', label: 'Kelistrikan' },
                    { key: 'cek_kaki_kaki', label: 'Kaki-kaki / Rem' },
                  ].map((item) => (
                    <div key={item.key} className="bg-surface-raised p-2.5 rounded-md border border-border">
                      <span className="text-[11px] font-semibold text-ink-muted block mb-1">{item.label}</span>
                      <select
                        value={(formPenerimaan as any)[item.key]}
                        onChange={(e) => setFormPenerimaan({ ...formPenerimaan, [item.key]: e.target.value })}
                        className="w-full text-xs font-bold px-2 py-1 rounded border border-border focus:outline-none"
                      >
                        <option value="OK">OK (Baik)</option>
                        <option value="Perlu Dicek">Perlu Dicek</option>
                        <option value="Rusak">Ada Kerusakan</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={createSpkMutation.isPending || !formPenerimaan.id_antrian}
                  className="px-6 py-3 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-sm shadow-md shadow-accent/20 transition-all flex items-center gap-2"
                >
                  {createSpkMutation.isPending ? 'Menyimpan...' : 'Submit Penerimaan Kendaraan'}
                  {!createSpkMutation.isPending && <CheckCircle className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </div>

          {/* Ringkasan Penerimaan Preview (1 Col) - image1.png Ringkasan */}
          <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">Ringkasan Penerimaan</h3>
                <span className="text-[11px] font-mono text-ink-muted">{new Date().toLocaleTimeString()} WIB</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-surface p-3 rounded-md border border-border">
                  <div className="text-[10px] text-ink-subtle uppercase font-bold">Armada / No. Polisi</div>
                  <div className="text-base font-black text-ink">{formPenerimaan.no_polisi || 'BK -'}</div>
                  <div className="text-xs text-ink-muted font-semibold">{formPenerimaan.nama_customer}</div>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-ink-muted">Odometer KM:</span>
                  <span className="font-mono font-bold text-ink">{formPenerimaan.odometer_km.toLocaleString()} KM</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-ink-muted">Status Alur Awal:</span>
                  <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-bold text-[10px]">
                    Menunggu Pengecekan Mekanik
                  </span>
                </div>

                <div>
                  <span className="text-ink-muted font-semibold block mb-1">Keluhan Customer:</span>
                  <p className="p-2.5 bg-surface rounded-md border border-border text-ink-muted italic">
                    "{formPenerimaan.keluhan_customer || 'Belum diisi...'}"
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 rounded-md border text-[11px] space-y-1 bg-accent-subtle border-accent/30 text-accent">
              <div className="font-bold">Alur Selanjutnya:</div>
              <div>1. SPK diterbitkan &amp; muncul di Dashboard Foreman (Check In).</div>
              <div>2. Foreman menugaskan mekanik untuk Pengecekan Kendaraan.</div>
              <div>3. Foreman submit Rekomendasi Perbaikan ke SA.</div>
              <div>4. SA menyusun Estimasi Biaya &amp; Waktu (Kotak Merah jika Part Kosong).</div>
            </div>
          </div>

        </div>
        </div>
      )}

      {/* TAB 3: KOTAK MERAH PURCHASING INTEGRASI (image1.png Kotak Merah) */}
      {activeTab === 'estimasi-pr' && (

        <div className="space-y-4">
          <div className="p-4 rounded-md bg-status-red text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-red/80 text-white/80 text-[10px] font-bold uppercase tracking-wider mb-1">
                Tahap 6: Integrasi Estimasi Part &amp; Purchasing
              </div>
              <h2 className="text-lg font-black">Status Part Tidak Ready di Stock &amp; PO Purchasing</h2>
              <p className="text-xs text-white/80">
                SA mengajukan PR → Purchasing proses penawaran harga min. 2 vendor → SA setuju → Purchasing input ETA ketersediaan barang.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-white/80">
                {prListSA.length} {prShowSelesai ? 'selesai' : 'aktif'}
              </span>
              <button
                type="button"
                onClick={() => setPrShowSelesai((v) => !v)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${
                  prShowSelesai
                    ? 'bg-white text-status-red border-white'
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                }`}
                title={prShowSelesai ? 'Kembali ke PR aktif' : 'Lihat riwayat PR yang sudah selesai'}
              >
                {prShowSelesai ? 'Lihat Aktif' : 'Sudah Selesai'}
              </button>
            </div>
          </div>

          {prListSA.length === 0 ? (
            <div className="p-8 text-center text-ink-subtle text-xs bg-surface-raised rounded-md border border-dashed border-border">
              {prShowSelesai
                ? 'Belum ada PR yang selesai.'
                : 'Tidak ada PR aktif. Semua kebutuhan part sudah beres — PR yang selesai ada di toggle "Sudah Selesai".'}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prListSA.map((pr) => (
              <div key={pr.pr_id} className="bg-surface-raised rounded-md border border-status-red/30 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-status-red">{pr.no_pr}</span>
                  <StatusBadge status={pr.status_pr} size="sm" />
                </div>

                <div className="bg-surface p-3 rounded-md border border-border">
                  <div className="font-black text-ink text-sm">{pr.no_polisi} - {pr.nama_customer}</div>
                  <div className="text-xs text-ink-muted mt-1">{pr.catatan_pr}</div>
                </div>

                {/* Info Penawaran PO dari Purchasing */}
                {pr.no_po ? (
                  <div className="p-3 bg-status-red-bg rounded-md border border-status-red/30 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-status-red">
                      <span>No. PO: {pr.no_po}</span>
                      <span>Admin: {pr.nama_admin_purchasing}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-surface-raised rounded border border-border">
                        <span className="text-ink-subtle block font-semibold">Vendor 1:</span>
                        <div className="font-bold text-ink">{pr.vendor_1_nama}</div>
                        <div className="text-ink-muted">Rp {Number(pr.vendor_1_harga || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-2 bg-surface-raised rounded border border-border">
                        <span className="text-ink-subtle block font-semibold">Vendor 2:</span>
                        <div className="font-bold text-ink">{pr.vendor_2_nama}</div>
                        <div className="text-ink-muted">Rp {Number(pr.vendor_2_harga || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-status-red/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-ink-muted font-semibold block">Vendor Terpilih &amp; Harga:</span>
                        <span className="font-bold text-status-red">{pr.vendor_terpilih} (Rp {Number(pr.harga_kesepakatan || 0).toLocaleString()})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-ink-muted font-semibold block">Estimasi ETA Ready:</span>
                        <span className="font-mono font-bold text-status-red">{pr.estimasi_tanggal_ready_eta} ({pr.estimasi_jam_ready_eta})</span>
                      </div>
                    </div>

                    {/* SA Konfirmasi Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="font-semibold text-ink-muted">Konfirmasi SA:</span>
                      {pr.status_konfirmasi_sa === 'Disetujui SA' ? (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span className="px-2.5 py-1 bg-status-green-bg text-status-green font-bold rounded-md text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Disetujui SA
                          </span>
                          {pr.status_pr === 'Barang Ready' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const spk = (spkList || []).find((s) => s.id === pr.id_spk);
                                if (spk) setShowEstimasiModal(spk);
                                else toast.warning('Data SPK tidak ditemukan di daftar. Muat ulang halaman.');
                              }}
                              className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-md font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                              title="Barang sudah dikonfirmasi tiba oleh Purchasing — buka estimasi untuk finalisasi"
                            >
                              <ClipboardList className="w-3.5 h-3.5" /> Buka Estimasi
                            </button>
                          ) : (
                            <span className="text-[11px] text-ink-muted italic">
                              Menunggu konfirmasi barang tiba oleh Admin Purchasing.
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => konfirmasiPoMutation.mutate({ poId: pr.po_id!, setuju: true })}
                            className="px-3 py-1 bg-status-green hover:bg-status-green/90 text-white rounded-md font-bold text-xs shadow-xs"
                          >
                            Setujui PO
                          </button>
                          <button
                            type="button"
                            onClick={() => konfirmasiPoMutation.mutate({ poId: pr.po_id!, setuju: false })}
                            className="px-3 py-1 bg-status-red-bg hover:bg-status-red/10 text-status-red rounded-md font-bold text-xs border border-status-red/30"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-status-amber-bg rounded-md border border-status-amber/30 text-xs text-status-amber flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Menunggu Admin Purchasing menginput penawaran vendor dan estimasi ETA...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}


      {/* MODAL BUAT ESTIMASI BIAYA */}
      {showEstimasiModal && (
        <ModalPortal onClose={() => setShowEstimasiModal(null)}>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-raised rounded-md w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-border">
            <div className="sticky top-0 bg-surface-raised/90 backdrop-blur px-6 py-4 border-b border-border flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-black text-ink">Buat Estimasi Biaya &amp; Waktu</h3>
                <p className="text-xs text-ink-muted">Berdasarkan hasil pengecekan {showEstimasiModal.nama_foreman ? `Foreman (${showEstimasiModal.nama_foreman})` : 'Foreman'} untuk {showEstimasiModal.no_polisi}</p>
              </div>
              <button 
                onClick={() => { setShowEstimasiModal(null); resetEstimasiForm(); }} 
                className="w-8 h-8 rounded-full bg-surface text-ink-subtle flex items-center justify-center hover:bg-status-red-bg hover:text-status-red transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolom Kiri: Info Pengecekan Mekanik & Input Part */}
              <div className="space-y-4">
                <div className="bg-surface rounded-md p-4 border border-border">
                  <h4 className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-ink-subtle"/> Hasil Pengecekan Foreman/Mekanik</h4>
                  <div className="text-xs text-ink-muted whitespace-pre-line leading-relaxed">
                    {showEstimasiModal.catatan_foreman || 'Belum ada catatan dari Foreman.'}
                  </div>
                </div>

                {/* Sparepart inputan Foreman/Mekanik (sumber utama, read-only) */}
                <div className="bg-surface rounded-md p-4 border border-border">
                  <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-status-green" /> Sparepart Inputan Foreman/Mekanik
                    <span className="ml-auto text-[10px] font-bold text-ink-subtle">{foremanParts.length} item</span>
                  </h4>
                  {foremanParts.length > 0 ? (
                    <div className="space-y-2">
                      {foremanParts.map((p, idx) => (
                        <div key={`f-${idx}`} className="p-2.5 bg-surface-raised border border-border rounded-md flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-ink truncate">{p.nama_part}</div>
                            <div className="text-[10px] text-ink-muted flex gap-2 mt-0.5">
                              <span>{p.jumlah} {p.satuan} x Rp {p.harga_satuan.toLocaleString()}</span>
                              {p.stok === 0 || p.jumlah > p.stok ? (
                                <span className="text-status-red font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> INDENT</span>
                              ) : (
                                <span className="text-status-green font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Ready</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-ink-subtle italic text-center p-2 bg-surface-raised/50 rounded-md">
                      Foreman belum menginput sparepart untuk SPK ini.
                    </p>
                  )}
                </div>

                {/* Tambahan SA (opsional, tersembunyi di balik tombol agar tidak salah paham) */}
                <div className="bg-accent-subtle rounded-md p-4 border border-accent/20">
                  <button
                    type="button"
                    onClick={() => setShowPartPicker((v) => !v)}
                    className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    {showPartPicker ? 'Tutup Tambah Sparepart' : `Tambah Sparepart Tambahan${selectedParts.length > 0 ? ` (${selectedParts.length})` : ''}`}
                  </button>
                  {showPartPicker && (
                  <>
                  {/* Susun vertikal agar tidak meluber menimpa kolom kanan di layar sempit */}
                  <div className="space-y-2 mt-3">
                    <select
                      value={partPickerId}
                      onChange={(e) => setPartPickerId(e.target.value)}
                      className="w-full min-w-0 px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none truncate"
                    >
                      <option value="">-- Pilih Sparepart --</option>
                      {masterStokPart?.map(p => (
                        <option key={p.kode_part} value={p.kode_part}>
                          {p.kode_part} - {p.nama_part} | stok: {p.stok}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={partPickerQty}
                        onChange={(e) => setPartPickerQty(Number(e.target.value))}
                        className="w-20 shrink-0 px-2 py-2 rounded-md border border-border text-xs text-center focus:ring-2 focus:ring-accent focus:outline-none"
                        title="Jumlah"
                      />
                      <button
                        type="button"
                        onClick={handleAddPartToEstimasi}
                        disabled={!partPickerId}
                        className="flex-1 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Tambah ke Estimasi
                      </button>
                    </div>
                  </div>

                  {/* List Part Tambahan SA */}
                  <div className="mt-3 space-y-2">
                    {selectedParts.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-surface-raised border border-border rounded-md flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-ink truncate">{p.nama_part}</div>
                          <div className="text-[10px] text-ink-muted flex gap-2 mt-0.5">
                            <span>{p.jumlah} {p.satuan} x Rp {p.harga_satuan.toLocaleString()}</span>
                            {p.stok === 0 || p.jumlah > p.stok ? (
                              <span className="text-status-red font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> INDENT</span>
                            ) : (
                              <span className="text-status-green font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Ready</span>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemovePartFromEstimasi(p.kode_part)} className="text-ink-subtle hover:text-status-red"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {selectedParts.length === 0 && (
                      <p className="text-[10px] text-ink-subtle italic text-center p-2 bg-surface-raised/50 rounded-md">Belum ada tambahan dari SA.</p>
                    )}
                  </div>
                  </>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Ringkasan Estimasi & Action */}
              <div className="space-y-4">
                <div className="bg-surface rounded-md p-4 border border-border space-y-3">
                  <h4 className="text-xs font-bold text-ink border-b border-border pb-2">Ringkasan Estimasi Customer</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={jasaTermasuk}
                        onChange={(e) => setJasaTermasuk(e.target.checked)}
                        className="w-4 h-4 rounded text-accent focus:ring-accent"
                      />
                      <span className="font-bold text-ink">Sertakan Jasa Servis Dasar</span>
                    </label>
                    {jasaTermasuk && (
                      <div className="flex justify-between items-center gap-2 text-xs">
                        <span className="text-ink-muted">Nominal jasa:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-ink-muted font-bold">Rp</span>
                          <input
                            type="number"
                            min={0}
                            value={jasaNominal}
                            onChange={(e) => setJasaNominal(Math.max(0, Number(e.target.value) || 0))}
                            className="w-32 px-2 py-1.5 rounded-md border border-border font-mono text-xs font-bold text-right focus:ring-2 focus:ring-accent focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-ink-muted">Jasa Servis Dasar:</span>
                    <span className="font-semibold text-ink-muted">Rp {jasaAktif.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-ink-muted">Total Sparepart ({allEstimasiParts.length} item):</span>
                    <span className="font-semibold text-ink-muted">Rp {partsSubtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                    <span className="font-bold text-ink">Total Estimasi Biaya:</span>
                    <span className="font-black text-status-green">Rp {totalEstimasiBiaya.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="pt-3">
                    <label className="block text-xs font-bold text-ink-muted mb-1">Estimasi Waktu Pengerjaan (Jam)</label>
                    <input
                      type="number"
                      value={estimasiWaktu}
                      onChange={(e) => setEstimasiWaktu(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md border border-border font-mono text-sm font-bold focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>
                </div>

                {hasEmptyStock && (
                  <div className="p-3 bg-status-red-bg rounded-md border border-status-red/30 text-status-red text-[10px] flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p><strong>Part Indent Terdeteksi!</strong> Menyetujui estimasi ini akan otomatis membuat PR Kotak Merah dan menahan status menjadi Waiting Part.</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => submitEstimasiMutation.mutate(showEstimasiModal)}
                  disabled={submitEstimasiMutation.isPending}
                  className="w-full py-3.5 rounded-md bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white font-black text-sm shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitEstimasiMutation.isPending ? 'Memproses...' : 'Submit Estimasi ke Customer'}
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}


      {/* MODAL AJUKAN PR PART */}
      {showPrModal && (
        <ModalPortal onClose={() => setShowPrModal(null)}>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface-raised rounded-t-md sm:rounded-md p-5 sm:p-6 max-w-md w-full shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Ajukan Purchase Request (PR)</h3>
                <p className="text-xs text-ink-muted">Kirim permintaan pengadaan sparepart ke Admin Purchasing</p>
              </div>
              <button
                onClick={() => { setShowPrModal(null); resetPrForm(); }}
                className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-md bg-surface border border-border">
                <div className="font-bold text-ink">{showPrModal.no_spk} - {showPrModal.no_polisi}</div>
                <div className="text-ink-muted mt-0.5">{showPrModal.nama_customer}</div>
              </div>

              {/* Pilih sparepart (multi-item, stok live gudang) */}
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Pilih Sparepart <span className="text-status-red">*</span>
                  <span className="font-normal"> — part indent SPK ini sudah terisi otomatis</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={prPickerId}
                    onChange={(e) => setPrPickerId(e.target.value)}
                    className="w-full min-w-0 px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none truncate"
                  >
                    <option value="">-- Pilih sparepart gudang --</option>
                    {masterStokPart?.map((p) => (
                      <option key={p.kode_part} value={p.kode_part}>
                        {p.kode_part} - {p.nama_part} | stok: {p.stok}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={prPickerQty}
                      onChange={(e) => setPrPickerQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 shrink-0 px-2 py-2 rounded-md border border-border text-xs text-center focus:ring-2 focus:ring-accent focus:outline-none"
                      title="Jumlah dibutuhkan"
                    />
                    <button
                      type="button"
                      disabled={!prPickerId}
                      onClick={() => {
                        const item = masterStokPart?.find((p) => p.kode_part === prPickerId);
                        if (!item) return;
                        if (prParts.some((p) => p.kode_part === item.kode_part)) {
                          toast.warning(`${item.nama_part} sudah ada di daftar PR ini.`);
                          return;
                        }
                        setPrParts([...prParts, {
                          kode_part: item.kode_part,
                          nama_part: item.nama_part,
                          jumlah: prPickerQty,
                          satuan: item.satuan,
                          stok: item.stok,
                        }]);
                        setPrPickerId('');
                        setPrPickerQty(1);
                      }}
                      className="flex-1 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-md font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Tambah ke PR
                    </button>
                  </div>
                </div>

                {prParts.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {prParts.map((p) => (
                      <div key={p.kode_part} className="flex items-center justify-between px-3 py-2 rounded-md bg-surface border border-border text-xs gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-ink truncate">{p.nama_part}</div>
                          <div className="text-[11px] text-ink-muted font-mono">
                            {p.kode_part} | butuh: {p.jumlah} {p.satuan} | stok gudang: {p.stok}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrParts(prParts.filter((x) => x.kode_part !== p.kode_part))}
                          className="p-1.5 rounded-md text-status-red hover:bg-status-red-bg transition-colors shrink-0"
                          title="Hapus dari PR"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-ink-subtle italic text-center p-2 bg-surface rounded-md border border-dashed border-border">
                    Belum ada part dipilih. Pilih dari daftar di atas lalu Tambah (bisa beberapa item).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: butuh urgent untuk unit operasional..."
                  value={prNote}
                  onChange={(e) => setPrNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowPrModal(null); resetPrForm(); }}
                className="flex-1 py-2.5 bg-surface hover:bg-surface-raised text-ink-muted font-bold text-xs rounded-md border border-border"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={prMutation.isPending}
                onClick={() => prMutation.mutate(showPrModal)}
                className="flex-1 py-2.5 bg-status-red hover:bg-status-red/90 text-white font-bold text-xs rounded-md shadow-md shadow-status-red/20"
              >
                {prMutation.isPending ? 'Mengirim...' : 'KIRIM KE PURCHASING'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}


      {/* MODAL PEMERIKSAAN AKHIR (FINAL CHECK SA) SEBELUM FIR CLOSED */}
      {showFinalCheckModal && (
        <ModalPortal onClose={() => setShowFinalCheckModal(null)}>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-surface-raised rounded-md max-w-lg w-full shadow-2xl border border-border overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-accent p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Pemeriksaan Akhir (Final Check SA)</h3>
                  <p className="text-xs text-white/80">
                    Verifikasi fisik &amp; dokumen sebelum penutupan FIR dan penerbitan Invoice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinalCheckModal(null)}
                className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Info SPK & Hasil QC Foreman */}
              <div className="p-3.5 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-accent">{showFinalCheckModal.no_spk}</span>
                  <span className="px-2 py-0.5 rounded-full bg-status-green-bg text-status-green font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> QC Passed (Foreman)
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-base font-black text-ink">{showFinalCheckModal.no_polisi}</div>
                    <div className="text-xs text-ink-muted font-semibold">{showFinalCheckModal.nama_customer}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-subtle block">Total Biaya SPK:</span>
                    <span className="font-bold text-ink text-xs">
                      Rp {Number(showFinalCheckModal.estimasi_biaya || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-ink-muted pt-1 border-t border-border/60 flex items-center justify-between">
                  <span>Mekanik: <strong>{showFinalCheckModal.nama_mekanik || '-'}</strong></span>
                  <span>Foreman: <strong>{showFinalCheckModal.nama_foreman || '-'}</strong></span>
                </div>
              </div>

              {/* Checklist Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-ink uppercase tracking-wider text-[11px] block">
                    Checklist Pemeriksaan Wajib SA:
                  </label>
                  <span className="text-[10px] font-semibold text-ink-muted">
                    {[finalCheckForm.kebersihan, finalCheckForm.tes_jalan, finalCheckForm.kelengkapan_surat].filter(Boolean).length} / 3 Terverifikasi
                  </span>
                </div>

                {/* Item 1: Kebersihan Kendaraan */}
                <div
                  onClick={() => setFinalCheckForm({ ...finalCheckForm, kebersihan: !finalCheckForm.kebersihan })}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                    finalCheckForm.kebersihan
                      ? 'border-status-green bg-status-green-bg text-ink shadow-xs'
                      : 'border-border bg-surface-raised hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={finalCheckForm.kebersihan}
                    onChange={(e) => {
                      e.stopPropagation();
                      setFinalCheckForm({ ...finalCheckForm, kebersihan: e.target.checked });
                    }}
                    className="mt-0.5 rounded text-status-green focus:ring-status-green h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>1. Kebersihan Kendaraan</span>
                      {finalCheckForm.kebersihan && <Check className="w-3.5 h-3.5 text-status-green" />}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                      Kabin pengemudi dan bodi luar bersih dari ceceran oli, sisa gemuk/kotoran, serta tidak ada alat teknisi yang tertinggal di unit.
                    </p>
                  </div>
                </div>

                {/* Item 2: Tes Jalan / Fisik */}
                <div
                  onClick={() => setFinalCheckForm({ ...finalCheckForm, tes_jalan: !finalCheckForm.tes_jalan })}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                    finalCheckForm.tes_jalan
                      ? 'border-status-green bg-status-green-bg text-ink shadow-xs'
                      : 'border-border bg-surface-raised hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={finalCheckForm.tes_jalan}
                    onChange={(e) => {
                      e.stopPropagation();
                      setFinalCheckForm({ ...finalCheckForm, tes_jalan: e.target.checked });
                    }}
                    className="mt-0.5 rounded text-status-green focus:ring-status-green h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>2. Uji Tes Jalan &amp; Fungsi Fisik</span>
                      {finalCheckForm.tes_jalan && <Check className="w-3.5 h-3.5 text-status-green" />}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                      Sistem pengereman responsif, lampu/kelistrikan menyala normal, mesin langsam stabil, dan keluhan awal customer telah teratasi.
                    </p>
                  </div>
                </div>

                {/* Item 3: Kelengkapan Surat */}
                <div
                  onClick={() => setFinalCheckForm({ ...finalCheckForm, kelengkapan_surat: !finalCheckForm.kelengkapan_surat })}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                    finalCheckForm.kelengkapan_surat
                      ? 'border-status-green bg-status-green-bg text-ink shadow-xs'
                      : 'border-border bg-surface-raised hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={finalCheckForm.kelengkapan_surat}
                    onChange={(e) => {
                      e.stopPropagation();
                      setFinalCheckForm({ ...finalCheckForm, kelengkapan_surat: e.target.checked });
                    }}
                    className="mt-0.5 rounded text-status-green focus:ring-status-green h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <span>3. Kelengkapan Dokumen &amp; Barang Armada</span>
                      {finalCheckForm.kelengkapan_surat && <Check className="w-3.5 h-3.5 text-status-green" />}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                      STNK / KIR asli, buku riwayat servis, kunci kontak, ban serep, dan tool kit lengkap dalam kondisi siap serah terima ke driver.
                    </p>
                  </div>
                </div>
              </div>

              {/* Catatan Akhir SA */}
              <div>
                <label className="block text-ink-muted font-bold mb-1 text-[11px]">
                  Catatan Tambahan Pemeriksaan Akhir SA:
                </label>
                <textarea
                  rows={2}
                  value={finalCheckForm.catatan_final}
                  onChange={(e) => setFinalCheckForm({ ...finalCheckForm, catatan_final: e.target.value })}
                  placeholder="Catatan kondisi fisik saat serah terima..."
                  className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              {/* Notice Warning if not checked */}
              {!isFinalCheckValid ? (
                <div className="p-3 bg-status-amber-bg rounded-md border border-status-amber/30 text-status-amber text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Centang <strong>semua 3 checklist di atas</strong> untuk mengaktifkan tombol penutupan FIR dan penerbitan Invoice.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-status-green-bg rounded-md border border-status-green/30 text-status-green text-[11px] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Pemeriksaan akhir lengkap. Tombol <strong>FIR Closed &amp; Terbitkan Invoice</strong> siap dieksekusi.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-surface border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => setShowFinalCheckModal(null)}
                className="flex-1 py-2.5 bg-surface-raised border border-border hover:bg-surface text-ink-muted font-bold text-xs rounded-md transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!isFinalCheckValid || firClosedMutation.isPending}
                onClick={() => firClosedMutation.mutate(showFinalCheckModal)}
                className="flex-2 py-2.5 bg-status-green hover:bg-status-green/90 disabled:bg-surface disabled:border disabled:border-border disabled:cursor-not-allowed text-white font-bold text-xs rounded-md shadow-md shadow-status-green/20 flex items-center justify-center gap-1.5 transition-all"
              >
                {firClosedMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Memproses Invoice...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>FIR CLOSED &amp; TERBITKAN INVOICE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}


      {/* Printable SPK A4 Modal */}
      {showPrintSpk && (
        <PrintSpkModal
          spk={showPrintSpk}
          onClose={() => setShowPrintSpk(null)}
        />
      )}

    </div>
  );
};
