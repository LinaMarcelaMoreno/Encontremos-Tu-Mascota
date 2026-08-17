import { analyzeSubjectColors, ColorAnalysisResult } from './colorAnalysis';

export interface CompressionResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  colorAnalysis: ColorAnalysisResult;
}

/**
 * Compresses an image file using browser Canvas API and modern asynchronous decoding.
 * Uses createImageBitmap (with EXIF auto-orientation) or HTMLImageElement.decode()
 * to prevent blank/white canvas race conditions on initial file selection.
 * Resizes to max 800px width/height and compresses to JPEG quality 0.8.
 */
export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.8
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  let imageSource: ImageBitmap | HTMLImageElement | null = null;
  let srcWidth = 0;
  let srcHeight = 0;
  let cleanup: (() => void) | null = null;

  try {
    // 1. Try modern createImageBitmap with auto-orientation (handles EXIF metadata from mobile phones)
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        imageSource = bitmap;
        srcWidth = bitmap.width;
        srcHeight = bitmap.height;
        cleanup = () => {
          try {
            bitmap.close();
          } catch {
            // ignore
          }
        };
      } catch (bitmapError) {
        console.warn('createImageBitmap fallback to HTMLImageElement:', bitmapError);
        imageSource = null;
      }
    }

    // 2. Fallback to HTMLImageElement with explicit await img.decode()
    if (!imageSource) {
      const img = await loadImageElementWithDecode(file);
      imageSource = img.element;
      srcWidth = img.width;
      srcHeight = img.height;
      cleanup = img.cleanup;
    }

    if (!srcWidth || !srcHeight || srcWidth <= 0 || srcHeight <= 0) {
      throw new Error('No se pudieron obtener las dimensiones de la imagen.');
    }

    // Calculate proportional dimensions
    let targetWidth = srcWidth;
    let targetHeight = srcHeight;

    if (targetWidth > targetHeight && targetWidth > maxDimension) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else if (targetHeight > maxDimension) {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }

    // Prepare canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('No se pudo inicializar el procesador gráfico (Canvas 2D).');
    }

    // Fill white background for transparent formats before JPEG conversion
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Draw the fully decoded image onto canvas
    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    // Perform central animal chromatic analysis
    const colorAnalysis = analyzeSubjectColors(canvas, ctx);

    // Export as high quality compressed JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const compressedSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

    return {
      dataUrl,
      originalSizeKb,
      compressedSizeKb,
      colorAnalysis
    };
  } finally {
    if (cleanup) {
      cleanup();
    }
  }
}

/**
 * Loads an image from a File via ObjectURL and ensures full raster decoding before returning.
 */
function loadImageElementWithDecode(
  file: File
): Promise<{ element: HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    };

    img.onload = async () => {
      try {
        if ('decode' in img && typeof img.decode === 'function') {
          await img.decode();
        }
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        resolve({ element: img, width, height, cleanup });
      } catch (err) {
        console.warn('img.decode() warning, using standard loaded image:', err);
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        resolve({ element: img, width, height, cleanup });
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Error al decodificar la imagen seleccionada.'));
    };

    img.src = objectUrl;
  });
}

