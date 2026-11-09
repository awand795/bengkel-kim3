/**
 * Utilitas Kompresi & Pemrosesan Gambar di Browser
 * Mengoptimalkan gambar banner/iklan sebelum dikirim ke database
 * agar tidak membebani network & storage (menjaga resolusi maksimal 1280px).
 */

export interface CompressedImageResult {
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
  mimeType: string;
  filename: string;
  suggestedSlug: string;
}

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export const compressImage = async (
  file: File,
  options: CompressOptions = {}
): Promise<CompressedImageResult> => {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.85,
    format = file.type === 'image/png' ? 'image/png' : 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Format berkas gambar tidak valid atau korup.'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale hanya jika lebih besar dari batas maksimal
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser tidak mendukung canvas rendering.'));
          return;
        }

        // Background putih untuk JPEG jika ada transparansi PNG
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(format, quality);

        // Hitung estimasi ukuran bytes dari Base64
        const head = dataUrl.indexOf(',');
        const base64Len = head >= 0 ? dataUrl.length - head - 1 : dataUrl.length;
        const sizeBytes = Math.round((base64Len * 3) / 4);

        // Generate slug rekomendasi
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const cleanSlug = slugify(nameWithoutExt) || 'banner';
        const suggestedSlug = `${cleanSlug}-${Date.now().toString(36)}`;

        resolve({
          dataUrl,
          sizeBytes,
          width,
          height,
          mimeType: format,
          filename: file.name,
          suggestedSlug,
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/** Format byte size ke format terbaca (KB / MB) */
export const formatBytes = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
