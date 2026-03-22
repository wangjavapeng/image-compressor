'use client';

import { useState, useCallback, useRef, useEffect, DragEvent, ChangeEvent } from 'react';

interface UploadAreaProps {
  onFiles: (files: FileList | File[]) => void;
}

export default function UploadArea({ onFiles }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    },
    [onFiles]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFiles(files);
        e.target.value = '';
      }
    },
    [onFiles]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onFiles(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onFiles]);

  return (
    <>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01] shadow-[0_0_0_4px_rgba(99,102,241,0.3)]'
            : 'border-zinc-700 bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]'
        }`}
      >
        <span className="text-5xl block mb-4">📁</span>
        <div className="text-lg font-semibold mb-2">拖拽图片到这里，或点击上传</div>
        <div className="text-sm text-zinc-500">
          支持 JPEG、PNG、WebP、GIF、BMP 格式 · 也可直接 Ctrl+V 粘贴
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 0, height: 0 }}
        tabIndex={-1}
      />
    </>
  );
}
