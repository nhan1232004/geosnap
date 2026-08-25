// Image optimization utilities for Firebase Storage & CDN

export type ImageSize = 'small' | 'medium' | 'large' | 'original';

interface ImageSizeMap {
  [key: string]: number;
}

const SIZE_MAP: ImageSizeMap = {
  small: 300,
  medium: 600,
  large: 1200,
};

const QUALITY = 80;

/**
 * Get optimized image URL with query parameters
 * Works with Firebase Storage or any CDN that supports width/quality params
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  size: ImageSize = 'medium'
): string {
  if (!originalUrl) return '';
  if (size === 'original') return originalUrl;

  const width = SIZE_MAP[size];
  
  // For Firebase Storage URLs, we can add transformation params
  if (originalUrl.includes('firebasestorage.googleapis.com')) {
    // Firebase Storage doesn't support built-in transforms
    // Return original URL and let client resize with CSS or use Imgix
    return originalUrl;
  }

  // For CDNs that support transformation parameters
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}w=${width}&q=${QUALITY}&auto=format`;
}

/**
 * Generate srcSet string for responsive images
 */
export function generateSrcSet(url: string): string {
  return [
    `${getOptimizedImageUrl(url, 'small')} 300w`,
    `${getOptimizedImageUrl(url, 'medium')} 600w`,
    `${getOptimizedImageUrl(url, 'large')} 1200w`,
  ].join(', ');
}

/**
 * Calculate aspect ratio for image placeholder
 */
export function getImagePlaceholder(
  width: number = 600,
  height: number = 400
): { paddingBottom: string } {
  const aspectRatio = (height / width) * 100;
  return {
    paddingBottom: `${aspectRatio}%`,
  };
}

/**
 * Get responsive image styles
 */
export function getResponsiveImageStyles(url: string) {
  return {
    backgroundImage: `url(${getOptimizedImageUrl(url, 'small')})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * Preload image for better performance
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = getOptimizedImageUrl(url, 'medium');
  });
}

/**
 * Get blur hash placeholder (simple gradient for now)
 */
export function getBlurhashPlaceholder(color: string = '#e5e7eb'): string {
  return color;
}

/**
 * Format bytes to human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Compress image before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}