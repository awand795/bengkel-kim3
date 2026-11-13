import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Layout,
  Eye,
  CheckCircle2,
  Loader2,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { IklanSlide, MediaIklan } from '../../types';
import { HtmlCodeEditor } from './HtmlCodeEditor';
import { MultiSlideBanner } from '../common/MultiSlideBanner';
import { toast } from '../common/Toast';
import { DEFAULT_SINGLE_SLIDE_TEMPLATE } from '../../config/bannerTemplate';

const SlideModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, subtitle, maxWidthClass = 'max-w-2xl', children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full ${maxWidthClass} max-h-[92vh] flex flex-col bg-surface-raised rounded-2xl shadow-2xl border border-border overflow-hidden`}>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

interface IklanSlideTabProps {
  mediaList?: MediaIklan[];
  onOpenMediaGallery?: () => void;
}

export const IklanSlideTab: React.FC<IklanSlideTabProps> = ({
  mediaList = [],
  onOpenMediaGallery,
}) => {
  const queryClient = useQueryClient();

  // 1. Query Pengaturan Master: Banner Aktif (di pengaturan_situs)
  const { data: pengaturanList = [] } = useQuery({
    queryKey: ['admin-pengaturan'],
    queryFn: api.getPengaturan,
  });

  const bannerAktifSetting = useMemo(() => {
    return pengaturanList.find((p) => p.kunci === 'dashboard_banner_aktif')?.nilai !== 'false';
  }, [pengaturanList]);

  const [masterBannerAktif, setMasterBannerAktif] = useState(true);

  React.useEffect(() => {
    setMasterBannerAktif(bannerAktifSetting);
  }, [bannerAktifSetting]);

  const masterToggleMutation = useMutation({
    mutationFn: async (aktif: boolean) => {
      await api.simpanPengaturan({
        kunci: 'dashboard_banner_aktif',
        nilai: aktif ? 'true' : 'false',
        keterangan: 'Status aktivasi banner iklan dashboard (true/false)',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pengaturan'] });
      queryClient.invalidateQueries({ queryKey: ['pengaturan-publik'] });
      toast.success(
        masterBannerAktif ? 'Banner Diaktifkan' : 'Banner Dinonaktifkan',
        'Pengaturan keterlihatan banner di dashboard customer berhasil diperbarui.'
      );
    },
    onError: (err: any) => {
      toast.error('Gagal mengubah status banner', err?.message || 'Coba beberapa saat lagi.');
    },
  });

  const handleMasterToggle = (checked: boolean) => {
    setMasterBannerAktif(checked);
    masterToggleMutation.mutate(checked);
  };

  // 2. Query Daftar Slide Iklan (dari sch_fleet.iklan_slide)
  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['admin-iklan-slides'],
    queryFn: api.getAdminIklanSlides,
  });

  const sortedSlides = useMemo(() => {
    return [...slides].sort((a, b) => a.urutan - b.urutan || a.id - b.id);
  }, [slides]);

  // Modal Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Partial<IklanSlide> | null>(null);
  const [formHtml, setFormHtml] = useState('');
  const [formUrutan, setFormUrutan] = useState(1);
  const [formIsAktif, setFormIsAktif] = useState(true);

  // Modal Hapus State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<IklanSlide | null>(null);

  // Mutation: Simpan Slide (Insert / Update)
  const simpanMutation = useMutation({
    mutationFn: (payload: { id?: number; konten_html: string; urutan: number; is_aktif: boolean }) =>
      api.simpanIklanSlide(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-iklan-slides'] });
      queryClient.invalidateQueries({ queryKey: ['iklan-slides'] });
      toast.success('Slide Berhasil Disimpan', 'Slide iklan banner berhasil diperbarui.');
      setEditorOpen(false);
      setEditingSlide(null);
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan slide', err?.message || 'Periksa kembali data Anda.');
    },
  });

  // Mutation: Hapus Slide
  const hapusMutation = useMutation({
    mutationFn: (id: number) => api.hapusIklanSlide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-iklan-slides'] });
      queryClient.invalidateQueries({ queryKey: ['iklan-slides'] });
      toast.success('Slide Dihapus', 'Slide iklan telah dihapus dari database.');
      setDeleteModalOpen(false);
      setSlideToDelete(null);
    },
    onError: (err: any) => {
      toast.error('Gagal menghapus slide', err?.message || 'Coba beberapa saat lagi.');
    },
  });

  // Buka modal Tambah Slide Baru
  const handleBukaTambah = () => {
    const nextUrutan = sortedSlides.length > 0 ? Math.max(...sortedSlides.map((s) => s.urutan)) + 1 : 1;
    setEditingSlide(null);
    setFormHtml(DEFAULT_SINGLE_SLIDE_TEMPLATE);
    setFormUrutan(nextUrutan);
    setFormIsAktif(true);
    setEditorOpen(true);
  };

  // Buka modal Edit Slide
  const handleBukaEdit = (slide: IklanSlide) => {
    setEditingSlide(slide);
    setFormHtml(slide.konten_html);
    setFormUrutan(slide.urutan);
    setFormIsAktif(slide.is_aktif);
    setEditorOpen(true);
  };

  // Toggle status aktif langsung dari card
  const handleToggleAktif = (slide: IklanSlide) => {
    simpanMutation.mutate({
      id: slide.id,
      konten_html: slide.konten_html,
      urutan: slide.urutan,
      is_aktif: !slide.is_aktif,
    });
  };

  // Geser Urutan Naik / Turun
  const handleSwapUrutan = (slide: IklanSlide, direction: 'up' | 'down') => {
    const currentIdx = sortedSlides.findIndex((s) => s.id === slide.id);
    if (direction === 'up' && currentIdx > 0) {
      const prevSlide = sortedSlides[currentIdx - 1];
      const temp = slide.urutan;
      const targetUrutan = prevSlide.urutan >= slide.urutan ? slide.urutan - 1 : prevSlide.urutan;
      simpanMutation.mutate({
        id: slide.id,
        konten_html: slide.konten_html,
        urutan: targetUrutan,
        is_aktif: slide.is_aktif,
      });
      simpanMutation.mutate({
        id: prevSlide.id,
        konten_html: prevSlide.konten_html,
        urutan: temp,
        is_aktif: prevSlide.is_aktif,
      });
    } else if (direction === 'down' && currentIdx < sortedSlides.length - 1) {
      const nextSlide = sortedSlides[currentIdx + 1];
      const temp = slide.urutan;
      const targetUrutan = nextSlide.urutan <= slide.urutan ? slide.urutan + 1 : nextSlide.urutan;
      simpanMutation.mutate({
        id: slide.id,
        konten_html: slide.konten_html,
        urutan: targetUrutan,
        is_aktif: slide.is_aktif,
      });
      simpanMutation.mutate({
        id: nextSlide.id,
        konten_html: nextSlide.konten_html,
        urutan: temp,
        is_aktif: nextSlide.is_aktif,
      });
    }
  };

  const handleSimpanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formHtml.trim()) {
      toast.warning('HTML Kosong', 'Kode HTML slide tidak boleh kosong.');
      return;
    }
    simpanMutation.mutate({
      id: editingSlide?.id,
      konten_html: formHtml,
      urutan: Number(formUrutan) || 1,
      is_aktif: formIsAktif,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Panel */}
      <div className="rounded-xl bg-surface-raised border border-border p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink">
                Manajemen Slide Iklan Banner (`sch_fleet.iklan_slide`)
              </h2>
              <p className="text-xs text-ink-muted">
                Setiap slide menggunakan kode HTML berisolasi (iframe 16:9) agar CSS tidak merusak tampilan utama.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={masterBannerAktif}
              onChange={(e) => handleMasterToggle(e.target.checked)}
              className="w-4 h-4 rounded text-accent accent-[#1D4ED8] focus:ring-accent/30 cursor-pointer"
            />
            <span className={masterBannerAktif ? 'text-emerald-600 font-bold' : 'text-ink-muted'}>
              {masterBannerAktif ? 'Banner Dashboard Aktif' : 'Banner Dashboard Nonaktif'}
            </span>
          </label>

          <button
            type="button"
            onClick={handleBukaTambah}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Slide Baru</span>
          </button>
        </div>
      </div>

      {/* Grid Kartu Slide */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-ink-muted bg-surface-raised rounded-xl border border-border">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat daftar slide iklan...
        </div>
      ) : sortedSlides.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-surface-raised space-y-3">
          <Layout className="w-10 h-10 text-ink-subtle mx-auto" />
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-ink">Belum Ada Slide Iklan</h3>
            <p className="text-xs text-ink-muted mt-1">
              Tambahkan slide pertama untuk menampilkan banner promo di bagian bawah dashboard customer.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBukaTambah}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Slide Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSlides.map((slide, index) => (
            <div
              key={`slide-card-${slide.id}`}
              className={`rounded-xl border transition-all duration-200 overflow-hidden flex flex-col bg-surface-raised ${
                slide.is_aktif ? 'border-border shadow-xs' : 'border-border/60 opacity-75'
              }`}
            >
              {/* Card Header: Urutan, Switch & Actions */}
              <div className="px-3.5 py-2.5 border-b border-border bg-surface flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-50 text-[#12388F] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    Urutan #{slide.urutan}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={slide.is_aktif}
                      onChange={() => handleToggleAktif(slide)}
                      className="w-3.5 h-3.5 rounded accent-[#1D4ED8] cursor-pointer"
                    />
                    <span className={slide.is_aktif ? 'text-emerald-600 text-[11px] font-bold' : 'text-ink-muted text-[11px]'}>
                      {slide.is_aktif ? 'Tayang' : 'Nonaktif'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleSwapUrutan(slide, 'up')}
                    title="Naikkan Urutan"
                    className="p-1 rounded hover:bg-surface-raised text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === sortedSlides.length - 1}
                    onClick={() => handleSwapUrutan(slide, 'down')}
                    title="Turunkan Urutan"
                    className="p-1 rounded hover:bg-surface-raised text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Thumbnail Widescreen 16:9 Iframe */}
              <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden border-b border-border">
                <iframe
                  srcDoc={slide.konten_html}
                  title={`Mini Preview Slide ${slide.id}`}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  scrolling="no"
                  className="w-full h-full border-0 pointer-events-none select-none"
                />
              </div>

              {/* Card Footer: Metadata & Buttons */}
              <div className="p-3 mt-auto flex items-center justify-between gap-2">
                <span className="text-[10px] text-ink-muted font-mono truncate">
                  ID: #{slide.id} • {slide.konten_html.length.toLocaleString('id-ID')} bytes
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBukaEdit(slide)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-white hover:bg-surface text-ink text-xs font-semibold transition-colors cursor-pointer dark:bg-surface dark:hover:bg-surface-raised"
                  >
                    <Edit className="w-3 h-3 text-accent" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSlideToDelete(slide);
                      setDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400"
                    title="Hapus Slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Full Carousel Preview di Bagian Bawah */}
      {sortedSlides.some((s) => s.is_aktif) && (
        <div className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-accent" />
              Live Pratinjau Carousel Customer (Auto-Slide 5 Detik)
            </h3>
            <span className="text-[11px] text-ink-muted">
              {sortedSlides.filter((s) => s.is_aktif).length} Slide Aktif
            </span>
          </div>
          <div className="max-w-4xl">
            <MultiSlideBanner
              slides={sortedSlides}
              onBookingClick={() => toast.info('Booking Service', 'Tombol CTA di dalam slide berhasil diklik!')}
            />
          </div>
        </div>
      )}

      {/* MODAL / DRAWER: Editor Slide */}
      <SlideModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingSlide ? `Edit Slide Iklan (ID #${editingSlide.id})` : 'Tambah Slide Iklan Baru'}
        subtitle="Isi kode HTML untuk slide ini. Gunakan iframe 16:9 berisolasi penuh."
        maxWidthClass="max-w-5xl"
      >
        <form onSubmit={handleSimpanSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-surface/60">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Urutan Tampilan
              </label>
              <input
                type="number"
                min="1"
                value={formUrutan}
                onChange={(e) => setFormUrutan(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-9 rounded-lg border border-border bg-white px-3 text-xs font-bold text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-surface-raised"
                required
              />
              <p className="text-[10px] text-ink-muted mt-0.5">
                Slide diurutkan dari angka terkecil ke terbesar.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="block text-xs font-bold text-ink mb-1">
                Status Penayangan
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none mt-1">
                <input
                  type="checkbox"
                  checked={formIsAktif}
                  onChange={(e) => setFormIsAktif(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#1D4ED8] cursor-pointer"
                />
                <span className={formIsAktif ? 'text-emerald-600 font-bold' : 'text-ink-muted'}>
                  {formIsAktif ? 'Aktif (Tampil di Dashboard Customer)' : 'Nonaktif (Disembunyikan)'}
                </span>
              </label>
            </div>
          </div>

          {/* HTML Code Editor dengan Live Preview */}
          <HtmlCodeEditor
            value={formHtml}
            onChange={setFormHtml}
            onSave={handleSimpanSubmit}
            isSaving={simpanMutation.isPending}
            onResetTemplate={() => {
              setFormHtml(DEFAULT_SINGLE_SLIDE_TEMPLATE);
              toast.info('Template Dimuat', 'Template sample hero banner 16:9 dimuat ke editor.');
            }}
            onClear={() => setFormHtml('')}
            mediaList={mediaList}
            onOpenMediaTab={() => {
              setEditorOpen(false);
              onOpenMediaGallery?.();
            }}
            previewComponent={
              formHtml.trim() ? (
                <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
                  <iframe
                    srcDoc={formHtml}
                    title="Live Preview Single Slide"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    scrolling="no"
                    className="w-full h-full border-0 pointer-events-auto"
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-border rounded-xl">
                  Kode HTML masih kosong. Klik &quot;Pakai Template&quot; untuk memuat template default.
                </div>
              )
            }
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="px-4 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-ink hover:bg-surface cursor-pointer dark:bg-surface"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={simpanMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {simpanMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{editingSlide ? 'Simpan Perubahan' : 'Buat Slide'}</span>
            </button>
          </div>
        </form>
      </SlideModal>

      {/* MODAL: Konfirmasi Hapus Slide */}
      <SlideModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Hapus Slide Iklan?"
        subtitle="Slide yang dihapus tidak akan ditampilkan lagi pada dashboard pelanggan."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink">
            Apakah Anda yakin ingin menghapus <strong>Slide #{slideToDelete?.urutan} (ID #{slideToDelete?.id})</strong>?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-ink hover:bg-surface cursor-pointer dark:bg-surface"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={hapusMutation.isPending}
              onClick={() => slideToDelete?.id && hapusMutation.mutate(slideToDelete.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {hapusMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Ya, Hapus Slide</span>
            </button>
          </div>
        </div>
      </SlideModal>
    </div>
  );
};
