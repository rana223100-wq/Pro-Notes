import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PasswordSheet } from '@/components/PasswordSheet';
import type { Note } from '@/types';

/** Wraps the editor: if a note is `locked`, require its password before showing the editor. */
export function LockedNoteGuard({
  note,
  onUnlocked,
  onBack,
  children,
}: {
  note: Note;
  onUnlocked: () => void;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const [ask, setAsk] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  if (!note.locked || unlocked) return <>{children}</>;

  return (
    <>
      <div className="flex flex-col h-full items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="flex items-center justify-center rounded-full mb-4"
          style={{ width: 72, height: 72, background: 'var(--accent-soft)' }}
        >
          <Lock size={32} style={{ color: 'var(--accent)' }} />
        </div>
        <p className="text-main font-semibold text-lg">This note is protected</p>
        <p className="text-muted text-sm mt-1">Enter the password to open it.</p>
        <button
          onClick={() => setAsk(true)}
          className="mt-5 px-6 py-2.5 rounded-xl text-white font-medium"
          style={{ background: 'var(--accent)' }}
        >
          Enter password
        </button>
        <button onClick={onBack} className="mt-3 text-muted text-sm">Back</button>
      </div>

      <PasswordSheet
        open={ask}
        mode="enter"
        expectedPassword={note.lockPassword}
        onClose={() => {
          setAsk(false);
          onBack();
        }}
        onSuccess={() => {
          setAsk(false);
          setUnlocked(true);
          onUnlocked();
        }}
      />
    </>
  );
}
