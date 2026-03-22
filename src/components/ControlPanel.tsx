'use client';

import { useState } from 'react';
import { CompressOptions } from '@/lib/compressor';

interface ControlPanelProps {
  options: CompressOptions;
  onOptionsChange: (options: CompressOptions) => void;
  firstImageAspect?: number | null;
}

export default function ControlPanel({ options, onOptionsChange, firstImageAspect }: ControlPanelProps) {
  const [aspectLocked, setAspectLocked] = useState(true);

  const handleWidthChange = (w: number | '') => {
    const width = w === '' ? null : w;
    let height = options.height;
    if (aspectLocked && width && firstImageAspect) {
      height = Math.round(width / firstImageAspect);
    }
    onOptionsChange({ ...options, width, height });
  };

  const handleHeightChange = (h: number | '') => {
    const height = h === '' ? null : h;
    let width = options.width;
    if (aspectLocked && height && firstImageAspect) {
      width = Math.round(height * firstImageAspect);
    }
    onOptionsChange({ ...options, width, height });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
      {/* Format */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          输出格式
        </label>
        <select
          value={options.format}
          onChange={(e) => onOptionsChange({ ...options, format: e.target.value as CompressOptions['format'] })}
          className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="image/webp">WebP（推荐）</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
        </select>
      </div>

      {/* Quality */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          压缩质量
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => onOptionsChange({ ...options, quality: parseInt(e.target.value) })}
            className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(99,102,241,0.4)]
              [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
          />
          <span className="text-sm font-semibold text-indigo-400 min-w-[36px] text-right">
            {options.quality}%
          </span>
        </div>
      </div>

      {/* Resize */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          调整尺寸（可选）
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="宽"
            min={1}
            value={options.width ?? ''}
            onChange={(e) => handleWidthChange(e.target.value ? parseInt(e.target.value) : '')}
            className="w-20 px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={() => setAspectLocked(!aspectLocked)}
            className={`text-lg transition-colors ${aspectLocked ? 'text-indigo-500' : 'text-zinc-500'}`}
            title={aspectLocked ? '锁定宽高比' : '解锁宽高比'}
          >
            {aspectLocked ? '🔗' : '🔓'}
          </button>
          <input
            type="number"
            placeholder="高"
            min={1}
            value={options.height ?? ''}
            onChange={(e) => handleHeightChange(e.target.value ? parseInt(e.target.value) : '')}
            className="w-20 px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
