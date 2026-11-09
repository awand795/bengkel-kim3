import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Code,
  Eye,
  X,
  Search,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { MediaIklan } from '../../types';
import { compressImage, formatBytes, CompressedImageResult } from '../../utils/imageCompressor';
import { toast } from '../common/Toast';

interface MediaGalleryTabProps {
  onInsertToHtml?: (snippet: string) => void;
  onGoToBannerEditor?: () => void;
}

export const MediaGalleryTab: React.FC<MediaGalleryTabProps> = ({
  onInsertToHtml,
  onGoToBannerEditor,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressedResult, setCompressedResult] = useState<CompressedImageResult | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [judul, setJudul] = useState('');
  const [slug, setSlug] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  // Modal / Action State
  const [previewImage, setPreviewImage] = useState<MediaIklan | null>(null);
  const [insertModalItem, setInsertModalItem] = useState<MediaIklan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaIklan | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Galeri Media
  const { data: mediaList = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-media-iklan'],
    queryFn: () => api.getMediaIklan(),
    staleTime: 30000,
  });

  // Handle Pilih File & Kompresi
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Berkas Tidak Valid', 'Silakan pilih berkas gambar (JPG, PNG, WebP).');
      return;
    }

    try {
      setSelectedFile(file);
      setCompressing(true);
      const res = await compressImage(file, { maxWidth: 1280, quality: 0.85 });
      setCompressedResult(res);
      setSlug(res.suggestedSlug);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setJudul(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      setShowUploadForm(true);
    } catch (err: any) {
      toast.error('Gagal Mengolah Gambar', err.message || 'Coba gunakan gambar lain.');
      setSelectedFile(null);
      setCompressedResult(null);
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Simpan / Upload ke Database
  const handleSimpanUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compressedResult) return;

    const cleanSlug = slug.trim();
    if (!cleanSlug) {
      toast.warning('Slug Referensi Diperlukan', 'Masukkan slug pengenal gambar.');
      return;
    }

    setUploadProgress(true);
    try {
      await api.simpanMediaIklan({
        referensi_id: cleanSlug,
        foto_data: compressedResult.dataUrl,
        keterangan: judul.trim() || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ['admin-media-iklan'] });
      toast.success('Gambar Berhasil Disimpan', `Gambar "${judul || cleanSlug}" telah tersimpan di database.`);

      // Reset Form
      setShowUploadForm(false);
      setSelectedFile(null);
      setCompressedResult(null);
      setJudul('');
      setSlug('');
    } catch (err: any) {
      toast.error('Gagal Menyimpan Gambar', err?.response?.data?.message || err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setUploadProgress(false);
    }
  };

  // Hapus Gambar
  const deleteMutation = useMutation({
    mutationFn: (target: MediaIklan) =>
      api.hapusMediaIklan({ id: target.id, referensi_id: target.referensi_id }),
    onSuccess: (_, target) => {
      queryClient.invalidateQueries({ queryKey: ['admin-media-iklan'] });
      toast.success('Gambar Dihapus', `Gambar "${target.keterangan || target.referensi_id}" berhasil dihapus dari database.`);
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error('Gagal Menghapus', err?.response?.data?.message || err.message || 'Coba beberapa saat lagi.');
    },
  });

  // Salin Kode ke Clipboard
  const handleCopy = (text: string, label: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info('Tersalin ke Clipboard', `${label} berhasil disalin.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Eksekusi Sisipkan ke Editor HTML
  const executeInsert = (format: 'img' | 'bg') => {
    if (!insertModalItem) return;

    let snippet = '';
    const altText = insertModalItem.keterangan || insertModalItem.referensi_id;

    if (format === 'img') {
      snippet = `\n<!-- Gambar Iklan: ${altText} -->\n<img \n  src="${insertModalItem.foto_data}" \n  alt="${altText}" \n  class="mt-banner-img" \n  style="width: 100%; height: auto; border-radius: 0.75rem; object-fit: cover;" \n  loading="lazy" \n/>\n`;
    } else {
      snippet = `style="background-image: url('${insertModalItem.foto_data}');"`;
    }

    if (onInsertToHtml) {
      onInsertToHtml(snippet);
      toast.success(
        'Gambar Disisipkan ke HTML',
        format === 'img'
          ? 'Tag <img> telah disisipkan ke editor HTML banner.'
          : 'CSS background-image telah disisipkan ke editor HTML banner.'
      );
      setInsertModalItem(null);
      if (onGoToBannerEditor) {
        onGoToBannerEditor();
      }
    } else {
      handleCopy(snippet, format === 'img' ? 'Tag <img>' : 'CSS background-image', String(insertModalItem.id));
      setInsertModalItem(null);
    }
  };

  // Filter list berdasarkan pencarian
  const filteredList = mediaList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchKet = (item.keterangan || '').toLowerCase().includes(q);
    const matchRef = item.referensi_id.toLowerCase().includes(q);
    return matchKet || matchRef;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER CARD: JUDUL & AKSI UTAMA ── */}
      <div className="rounded-xl bg-surface-raised border border-border p-4.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink">Galeri Media & Gambar Iklan</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {mediaList.length} Gambar
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Simpan gambar promosi di database <code className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">sch_fleet.foto</code>. Siap disisipkan langsung ke template HTML banner iklan customer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-xs font-semibold transition cursor-pointer"
              title="Segarkan data galeri"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Segarkan
            </button>

            <button
              type="button"
              onClick={() => {
                setShowUploadForm(!showUploadForm);
                if (!showUploadForm) {
                  fileInputRef.current?.click();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Gambar Baru
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama atau slug..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          {onGoToBannerEditor && (
            <button
              type="button"
              onClick={onGoToBannerEditor}
              className="inline-flex items-center gap-1.5 text-xs text-[#1D4ED8] hover:underline font-semibold cursor-pointer"
            >
              Buka Editor Banner HTML <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── CARD UPLOAD FORM (EXPANDABLE) ── */}
      {showUploadForm && (
        <div className="rounded-xl bg-surface-raised border border-accent/40 shadow-sm p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold text-ink">Upload & Kompres Gambar Otomatis</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setCompressedResult(null);
              }}
              className="text-ink-muted hover:text-ink p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {compressing ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-ink-muted">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span>Mengoptimasi resolusi gambar...</span>
            </div>
          ) : compressedResult ? (
            <form onSubmit={handleSimpanUpload} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Thumbnail Preview */}
                <div className="relative rounded-lg border border-border bg-slate-950/5 flex items-center justify-center overflow-hidden max-h-48">
                  <img
                    src={compressedResult.dataUrl}
                    alt="Preview"
                    className="max-h-48 w-auto object-contain"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-white font-mono">
                    {compressedResult.width} × {compressedResult.height}px
                  </div>
                </div>

                {/* Form Fields */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Judul / Keterangan Gambar *
                    </label>
                    <input
                      type="text"
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      placeholder="Contoh: Promo Paket Servis Truk Diesel"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Slug Pengenal (ID Unik) *
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="Contoh: promo-servis-diesel-2026"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                    <p className="text-[10px] text-ink-muted mt-1">
                      Kunci unik untuk referensi di database <code className="text-ink">sch_fleet.foto</code>.
                    </p>
                  </div>

                  {/* Size info badge */}
                  <div className="p-2.5 rounded-lg bg-status-green-bg/60 border border-status-green-border text-[11px] text-status-green flex items-center justify-between">
                    <span>
                      Ukuran Asli: <strong className="font-semibold">{formatBytes(selectedFile?.size)}</strong>
                    </span>
                    <span>
                      Hasil Kompresi: <strong className="font-bold">{formatBytes(compressedResult.sizeBytes)}</strong>
                    </span>
                    <span className="font-semibold">
                      Hemat ~{Math.max(0, Math.round((1 - compressedResult.sizeBytes / (selectedFile?.size || 1)) * 100))}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFile(null);
                    setCompressedResult(null);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {uploadProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Simpan Gambar ke Database
                </button>
              </div>
            </form>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-border hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors bg-surface/40 hover:bg-surface/80"
            >
              <FileImage className="w-8 h-8 mx-auto text-ink-muted mb-2" />
              <p className="text-xs font-semibold text-ink">Klik untuk memilih gambar atau seret berkas ke sini</p>
              <p className="text-[11px] text-ink-muted mt-1">Mendukung format JPG, PNG, WebP (otomatis dikompresi ke resolusi ramah web)</p>
            </div>
          )}
        </div>
      )}

      {/* ── GRID GALERI GAMBAR ── */}
      {isLoading ? (
        <div className="py-16 rounded-xl border border-border bg-surface-raised flex flex-col items-center justify-center gap-2 text-ink-muted">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className="text-xs">Memuat galeri media dari database...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 rounded-xl border border-dashed border-border bg-surface-raised flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-ink">
            {searchQuery ? 'Tidak Ada Gambar yang Cocok' : 'Belum Ada Gambar di Galeri'}
          </h3>
          <p className="text-xs text-ink-muted max-w-sm mt-1 mb-4">
            {searchQuery
              ? `Tidak ditemukan gambar dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
              : 'Unggah gambar banner promosi pertama Anda untuk digunakan pada HTML iklan dashboard customer.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Gambar Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-border bg-surface-raised overflow-hidden flex flex-col hover:border-accent/50 transition-all hover:shadow-sm"
            >
              {/* Media Thumbnail */}
              <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={item.foto_data}
                  alt={item.keterangan || item.referensi_id}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(item)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                    title="Lihat Pratinjau Penuh"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </button>
                  <span className="text-[10px] text-white font-mono px-1.5 py-0.5 rounded bg-black/60">
                    {formatBytes(item.size_bytes)}
                  </span>
                </div>
              </div>

              {/* Media Info */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-ink line-clamp-1" title={item.keterangan || item.referensi_id}>
                    {item.keterangan || item.referensi_id}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-ink-muted mt-1 font-mono">
                    <span className="truncate max-w-[140px]" title={item.referensi_id}>
                      #{item.referensi_id}
                    </span>
                    <span>{formatBytes(item.size_bytes)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-border flex flex-col gap-1.5">
                  {/* Tombol Sisipkan */}
                  <button
                    type="button"
                    onClick={() => setInsertModalItem(item)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Sisipkan langsung ke editor HTML banner"
                  >
                    <Code className="w-3.5 h-3.5" />
                    Sisipkan ke HTML Banner
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Salin Tag <img> */}
                    <button
                      type="button"
                      onClick={() => {
                        const tag = `<img src="${item.foto_data}" alt="${item.keterangan || item.referensi_id}" class="mt-banner-img" style="width:100%; border-radius:0.75rem;" />`;
                        handleCopy(tag, 'Tag <img>', `tag-${item.id}`);
                      }}
                      className="py-1 px-2 rounded-md border border-border hover:bg-surface text-[11px] font-medium text-ink-muted hover:text-ink flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Salin tag HTML <img> lengkap"
                    >
                      {copiedId === `tag-${item.id}` ? <CheckCircle2 className="w-3 h-3 text-status-green" /> : <Copy className="w-3 h-3" />}
                      <span>Tag &lt;img&gt;</span>
                    </button>

                    {/* Salin Data URL */}
                    <button
                      type="button"
                      onClick={() => handleCopy(item.foto_data, 'Data URL Base64', `url-${item.id}`)}
                      className="py-1 px-2 rounded-md border border-border hover:bg-surface text-[11px] font-medium text-ink-muted hover:text-ink flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Salin string Data URL Base64 (untuk CSS background-image)"
                    >
                      {copiedId === `url-${item.id}` ? <CheckCircle2 className="w-3 h-3 text-status-green" /> : <Copy className="w-3 h-3" />}
                      <span>Data URL</span>
                    </button>
                  </div>

                  {/* Tombol Hapus */}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="w-full py-1 px-2 rounded-md text-[11px] text-ink-muted hover:text-status-red hover:bg-status-red-bg/40 flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus dari Database</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL PILIHAN FORMAT SISIPKAN ── */}
      {insertModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface-raised rounded-xl border border-border shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-xs font-bold text-ink">Sisipkan Gambar ke Editor Banner</h3>
              </div>
              <button
                type="button"
                onClick={() => setInsertModalItem(null)}
                className="text-ink-muted hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface border border-border">
                <img
                  src={insertModalItem.foto_data}
                  alt="Thumb"
                  className="w-14 h-14 rounded-md object-cover shrink-0"
                />
                <div className="truncate">
                  <p className="text-xs font-bold text-ink truncate">{insertModalItem.keterangan || insertModalItem.referensi_id}</p>
                  <p className="text-[10px] text-ink-muted font-mono">#{insertModalItem.referensi_id}</p>
                  <p className="text-[10px] text-ink-muted">{formatBytes(insertModalItem.size_bytes)}</p>
                </div>
              </div>

              <p className="text-xs text-ink-muted">Pilih format kode yang ingin disisipkan ke editor HTML banner:</p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => executeInsert('img')}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-surface transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink group-hover:text-accent">
                      1. Tag &lt;img&gt; Standar (Responsif)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                      Direkomendasikan
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1 font-mono">
                    &lt;img src=&quot;data:...&quot; class=&quot;mt-banner-img&quot; style=&quot;width:100%&quot; /&gt;
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => executeInsert('bg')}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-surface transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink group-hover:text-accent">
                      2. CSS Background Image (Slider Carousel)
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1 font-mono">
                    style=&quot;background-image: url(&apos;data:...&apos;);&quot;
                  </p>
                </button>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-surface/50 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setInsertModalItem(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface-raised rounded-xl border border-border shadow-xl max-w-sm w-full p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-status-red-bg text-status-red shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-ink">Hapus Gambar dari Database?</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border flex items-center gap-2.5">
              <img
                src={deleteTarget.foto_data}
                alt="Delete Target"
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
              <div className="truncate text-xs">
                <p className="font-semibold text-ink truncate">{deleteTarget.keterangan || deleteTarget.referensi_id}</p>
                <p className="text-[10px] text-ink-muted font-mono truncate">#{deleteTarget.referensi_id}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-status-red hover:bg-status-red/90 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Ya, Hapus Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FULLSCREEN PREVIEW ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-raised rounded-xl border border-border shadow-2xl max-w-3xl w-full overflow-hidden cursor-default"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-ink">{previewImage.keterangan || previewImage.referensi_id}</h4>
                <p className="text-[10px] text-ink-muted font-mono">#{previewImage.referensi_id} • {formatBytes(previewImage.size_bytes)}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-md text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewImage.foto_data}
                alt="Preview Detail"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>

            <div className="p-3 bg-surface/50 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-ink-muted">
                Dibuat: {previewImage.created_at ? new Date(previewImage.created_at).toLocaleString('id-ID') : '-'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setInsertModalItem(previewImage);
                  setPreviewImage(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
                Sisipkan ke HTML Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
