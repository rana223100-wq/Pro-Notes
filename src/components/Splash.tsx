import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1600);
    const t2 = setTimeout(onDone, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${
        leaving ? 'animate-fade-out' : ''
      }`}
      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #3b82f6 100%)' }}
    >
      <div className="animate-splash-logo flex flex-col items-center gap-5">
        <div
          className="flex items-center justify-center rounded-[28px]"
          style={{
            width: 96,
            height: 96,
            background: 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <Logo size={60} />
        </div>
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold tracking-tight">Pro Notes</h1>
          <p className="text-white/70 text-sm mt-1 tracking-wide">Your thoughts, organized.</p>
        </div>
      </div>
      <div
        className="absolute bottom-12 flex gap-1.5"
        style={{ animation: 'sheetFade 0.6s ease 0.3s both' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full bg-white/80"
            style={{ animation: `spin 1s ${i * 0.15}s infinite ease-in-out` }}
          />
        ))}
      </div>
    </div>
  );
}
