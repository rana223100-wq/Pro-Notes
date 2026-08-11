import { NotebookPen } from 'lucide-react';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
      }}
    >
      <NotebookPen size={size * 0.55} color="#fff" strokeWidth={2.4} />
    </div>
  );
}

export function LogoWordmark({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="text-main font-bold tracking-tight" style={{ fontSize: size * 0.5 }}>
        Pro Notes
      </span>
    </div>
  );
}
