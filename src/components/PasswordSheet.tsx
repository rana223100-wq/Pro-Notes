import { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Sheet } from '@/components/Sheet';

interface PasswordSheetProps {
  open: boolean;
  mode: 'set' | 'enter' | 'remove';
  onClose: () => void;
  onSuccess: (password: string) => void;
  expectedPassword?: string; // for enter/remove mode
}

export function PasswordSheet({
  open,
  mode,
  onClose,
  onSuccess,
  expectedPassword,
}: PasswordSheetProps) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPw('');
      setConfirm('');
      setShow(false);
      setError('');
    }
  }, [open]);

  const title =
    mode === 'set' ? 'Set Password' : mode === 'remove' ? 'Enter Password to Remove Lock' : 'Enter Password';

  const submit = () => {
    if (!pw) {
      setError('Please enter a password.');
      return;
    }
    if (mode === 'set') {
      if (pw.length < 1) {
        setError('Password cannot be empty.');
        return;
      }
      if (pw !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      onSuccess(pw);
    } else {
      if (pw !== expectedPassword) {
        setError('Incorrect password.');
        return;
      }
      onSuccess(pw);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} side="center">
      <div className="p-5">
        <div className="flex justify-center mb-5">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, background: 'var(--accent-soft)' }}
          >
            <Lock size={26} style={{ color: 'var(--accent)' }} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              autoFocus
              onChange={(e) => {
                setPw(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Password"
              className="w-full rounded-xl px-4 py-3 pr-11 text-main outline-none border border-app surface-soft"
            />
            <button
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === 'set' && (
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Confirm password"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft"
            />
          )}

          {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

          <button
            onClick={submit}
            className="w-full rounded-xl py-3 font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {mode === 'set' ? 'OK' : 'Unlock'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
