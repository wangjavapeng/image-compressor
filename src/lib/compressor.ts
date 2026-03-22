export interface ImageItem {
  id: number;
  file: File;
  name: string;
  originalSize: number;
  originalUrl: string;
  compressedUrl: string | null;
  compressedBlob: Blob | null;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  processing: boolean;
}

export interface CompressOptions {
  format: 'image/webp' | 'image/jpeg' | 'image/png';
  quality: number;
  width: number | null;
  height: number | null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/webp': '.webp',
    'image/jpeg': '.jpg',
    'image/png': '.png',
  };
  return map[mime] || '.jpg';
}

export function compressImage(
  img: ImageItem,
  options: CompressOptions,
  onComplete: (result: { blob: Blob; url: string; size: number }) => void
) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const image = new Image();

  image.onload = () => {
    let w = image.naturalWidth;
    let h = image.naturalHeight;

    if (options.width && options.height) {
      w = options.width;
      h = options.height;
    } else if (options.width) {
      w = options.width;
      h = Math.round(options.width * (image.naturalHeight / image.naturalWidth));
    } else if (options.height) {
      h = options.height;
      w = Math.round(options.height * (image.naturalWidth / image.naturalHeight));
    }

    canvas.width = w;
    canvas.height = h;

    if (options.format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.drawImage(image, 0, 0, w, h);

    const quality = options.quality / 100;
    const format = options.format === 'image/png' ? 'image/png' : options.format;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onComplete({ blob, url, size: blob.size });
        }
      },
      format,
      quality
    );
  };

  image.src = img.originalUrl;
}
