import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto Langsung',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Stop video stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start stream
  const startCamera = async (facing: 'environment' | 'user') => {
    stopStream();
    setIsInitializing(true);
    setErrorMsg(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung akses kamera langsung (getUserMedia). Pastikan menggunakan HTTPS atau localhost.');
      }

      // Check available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (_) {
        // Enumerate devices is optional
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Gagal mengakses kamera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Izin akses kamera ditolak. Izinkan izin kamera pada browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Perangkat kamera tidak ditemukan pada komputer/HP ini.');
      } else {
        setErrorMsg(err.message || 'Gagal menyalakan kamera.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedBlobUrl(null);
      setCapturedFile(null);
      startCamera(facingMode);
    } else {
      stopStream();
      if (capturedBlobUrl) {
        URL.revokeObjectURL(capturedBlobUrl);
        setCapturedBlobUrl(null);
      }
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to high quality JPEG file
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `kamera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const blobUrl = URL.createObjectURL(blob);
        setCapturedFile(file);
        setCapturedBlobUrl(blobUrl);
        stopStream();
      },
      'image/jpeg',
      0.92
    );
  };

  const retakeSnapshot = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
      setCapturedBlobUrl(null);
    }
    setCapturedFile(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedFile) return;
    onCapture(capturedFile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-3 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/80">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport View */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[460px] overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center max-w-sm text-slate-300 space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-xs font-semibold text-rose-400">{errorMsg}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
            </div>
          ) : capturedBlobUrl ? (
            <img
              src={capturedBlobUrl}
              alt="Hasil Tangkapan Kamera"
              className="w-full h-full object-contain max-h-[460px]"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-contain max-h-[460px]"
              />
              {isInitializing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
                  <div className="w-7 h-7 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-slate-300">Menghubungkan ke kamera...</span>
                </div>
              )}
            </>
          )}

          {/* Switch Camera Button (jika mobile ada kamera depan/belakang) */}
          {!capturedBlobUrl && !errorMsg && hasMultipleCameras && (
            <button
              type="button"
              onClick={toggleCamera}
              className="absolute top-3 right-3 rounded-full bg-black/60 p-2.5 text-white backdrop-blur hover:bg-black/80 transition-colors"
              title="Ganti Kamera Depan / Belakang"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="border-t border-slate-800 bg-slate-950 p-4 flex items-center justify-center gap-4">
          {capturedBlobUrl ? (
            <>
              <button
                type="button"
                onClick={retakeSnapshot}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Foto Ulang
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto Ini
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={isInitializing || Boolean(errorMsg)}
              className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 shadow-xl transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Tekan untuk Ambil Foto"
            >
              <div className="h-12 w-12 rounded-full bg-white group-hover:bg-slate-100 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
