import React, { useRef, useState } from 'react';
import { Camera, UploadCloud, X, CheckCircle, Loader2 } from 'lucide-react';
import { uploadFileToStorage } from '../../api/client';

interface PhotoUploaderProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  bucket?: 'foto_kendaraan' | 'foto_barang' | 'dokumen_armada';
  required?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  label = 'Unggah Foto',
  value,
  onChange,
  bucket = 'foto_kendaraan',
  required = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('Ukuran foto maksimal 15 MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = await uploadFileToStorage(file, bucket);
      onChange(url);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video max-h-48 flex items-center justify-center">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow transition-transform hover:scale-105 text-xs font-medium flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Ganti
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow transition-transform hover:scale-105 text-xs font-medium flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <CheckCircle className="w-3 h-3" /> Tersimpan
          </div>
        </div>
      ) : (
        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            loading
              ? 'bg-slate-50 border-slate-300 cursor-not-allowed'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-white'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center py-2 text-blue-600">
              <Loader2 className="w-7 h-7 animate-spin mb-1.5" />
              <span className="text-xs font-medium text-slate-600">Mengunggah & mengompres foto...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-sm">
                <Camera className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Ambil Foto Kamera / Unggah File
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Maks. 15MB (JPG, PNG, WebP) - Kompresi Otomatis
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
};
