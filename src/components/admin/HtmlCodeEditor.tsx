import React, { useState, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Maximize2,
  Minimize2,
  Code,
  Eye,
  Sparkles,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  X,
  Search,
  FileCode,
  Save,
  Check,
  AlignLeft,
} from 'lucide-react';
import { MediaIklan } from '../../types';
import { formatBytes } from '../../utils/imageCompressor';
import { toast } from '../common/Toast';

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onResetTemplate?: () => void;
  onClear?: () => void;
  mediaList?: MediaIklan[];
  onOpenMediaTab?: () => void;
  previewComponent?: React.ReactNode;
}

export const HtmlCodeEditor: React.FC<HtmlCodeEditorProps> = ({
  value,
  onChange,
  onSave,
  isSaving = false,
  onResetTemplate,
  onClear,
  mediaList = [],
  onOpenMediaTab,
  previewComponent,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenTab, setFullscreenTab] = useState<'editor' | 'preview'>('editor');

  // Media Picker Modal State
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [selectedMediaForInsert, setSelectedMediaForInsert] = useState<MediaIklan | null>(null);

  // Handle onMount Monaco Editor
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register shortcut Ctrl+S / Cmd+S untuk simpan
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave();
      }
    });

    // Auto format on load jika ada konten
    setTimeout(() => {
      try {
        editor.getAction('editor.action.formatDocument')?.run();
      } catch {
        // ignore format error
      }
    }, 500);
  };

  // Format Dokumen Manual
  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
      toast.info('Format Kode Selesai', 'Kode HTML & CSS telah dirapikan (auto-indented).');
    }
  };

  // Sisipkan Snippet Gambar Langsung ke Posisi Kursor Monaco
  const insertSnippetAtCursor = (snippet: string) => {
    const editor = editorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('insert-image-snippet', [
          {
            range: selection,
            text: snippet,
            forceMoveMarkers: true,
          },
        ]);
        editor.focus();
        return;
      }
    }
    // Fallback jika editor belum fokus
    onChange(value ? `${value}\n${snippet}` : snippet);
  };

  // Eksekusi Sisipkan dari Modal Media
  const handleExecuteInsertMedia = (format: 'img' | 'bg') => {
    if (!selectedMediaForInsert) return;

    const altText = selectedMediaForInsert.keterangan || selectedMediaForInsert.referensi_id;
    let snippet = '';

    if (format === 'img') {
      snippet = `\n<!-- Gambar Iklan: ${altText} -->\n<img \n  src="${selectedMediaForInsert.foto_data}" \n  alt="${altText}" \n  class="mt-banner-img" \n  style="width: 100%; height: auto; border-radius: 0.75rem; object-fit: cover;" \n  loading="lazy" \n/>\n`;
    } else {
      snippet = `style="background-image: url('${selectedMediaForInsert.foto_data}');"`;
    }

    insertSnippetAtCursor(snippet);
    toast.success(
      'Gambar Disisipkan ke Editor',
      format === 'img' ? 'Tag <img> telah disisipkan di posisi kursor.' : 'CSS background-image telah disisipkan di posisi kursor.'
    );

    setSelectedMediaForInsert(null);
    setShowMediaModal(false);
  };

  // Keyboard listener untuk tombol Escape keluar dari fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll saat Fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Filter media untuk modal
  const filteredMedia = mediaList.filter((m) => {
    const q = mediaSearch.toLowerCase();
    return (
      (m.keterangan || '').toLowerCase().includes(q) ||
      m.referensi_id.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* ========================================================
          MODE NORMAL (EMBEDDED DI DALAM KARTU PENGATURAN)
          ======================================================== */}
      {!isFullscreen && (
        <div className="rounded-xl border border-border bg-slate-950 overflow-hidden shadow-xs">
          {/* Toolbar Normal */}
          <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                Editor Kode HTML (VS Code Engine)
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 font-semibold">
                HTML + CSS
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tombol Sisipkan Media */}
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-[11px] font-semibold transition cursor-pointer"
                title="Pilih gambar dari database sch_fleet.foto untuk disisipkan ke kode"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Sisipkan Gambar ({mediaList.length})
              </button>

              {/* Tombol Format Kode */}
              <button
                type="button"
                onClick={handleFormatCode}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-medium transition cursor-pointer"
                title="Format dan rapikan indentasi kode HTML"
              >
                <AlignLeft className="w-3 h-3" />
                Format
              </button>

              {/* Tombol Pakai Template */}
              {onResetTemplate && (
                <button
                  type="button"
                  onClick={onResetTemplate}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-accent/40 bg-accent-subtle/40 text-accent hover:bg-accent-subtle text-[11px] font-semibold transition cursor-pointer"
                  title="Pakai template slider otomatis 3 slide promosi Master Truck"
                >
                  <Sparkles className="w-3 h-3" />
                  Pakai Template
                </button>
              )}

              {/* Tombol Bersihkan */}
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 text-[11px] font-medium transition cursor-pointer"
                  title="Kosongkan HTML"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}

              {/* Tombol Fullscreen */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs ml-1"
                title="Buka Editor Layar Penuh (Fullscreen dengan Tab Switcher)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Layar Penuh
              </button>
            </div>
          </div>

          {/* Monaco Editor Canvas */}
          <div className="h-[360px] w-full">
            <Editor
              height="100%"
              language="html"
              theme="vs-dark"
              value={value}
              onChange={(val) => onChange(val || '')}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: true },
                fontSize: 13,
                fontFamily: 'Consolas, "Courier New", monospace',
                tabSize: 2,
                wordWrap: 'on',
                lineNumbers: 'on',
                formatOnPaste: true,
                formatOnType: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
                fixedOverflowWidgets: true,
                suggest: {
                  showWords: true,
                  snippetsPreventQuickSuggestions: false,
                },
              }}
              loading={
                <div className="h-full flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-950">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Memuat VS Code Editor...</span>
                </div>
              }
            />
          </div>

          {/* Footer Bar Normal */}
          <div className="px-3.5 py-1.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span>HTML &bull; UTF-8</span>
              <span>Tekan <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">Ctrl+S</kbd> untuk simpan</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1 cursor-pointer font-sans"
            >
              Mode Layar Penuh <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE FULLSCREEN (TAB SWITCHER: EDITOR vs PRATINJAU)
          ======================================================== */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-150">
          {/* Header Fullscreen dengan Tab Switcher */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Sisi Kiri: Brand & Info */}
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Editor HTML Banner Iklan
                  <span className="text-[10px] font-mono font-normal text-slate-400">&bull; Mode Layar Penuh</span>
                </h3>
              </div>
            </div>

            {/* Tengah: TAB SWITCHER (Editor vs Pratinjau) */}
            <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setFullscreenTab('editor')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  fullscreenTab === 'editor'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Editor Kode (VS Code)</span>
              </button>

              <button
                type="button"
                onClick={() => setFullscreenTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  fullscreenTab === 'preview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Pratinjau Dashboard</span>
              </button>
            </div>

            {/* Sisi Kanan: Aksi & Tombol Keluar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold transition cursor-pointer"
                title="Pilih gambar dari galeri sch_fleet.foto"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Sisipkan Gambar
              </button>

              {fullscreenTab === 'editor' && (
                <button
                  type="button"
                  onClick={handleFormatCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                  title="Format dokumen (auto indent)"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  Format
                </button>
              )}

              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan Banner
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer ml-1"
                title="Keluar dari layar penuh (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Keluar (Esc)
              </button>
            </div>
          </div>

          {/* Konten Fullscreen Sesuai Tab Switcher */}
          <div className="flex-1 w-full overflow-hidden relative">
            {fullscreenTab === 'editor' ? (
              <div className="w-full h-full">
                <Editor
                  height="100%"
                  language="html"
                  theme="vs-dark"
                  value={value}
                  onChange={(val) => onChange(val || '')}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    fontFamily: 'Consolas, "Courier New", monospace',
                    tabSize: 2,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'all',
                    fixedOverflowWidgets: true,
                    suggest: {
                      showWords: true,
                      snippetsPreventQuickSuggestions: false,
                    },
                  }}
                  loading={
                    <div className="h-full flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-950">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Memuat VS Code Editor...</span>
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="w-full h-full overflow-y-auto p-6 bg-slate-900/60 flex flex-col items-center">
                <div className="w-full max-w-5xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-300">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-blue-400" />
                      Pratinjau Hasil Banner Iklan Dashboard Customer
                    </p>
                    <span className="text-xs font-mono text-slate-400">
                      Live Rendering Realtime
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 p-4">
                    {previewComponent}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar Fullscreen */}
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Monaco Editor (VS Code Engine)
              </span>
              <span>HTML &bull; CSS IntelliSense</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Shortcut: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">Ctrl+S</kbd> Simpan</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">Esc</kbd> Keluar</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PEMILIH GAMBAR DARI GALERI MEDIA
          ======================================================== */}
      {showMediaModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface-raised rounded-xl border border-border shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface/50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-xs font-bold text-ink">Pilih Gambar dari Galeri Media Iklan</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMediaModal(false);
                  setSelectedMediaForInsert(null);
                }}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-border bg-surface">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Cari berdasarkan judul atau slug..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto">
              {selectedMediaForInsert ? (
                /* Format Selector Sub-view */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
                    <img
                      src={selectedMediaForInsert.foto_data}
                      alt="Thumb"
                      className="w-16 h-16 rounded-md object-cover shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-ink">
                        {selectedMediaForInsert.keterangan || selectedMediaForInsert.referensi_id}
                      </h4>
                      <p className="text-[10px] text-ink-muted font-mono mt-0.5">#{selectedMediaForInsert.referensi_id}</p>
                      <p className="text-[10px] text-ink-muted">{formatBytes(selectedMediaForInsert.size_bytes)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-ink-muted">Pilih format penyematan ke editor HTML di posisi kursor:</p>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => handleExecuteInsertMedia('img')}
                      className="w-full text-left p-3.5 rounded-xl border border-border hover:border-accent hover:bg-surface transition group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink group-hover:text-accent">
                          1. Tag &lt;img&gt; Standar (Responsif)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                          Direkomendasikan
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1 font-mono">
                        &lt;img src=&quot;data:...&quot; alt=&quot;...&quot; class=&quot;mt-banner-img&quot; /&gt;
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteInsertMedia('bg')}
                      className="w-full text-left p-3.5 rounded-xl border border-border hover:border-accent hover:bg-surface transition group cursor-pointer"
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

                  <button
                    type="button"
                    onClick={() => setSelectedMediaForInsert(null)}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    &larr; Pilih gambar lain
                  </button>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="py-12 text-center text-ink-muted space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto text-ink-muted/50" />
                  <p className="text-xs">Tidak ada gambar yang cocok.</p>
                  {onOpenMediaTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMediaModal(false);
                        onOpenMediaTab();
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Buka Galeri Media untuk Upload Gambar Baru
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredMedia.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMediaForInsert(m)}
                      className="group rounded-lg border border-border hover:border-blue-500 overflow-hidden cursor-pointer transition bg-surface hover:shadow-sm flex flex-col"
                    >
                      <div className="aspect-video bg-slate-950 overflow-hidden relative">
                        <img
                          src={m.foto_data}
                          alt={m.keterangan || m.referensi_id}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                          {formatBytes(m.size_bytes)}
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-bold text-ink truncate">
                          {m.keterangan || m.referensi_id}
                        </p>
                        <p className="text-[9px] text-ink-muted font-mono truncate">#{m.referensi_id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-surface/50 border-t border-border flex items-center justify-between">
              {onOpenMediaTab && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMediaModal(false);
                    onOpenMediaTab();
                  }}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Kelola / Upload di Galeri Media &rarr;
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowMediaModal(false);
                  setSelectedMediaForInsert(null);
                }}
                className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
