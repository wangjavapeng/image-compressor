'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ImageItem, CompressOptions, compressImage } from '@/lib/compressor';

let idCounter = 0;

interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export function useImageCompressor() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [options, setOptions] = useState<CompressOptions>({
    format: 'image/webp',
    quality: 80,
    width: null,
    height: null,
  });
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // User state
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  // Get or create anonymous device ID from localStorage
  const getDeviceId = useCallback(() => {
    const STORAGE_KEY = 'img_comp_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
      deviceId = 'anon_' + crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
  }, []);

  // Fetch user info on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          // Fetch points balance
          fetch('/api/points/balance')
            .then((r) => r.json())
            .then((d) => {
              setBalance(d.balance ?? 0);
              if (d.isUnlimited) setIsUnlimited(true);
            })
            .catch(() => {});
        } else {
          // Not logged in: fetch anonymous remaining count
          const deviceId = getDeviceId();
          fetch(`/api/points/anonymous-use?deviceId=${encodeURIComponent(deviceId)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.success) setAnonymousRemaining(d.remaining);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [getDeviceId]);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;

      setPointsError(null);

      const imageCount = files.length;

      if (!user) {
        // Free mode: check server-side anonymous usage
        const deviceId = getDeviceId();
        try {
          const res = await fetch('/api/points/anonymous-use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, count: imageCount }),
          });
          const data = await res.json();

          if (!data.success) {
            if (data.message === 'free_limit') {
              setPointsError('free_limit');
            } else {
              setPointsError('network_error');
            }
            return;
          }

          setAnonymousRemaining(data.remaining);
        } catch {
          setPointsError('network_error');
          return;
        }
      } else {
        // Logged in: deduct points
        try {
          const res = await fetch('/api/points/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: imageCount }),
          });
          const data = await res.json();

          if (!data.success) {
            setPointsError(data.message || 'insufficient_points');
            return;
          }

          setBalance(data.remainingBalance);
        } catch {
          setPointsError('network_error');
          return;
        }
      }

      // Proceed with compression
      const newImages: ImageItem[] = [];

      for (const file of files) {
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

        const tempImg = new Image();
        tempImg.onload = () => {
          setImages((prev) =>
            prev.map((i) =>
              i.id === img.id
                ? { ...i, originalWidth: tempImg.naturalWidth, originalHeight: tempImg.naturalHeight }
                : i
            )
          );
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

      // Log compression for logged-in users
      if (user && newImages.length > 0) {
        const totalOriginal = newImages.reduce((s, i) => s + i.originalSize, 0);
        fetch('/api/compression/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileCount: newImages.length,
            totalOriginalSize: totalOriginal,
            totalCompressedSize: 0,
            pointsCost: newImages.length,
          }),
        }).catch(() => {});
      }
    },
    [options, user]
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
    user,
    balance,
    isUnlimited,
    pointsError,
    addFiles,
    recompressAll,
    removeImage,
    clearAll,
    totalOriginal,
    totalCompressed,
    processedCount,
    clearPointsError: () => setPointsError(null),
  };
}
