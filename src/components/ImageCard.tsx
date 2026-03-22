'use client';

import { ImageItem, formatSize } from '@/lib/compressor';
import { getExtension } from '@/lib/compressor';
import ComparisonSlider from './ComparisonSlider';

interface ImageCardProps {
  image: ImageItem;
  format: string;
  onRemove: (id: number) => void;
  onDownload: (image: ImageItem, format: string) => void;
}

export default function ImageCard({ image, format, onRemove, onDownload }: ImageCardProps) {
  const savings =
    image.compressedSize > 0
      ? ((1 - image.compressedSize / image.originalSize) * 100).toFixed(1)
      : null;

  const savingsColor =
    savings === null
      ? 'text-zinc-400'
      : parseFloat(savings) > 50
        ? 'text-green-400'
        : parseFloat(savings) > 20
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden animate-[slideUp_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <span>🖼️</span>
          <span className="truncate max-w-[200px]">{image.name}</span>
          {savings && (
            <span className="text-zinc-500 font-normal text-xs">
              {formatSize(image.originalSize)} → {formatSize(image.compressedSize)} (-{savings}%)
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onDownload(image, format)}
            disabled={!image.compressedBlob}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="下载"
          >
            💾
          </button>
          <button
            onClick={() => onRemove(image.id)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Comparison */}
      {image.compressedUrl ? (
        <ComparisonSlider beforeSrc={image.originalUrl} afterSrc={image.compressedUrl} />
      ) : (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">压缩中...</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 border-t border-zinc-800">
        <div className="px-4 py-3.5 text-center">
          <div className="text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1">原始大小</div>
          <div className="text-sm font-bold">{formatSize(image.originalSize)}</div>
        </div>
        <div className="px-4 py-3.5 text-center">
          <div className="text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1">压缩后</div>
          <div className="text-sm font-bold">
            {image.compressedSize > 0 ? formatSize(image.compressedSize) : '处理中...'}
          </div>
        </div>
        <div className="px-4 py-3.5 text-center">
          <div className="text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1">节省</div>
          <div className={`text-sm font-bold ${savingsColor}`}>
            {savings ? savings + '%' : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
