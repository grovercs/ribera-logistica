/**
 * Cloudinary image upload utilities
 * Uses unsigned uploads for secure client-side uploads
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz5bkdxb1';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'logistica_uploads';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Uploads an image to Cloudinary using unsigned upload
 * @param file - The image file to upload
 * @param folder - Folder name (e.g., 'logistica/visitas', 'logistica/facturas')
 * @param filename - Optional custom filename (without extension)
 * @returns Promise with upload result including URL
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder: string = 'general',
  filename?: string
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // Custom filename for easier identification
  if (filename) {
    formData.append('public_id', filename);
  }

  // Auto-tagging
  formData.append('tags', 'logistica-app');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Error uploading to Cloudinary');
  }

  return response.json();
}

/**
 * Gets optimized URL for display
 * @param url - Original Cloudinary URL
 * @param width - Desired width (auto-optimized)
 * @returns Optimized URL string
 */
export function getOptimizedUrl(url: string, width: number = 800): string {
  if (!url.includes('cloudinary.com')) return url;

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/w_${width},q_auto,f_auto/${parts[1]}`;
}