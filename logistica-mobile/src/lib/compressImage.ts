/**
 * Compresses an image file using the Canvas API before uploading.
 * Resizes to max 1280px on longest side, outputs JPEG at 70% quality.
 * Typical result: 5MB phone photo → ~100-150KB
 */
export async function compressImage(file: File, maxPx = 1280, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if file is actually an image
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if larger than maxPx
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}

/**
 * Utility to check if compression is worthwhile
 * Returns original file if already small enough
 */
export async function smartCompress(
  file: File,
  maxSizeKB: number = 500,
  maxPx: number = 1280,
  quality: number = 0.7
): Promise<Blob> {
  // If file is already small, return as-is
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  return compressImage(file, maxPx, quality);
}
