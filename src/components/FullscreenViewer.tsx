import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Share2, RotateCw, Maximize, Minimize } from 'lucide-react';
import type { NoteAttachment } from '../types';
import { openFileAttachment } from '../lib/openFile';

interface Props {
  attachment: NoteAttachment;
  onClose: () => void;
}

export default function FullscreenViewer({ attachment, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = attachment.kind === 'image';
  const isVideo = attachment.kind === 'video';
  const isFile = attachment.kind === 'file';

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.25, 6)), []);
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z / 1.25, 0.25);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomIn, zoomOut, reset]);

  // pinch-to-zoom for touch
  const pinchDist = useRef(0);
  const pinchZoom = useRef(1);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
      pinchZoom.current = zoom;
    } else if (e.touches.length === 1 && zoom > 1) {
      dragging.current = true;
      last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = Math.max(0.25, Math.min(6, (dist / pinchDist.current) * pinchZoom.current));
      setZoom(scale);
    } else if (e.touches.length === 1 && dragging.current) {
      const dx = e.touches[0].clientX - last.current.x;
      const dy = e.touches[0].clientY - last.current.y;
      last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40">
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          title="Close"
        >
          <X size={22} />
        </button>
        <div className="flex-1 mx-3 min-w-0">
          <p className="text-white text-sm font-medium truncate">{attachment.name}</p>
          <p className="text-white/50 text-xs">
            {Math.round(zoom * 100)}%{isFile && ' · Document'}
            {isImage && ' · Image'}
            {isVideo && ' · Video'}
          </p>
        </div>
        <button
          onClick={() => openFileAttachment(attachment.name, attachment.dataUrl)}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition flex items-center gap-2"
          title="Open in another app"
        >
          <Share2 size={20} />
          <span className="text-sm hidden sm:inline">Open with</span>
        </button>
      </div>

      {/* Content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center relative touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        {isImage && (
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            className="max-w-full max-h-full object-contain transition-transform duration-75"
            style={{ transform }}
            draggable={false}
          />
        )}

        {isVideo && (
          <video
            src={attachment.dataUrl}
            className="max-w-full max-h-full"
            controls
            autoPlay
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        )}

        {isFile && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {/* For files that browsers can preview (PDF, text, images, video, audio), embed in iframe */}
            {attachment.mime.startsWith('application/pdf') ||
            attachment.mime.startsWith('text/') ||
            attachment.mime.startsWith('image/') ||
            attachment.mime.startsWith('video/') ||
            attachment.mime.startsWith('audio/') ? (
              <iframe
                src={attachment.dataUrl}
                title={attachment.name}
                className="w-full h-full rounded-xl border-0 bg-white"
                style={{ transform, transformOrigin: 'center center' }}
              />
            ) : (
              /* For formats the browser can't render (docx, xlsx, zip, etc.), show a card with open button */
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold uppercase">
                    {attachment.name.split('.').pop()?.slice(0, 4) || 'FILE'}
                  </span>
                </div>
                <div>
                  <p className="text-white text-lg font-medium">{attachment.name}</p>
                  <p className="text-white/50 text-sm mt-1">
                    This file type can't be previewed in-app.
                  </p>
                </div>
                <button
                  onClick={() => openFileAttachment(attachment.name, attachment.dataUrl)}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition flex items-center gap-2"
                >
                  <Share2 size={20} />
                  Open with… (choose app)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-black/40">
        <button
          onClick={zoomOut}
          className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-30"
          disabled={zoom <= 0.25}
          title="Zoom out"
        >
          <ZoomOut size={22} />
        </button>

        <button
          onClick={() => setZoom(1)}
          className="px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition text-sm font-medium min-w-[72px]"
          title="Reset"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={zoomIn}
          className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-30"
          disabled={zoom >= 6}
          title="Zoom in"
        >
          <ZoomIn size={22} />
        </button>

        <div className="w-px h-8 bg-white/20 mx-1" />

        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          title="Rotate"
        >
          <RotateCw size={22} />
        </button>

        <button
          onClick={reset}
          className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          title="Fit to screen"
        >
          {zoom === 1 ? <Maximize size={22} /> : <Minimize size={22} />}
        </button>
      </div>
    </div>
  );
}
