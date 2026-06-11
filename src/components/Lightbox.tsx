import React, { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface LightboxPhoto {
  url: string;
  caption?: string;
  takenAt?: string;
  location?: string;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const prev = useCallback(() => {
    setIndex(i => (i - 1 + photos.length) % photos.length);
    setZoom(1);
    setLoaded(false);
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex(i => (i + 1) % photos.length);
    setZoom(1);
    setLoaded(false);
  }, [photos.length]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 3));
      else if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Touch swipe support
  let touchStartX = 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  };

  const photo = photos[index];

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `geosnap-${index + 1}.jpg`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0">
        <div className="flex items-center gap-3">
          {/* Counter */}
          <span className="text-white/60 text-sm font-medium">
            {index + 1} / {photos.length}
          </span>
          {photo.caption && (
            <span className="text-white/80 text-sm truncate max-w-[200px]">{photo.caption}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Thu nhỏ (-)">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button onClick={() => setZoom(1)}
            className="px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-mono"
            title="Đặt lại zoom">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Phóng to (+)">
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button onClick={handleDownload}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Tải ảnh">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Đóng (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev button */}
        {photos.length > 1 && (
          <button onClick={prev}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-110">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <div className="relative max-w-full max-h-full flex items-center justify-center"
          style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            key={photo.url}
            src={photo.url}
            alt={photo.caption || `Photo ${index + 1}`}
            onLoad={() => setLoaded(true)}
            className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
          />
        </div>

        {/* Next button */}
        {photos.length > 1 && (
          <button onClick={next}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-110">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom info + dot nav */}
      <div className="shrink-0 pb-6 pt-3 bg-gradient-to-t from-black/80 to-transparent">
        {/* Photo info */}
        {(photo.takenAt || photo.location) && (
          <div className="flex items-center justify-center gap-3 text-white/40 text-xs mb-3">
            {photo.location && <span>📍 {photo.location}</span>}
            {photo.takenAt && photo.location && <span>·</span>}
            {photo.takenAt && (
              <span>📅 {new Date(photo.takenAt).toLocaleDateString('vi-VN', { dateStyle: 'medium' })}</span>
            )}
          </div>
        )}

        {/* Dot indicators */}
        {photos.length > 1 && photos.length <= 20 && (
          <div className="flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setZoom(1); setLoaded(false); }}
                className={`rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-brand' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        )}
        {photos.length > 20 && (
          <div className="flex justify-center">
            <div className="flex gap-1">
              {[-2,-1,0,1,2].map(offset => {
                const i = index + offset;
                if (i < 0 || i >= photos.length) return <div key={offset} className="w-1.5 h-1.5" />;
                return (
                  <button key={offset} onClick={() => { setIndex(i); setZoom(1); setLoaded(false); }}
                    className={`rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-brand' : 'w-1.5 h-1.5 bg-white/30'}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook tiện ích để quản lý Lightbox state
export function useLightbox(photos: LightboxPhoto[]) {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const openAt = useCallback((index: number) => {
    setStartIndex(index);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const lightboxElement = open ? (
    <Lightbox photos={photos} initialIndex={startIndex} onClose={close} />
  ) : null;

  return { openAt, lightboxElement };
}
