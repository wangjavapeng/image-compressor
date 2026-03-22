'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ImageItem, CompressOptions, compressImage } from '@/lib/compressor';

let idCounter = 0;

export function useImageCompressor() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [options, setOptions] = useState<CompressOptions>({
    format: 'image/webp',
    quality: 80,
    width: null,
    height: null,
  });
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newImages: ImageItem[] = [];
      const files = Array.from(fileList);

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const id = idCounter++;
        const url = URL.createObjectURL(file);
        const img: ImageItem = {
          id,
          file,
          name: file.name.replace(/\.[^.]+$/, ''),
          originalSize: file.size,
          originalUrl: url,
          compressedUrl: null,
          compressedBlob: null,
          compressedSize: 0,
          originalWidth: 0,
          originalHeight: 0,
          processing: true,
        };

        // Load dimensions
        const tempImg = new Image();
        tempImg.onload = () => {
          setImages((prev) =>
            prev.map((i) =>
              i.id === img.id
                ? { ...i, originalWidth: tempImg.naturalWidth, originalHeight: tempImg.naturalHeight }
                : i
            )
          );
          // Trigger compress after dimensions are loaded
          compressImage(img, options, ({ blob, url: cUrl, size }) => {
            setImages((prev) =>
              prev.map((i) =>
                i.id === img.id
                  ? { ...i, compressedBlob: blob, compressedUrl: cUrl, compressedSize: size, processing: false }
                  : i
              )
            );
          });
        };
        tempImg.src = url;

        newImages.push(img);
      }

      setImages((prev) => [...prev, ...newImages]);
    },
    [options]
  );

  const recompressAll = useCallback(
    (newOptions: CompressOptions) => {
      setOptions(newOptions);
      setImages((prev) => prev.map((img) => ({ ...img, processing: true })));

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setImages((prev) => {
          prev.forEach((img) => {
            compressImage(img, newOptions, ({ blob, url, size }) => {
              setImages((p) =>
                p.map((i) =>
                  i.id === img.id
                    ? { ...i, compressedBlob: blob, compressedUrl: url, compressedSize: size, processing: false }
                    : i
                )
              );
            });
          });
          return prev;
        });
      }, 300);
    },
    []
  );

  const removeImage = useCallback((id: number) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.originalUrl);
        if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages((prev) => {
      prev.forEach((img) => {
        URL.revokeObjectURL(img.originalUrl);
        if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
      });
      return [];
    });
  }, []);

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        URL.revokeObjectURL(img.originalUrl);
        if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOriginal = images.reduce((s, i) => s + i.originalSize, 0);
  const totalCompressed = images.reduce((s, i) => s + i.compressedSize, 0);
  const processedCount = images.filter((i) => i.compressedSize > 0).length;

  return {
    images,
    options,
    addFiles,
    recompressAll,
    removeImage,
    clearAll,
    totalOriginal,
    totalCompressed,
    processedCount,
  };
}
