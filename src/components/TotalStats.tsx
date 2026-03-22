'use client';

import { formatSize } from '@/lib/compressor';

interface TotalStatsProps {
  count: number;
  totalOriginal: number;
  totalCompressed: number;
  processedCount: number;
}

export default function TotalStats({ count, totalOriginal, totalCompressed, processedCount }: TotalStatsProps) {
  const allDone = processedCount === count && count > 0;
  const savedPercent =
    totalOriginal > 0 && totalCompressed > 0
      ? ((1 - totalCompressed / totalOriginal) * 100).toFixed(1)
      : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm">
      <div className="flex gap-6 sm:gap-8">
        <div className="flex flex-col items-center">
          <span className="text-xs text-zinc-500 mb-0.5">图片数量</span>
          <span className="font-bold">{count}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-zinc-500 mb-0.5">原始总大小</span>
          <span className="font-bold">{formatSize(totalOriginal)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-zinc-500 mb-0.5">压缩后总大小</span>
          <span className="font-bold">{allDone ? formatSize(totalCompressed) : '处理中...'}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-zinc-500 mb-0.5">总共节省</span>
          <span className="font-bold text-green-400">{savedPercent ? savedPercent + '%' : '—'}</span>
        </div>
      </div>
    </div>
  );
}
