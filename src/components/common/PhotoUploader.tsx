import React, { useRef, useState } from 'react';
import { Camera, X, CheckCircle, Loader2, Upload } from 'lucide-react';
import { processPhotoUpload } from '../../utils/storage';
import { CameraCaptureModal } from './CameraCaptureModal';

interface PhotoUploaderProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
  /**
   * Jika preferDirectCamera = true, saat area upload ditekan,
   * langsung membuka modal kamera langsung (live camera stream).
   */
  preferDirectCamera?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  label = 'Unggah Foto',
  value,
  onChange,
  required = false,
  preferDirectCamera = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const handleProcessFile = async (file: File) => {
    // Validate size (< 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('Ukuran foto maksimal 15 MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload ke database via API Builder (fallback Base64 bila server gagal)
      const url = await processPhotoUpload(file);
      onChange(url);
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleProcessFile(file);
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCameraOrFile = () => {
    if (loading) return;
    if (preferDirectCamera) {
      setIsCameraModalOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-ink-muted">
          {label} {required && <span className="text-status-red">*</span>}
        </label>
      )}

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-border bg-surface aspect-video max-h-48 flex items-center justify-center">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-3">
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow transition-transform hover:scale-105 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Foto Ulang dari Kamera"
            >
              <Camera className="w-3.5 h-3.5" /> Kamera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-surface text-ink rounded-lg hover:bg-surface-raised shadow transition-transform hover:scale-105 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Pilih File dari Galeri / Folder"
            >
              <Upload className="w-3.5 h-3.5" /> File
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-status-red text-white rounded-lg hover:bg-status-red/90 shadow transition-transform hover:scale-105 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Hapus Foto"
            >
              <X className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-status-green text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <CheckCircle className="w-3 h-3" /> Tersimpan
          </div>
        </div>
      ) : (
        <div
          onClick={openCameraOrFile}
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            loading
              ? 'bg-surface border-border cursor-not-allowed'
              : 'border-[#CBD5E1] dark:border-border hover:border-[#12388F] hover:bg-[#EEF2FF] dark:hover:bg-blue-950/30 bg-white dark:bg-surface-raised shadow-2xs'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center py-2 text-accent">
              <Loader2 className="w-7 h-7 animate-spin mb-1.5" />
              <span className="text-xs font-medium text-ink-muted">Mengunggah foto ke database...</span>
            </div>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center mb-2 shadow-2xs border border-emerald-200 dark:border-emerald-800">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-ink">
                {preferDirectCamera ? 'Klik untuk Buka Kamera Langsung' : 'Ambil Foto Kamera / Unggah File'}
              </p>
              <p className="text-[11px] text-ink-subtle mt-0.5">
                Kamera Live • Kompresi Otomatis Maks. 15MB
              </p>
              {preferDirectCamera && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-[11px] shadow-xs">
                    <Camera className="w-3 h-3" /> Buka Kamera
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold"
                  >
                    <Upload className="w-3 h-3" /> atau Dari File
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Hidden file input as alternative */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleProcessFile}
        title={label ? `Kamera: ${label}` : 'Ambil Foto Langsung'}
      />

      {error && <p className="text-xs text-status-red mt-1">{error}</p>}
    </div>
  );
};
