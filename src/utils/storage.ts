import { uploadFotoFile } from '../api/client';

/**
 * High-performance client-side image compression using HTML5 Canvas.
 * Compresses images down to ~40-90 KB without visible loss of detail,
 * perfectly optimized for storing in PostgreSQL/Supabase TEXT columns.
 */
export const compressImageToBase64 = (
  file: File,
  maxWidth: number = 1080,
  maxHeight: number = 1080,
  quality: number = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw and compress to JPEG format
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Upload foto ke database via API Builder (POST /kim3/foto-upload).
 * Alur: kompresi client (payload kecil, aman dari batas 10MB server) ->
 * upload multipart -> server validasi + kompresi ulang bila masih bisa
 * lebih kecil -> kembalikan data URI kanonis.
 * Fallback: bila server gagal, kembalikan hasil kompresi client agar
 * tidak ada foto yang hilang (disimpan langsung sebagai TEXT).
 */
export const processPhotoUpload = async (file: File): Promise<string> => {
  const fallback = () => compressImageToBase64(file, 1080, 1080, 0.75);

  try {
    const compressedDataUrl = await compressImageToBase64(file, 1080, 1080, 0.75);
    const blob = await (await fetch(compressedDataUrl)).blob();
    const baseName = (file.name || 'foto').replace(/\.[a-z0-9]+$/i, '') || 'foto';
    const uploadable = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    const uploaded = await uploadFotoFile(uploadable);
    return uploaded.dataUrl;
  } catch (e) {
    console.warn('Upload foto ke server gagal, fallback ke Base64 lokal:', e);
    return fallback();
  }
};
