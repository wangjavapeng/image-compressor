'use client';

import { useCallback } from 'react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useImageCompressor } from '@/hooks/useImageCompressor';
import { ImageItem, getExtension } from '@/lib/compressor';
import UploadArea from '@/components/UploadArea';
import ControlPanel from '@/components/ControlPanel';
import ImageCard from '@/components/ImageCard';
import TotalStats from '@/components/TotalStats';
import GoogleLogin from '@/components/GoogleLogin';

export default function Home() {
  const {
    images,
    options,
    user,
    balance,
    pointsError,
    addFiles,
    recompressAll,
    removeImage,
    clearAll,
    totalOriginal,
    totalCompressed,
    processedCount,
    clearPointsError,
  } = useImageCompressor();

  const firstImage =
    images.length > 0
      ? images.find((i) => i.originalWidth > 0) || images[0]
      : null;
  const firstImageAspect =
    firstImage && firstImage.originalWidth > 0
      ? firstImage.originalWidth / firstImage.originalHeight
      : null;

  const handleDownload = useCallback((image: ImageItem, format: string) => {
    if (!image.compressedBlob) return;
    saveAs(image.compressedBlob, image.name + getExtension(format));
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const zip = new JSZip();
    const ext = getExtension(options.format);
    for (const img of images) {
      if (img.compressedBlob) {
        zip.file(img.name + ext, img.compressedBlob);
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'compressed-images.zip');
  }, [images, options.format]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="relative text-center pt-12 pb-8 px-6 bg-gradient-to-b from-indigo-500/[0.07] to-transparent">
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {user && balance !== null && (
            <button
              onClick={() => window.location.href = '/profile'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:border-indigo-500/50 transition-all cursor-pointer"
            >
              <span>🔋</span>
              <span className="font-semibold text-indigo-400">{balance}</span>
              <span className="text-zinc-500">积分</span>
            </button>
          )}
          <GoogleLogin />
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
          🗜️ 图片压缩
        </h1>
        <p className="text-zinc-400">免费、快速、隐私安全 — 所有处理均在浏览器本地完成</p>
        <span className="inline-block mt-3 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full border border-green-500/20">
          🔒 你的图片不会被上传到任何服务器
        </span>
      </header>

      <div className="max-w-[960px] mx-auto px-6 pb-12">
        {/* Points Error Banner */}
        {pointsError === 'insufficient_points' && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <div className="text-sm font-semibold text-amber-400">积分不足</div>
                <div className="text-xs text-zinc-400 mt-0.5">充值积分后可继续压缩</div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/profile"
                className="px-4 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-400 transition-all"
              >
                去充值
              </a>
              <button
                onClick={clearPointsError}
                className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {pointsError === 'free_limit' && (
          <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">👋</span>
              <div>
                <div className="text-sm font-semibold text-indigo-400">免费体验次数已用完</div>
                <div className="text-xs text-zinc-400 mt-0.5">登录后获得 30 积分，可压缩更多图片</div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/api/auth/google"
                className="px-4 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-400 transition-all"
              >
                立即登录
              </a>
              <button
                onClick={clearPointsError}
                className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* Login prompt for guests */}
        {!user && (
          <div className="mb-6 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">✨</span>
              <div>
                <div className="text-sm font-semibold text-indigo-300">登录获取更多权益</div>
                <div className="text-xs text-zinc-500 mt-0.5">登录即送 30 积分，每日签到 +2 积分，畅享无限制压缩</div>
              </div>
            </div>
            <a
              href="/api/auth/google"
              className="px-4 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-400 transition-all whitespace-nowrap"
            >
              免费登录
            </a>
          </div>
        )}

        {/* Upload */}
        <UploadArea onFiles={addFiles} />

        {/* Controls */}
        <div className="mt-6">
          <ControlPanel
            options={options}
            onOptionsChange={recompressAll}
            firstImageAspect={firstImageAspect}
          />
        </div>

        {/* Batch Actions */}
        {images.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-end">
            <button
              onClick={clearAll}
              className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
            >
              🗑️ 清空全部
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={processedCount === 0}
              className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(99,102,241,0.3)] cursor-pointer"
            >
              📦 下载全部 ZIP
            </button>
          </div>
        )}

        {/* Total Stats */}
        {images.length > 0 && (
          <div className="mt-6">
            <TotalStats
              count={images.length}
              totalOriginal={totalOriginal}
              totalCompressed={totalCompressed}
              processedCount={processedCount}
            />
          </div>
        )}

        {/* Image List */}
        <div className="flex flex-col gap-4 mt-6">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              format={options.format}
              onRemove={removeImage}
              onDownload={handleDownload}
            />
          ))}
        </div>

        {/* Empty State */}
        {images.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <div className="text-4xl mb-3">🌄</div>
            <div className="text-sm">上传图片开始压缩</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 px-6 text-zinc-600 text-xs border-t border-zinc-800/50">
        纯浏览器端图片压缩工具 · 你的隐私我们守护
      </footer>
    </main>
  );
}
