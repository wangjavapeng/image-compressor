'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ComparisonSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export default function ComparisonSlider({ beforeSrc, afterSrc }: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [fullWidth, setFullWidth] = useState(800);
  const dragging = useRef(false);
  const afterImgRef = useRef<HTMLImageElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let pos = ((clientX - rect.left) / rect.width) * 100;
    pos = Math.max(5, Math.min(95, pos));
    setPosition(pos);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current) updatePosition(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (dragging.current) updatePosition(e.touches[0].clientX);
    };
    const handleMouseUp = () => { dragging.current = false; };
    const handleTouchEnd = () => { dragging.current = false; };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (afterImgRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setFullWidth(entry.contentRect.width);
        }
      });
      observer.observe(afterImgRef.current);
      return () => observer.disconnect();
    }
  }, [afterSrc]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden cursor-col-resize select-none bg-[repeating-conic-gradient(#27272a_0%_25%,#18181b_0%_50%)] bg-[length:20px_20px]"
      onMouseDown={(e) => {
        dragging.current = true;
        updatePosition(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        updatePosition(e.touches[0].clientX);
      }}
    >
      {/* After image (full width, underneath) */}
      <img
        ref={afterImgRef}
        src={afterSrc}
        alt="压缩后"
        className="block w-full h-auto max-h-[400px] object-contain"
        draggable={false}
      />

      {/* Before image (clipped) */}
      <div
        className="absolute top-0 left-0 h-full overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt="原始"
          className="absolute top-0 left-0 h-auto object-contain"
          style={{ width: `${fullWidth}px`, maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 h-full w-[3px] bg-white -translate-x-1/2 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.5)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full flex items-center justify-center text-sm font-bold text-zinc-900 tracking-wider shadow-lg">
          ⟨⟩
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-semibold z-10">
        原始
      </span>
      <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-semibold z-10">
        压缩后
      </span>
    </div>
  );
}
