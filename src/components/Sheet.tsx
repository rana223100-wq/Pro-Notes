import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  side?: 'bottom' | 'right' | 'center';
}

export function Sheet({ open, onClose, children, title, side = 'bottom' }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panelCls =
    side === 'bottom'
      ? 'animate-sheet-up w-full rounded-t-2xl'
      : side === 'right'
        ? 'animate-slide-in-right h-full w-full max-w-md ml-auto'
        : 'animate-pop-in w-full max-w-sm';

  return (
    <div
      className="fixed inset-0 z-50 flex animate-sheet-fade"
      style={{
        alignItems: side === 'bottom' ? 'flex-end' : side === 'right' ? 'stretch' : 'center',
        justifyContent: side === 'right' ? 'flex-end' : 'center',
      }}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        style={{ backdropFilter: 'blur(2px)' }}
      />
      <div
        className={`surface relative shadow-2xl ${panelCls}`}
        style={{ background: 'var(--bg-elevated)', maxHeight: side === 'bottom' ? '80vh' : '90vh' }}
      >
        {title && (
          <div
            className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
          >
            <h3 className="text-base font-semibold text-main">{title}</h3>
            <button onClick={onClose} className="text-muted hover:text-main text-xl leading-none px-2">
              ×
            </button>
          </div>
        )}
        <div className="overflow-y-auto" style={{ maxHeight: side === 'bottom' ? '75vh' : '85vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
export function Confirm({
  open,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-sheet-fade">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        className="surface relative w-full max-w-xs mx-4 rounded-2xl p-5 shadow-2xl animate-pop-in"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <p className="text-center text-main text-[15px] mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl px-4 py-2.5 font-medium surface-soft text-main border border-app"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl px-4 py-2.5 font-medium text-white"
            style={{ background: 'var(--danger)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
