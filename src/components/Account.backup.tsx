import { useState } from 'react';
import { ArrowLeft, User, Mail, LogOut, Globe } from 'lucide-react';
import { useNotes } from '@/store/NotesContext';
import { initials } from '@/lib/notes';
import type { UserProfile } from '@/types';

interface AccountProps {
  onBack: () => void;
}

export function Account({ onBack }: AccountProps) {
  const { profile, setProfile, totalNotes } = useNotes();
  const [view, setView] = useState<'menu' | 'guest' | 'signup' | 'signin' | 'emailSignup' | 'emailSignin' | 'googlePick' | 'codeVerify' | 'profile'>(
    profile ? 'profile' : 'menu',
  );

  // guest
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');

  // email
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  // fake google accounts
  const googleAccounts = [
    { name: 'Adeel Khan', email: 'adeel.khan@gmail.com' },
    { name: 'Sara Ahmed', email: 'sara.ahmed@gmail.com' },
    { name: 'Work Profile', email: 'work.profile@gmail.com' },
  ];

  const startGuest = () => {
    setProfile({ mode: 'guest', firstName: first, lastName: last });
    setView('profile');
  };

  const startEmailSignup = () => {
    setPendingEmail(email);
    setView('codeVerify');
  };

  const finishEmailAccount = () => {
    const [f, ...rest] = email.split('@')[0].split(/[._-]/);
    setProfile({
      mode: 'account',
      firstName: f || 'User',
      lastName: rest[0] || '',
      email: pendingEmail,
    });
    setView('profile');
  };

  const finishGoogle = (name: string, email: string) => {
    const [f, ...rest] = name.split(' ');
    setProfile({ mode: 'account', firstName: f, lastName: rest[0] || '', email });
    setView('profile');
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-app"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-black/5 text-main">
          <ArrowLeft size={20} />
        </button>
        <span className="text-main font-bold text-lg">Account</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'menu' && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-3">
            <User size={40} className="text-muted mb-2" />
            <OptionCard icon={<User size={20} />} title="Use as guest" onClick={() => setView('guest')} />
            <OptionCard icon={<Mail size={20} />} title="Sign up" onClick={() => setView('signup')} />
            <OptionCard icon={<Mail size={20} />} title="Sign in" onClick={() => setView('signin')} />
          </div>
        )}

        {view === 'guest' && (
          <FormCard
            title="Continue as guest"
            onBack={() => setView('menu')}
          >
            <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft" />
            <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft" />
            <button
              onClick={startGuest}
              disabled={!first.trim() && !last.trim()}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              Continue
            </button>
          </FormCard>
        )}

        {view === 'signup' && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-3">
            <h2 className="text-main font-bold text-xl mb-2">Create account</h2>
            <OptionCard icon={<Globe size={20} />} title="Sign up with Google" onClick={() => setView('googlePick')} />
            <OptionCard icon={<Mail size={20} />} title="Sign up with email" onClick={() => setView('emailSignup')} />
            <button onClick={() => setView('menu')} className="text-muted text-sm mt-2">Back</button>
          </div>
        )}

        {view === 'signin' && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-3">
            <h2 className="text-main font-bold text-xl mb-2">Welcome back</h2>
            <OptionCard icon={<Globe size={20} />} title="Sign in with Google" onClick={() => setView('googlePick')} />
            <OptionCard icon={<Mail size={20} />} title="Sign in with email" onClick={() => setView('emailSignin')} />
            <button onClick={() => setView('menu')} className="text-muted text-sm mt-2">Back</button>
          </div>
        )}

        {view === 'googlePick' && (
          <div className="p-4">
            <h2 className="text-main font-bold text-lg mb-3">Choose an account</h2>
            <div className="space-y-2">
              {googleAccounts.map((g) => (
                <button
                  key={g.email}
                  onClick={() => finishGoogle(g.name, g.email)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl surface border border-app hover:shadow-md"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold"
                    style={{ background: 'var(--accent)' }}>
                    {initials(g.name.split(' ')[0], g.name.split(' ')[1] || '')}
                  </div>
                  <div className="text-left">
                    <p className="text-main text-sm font-medium">{g.name}</p>
                    <p className="text-muted text-xs">{g.email}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setView(profile ? 'profile' : 'menu')} className="text-muted text-sm mt-4">Back</button>
          </div>
        )}

        {(view === 'emailSignup' || view === 'emailSignin') && (
          <FormCard
            title={view === 'emailSignup' ? 'Sign up with email' : 'Sign in with email'}
            onBack={() => setView(view === 'emailSignup' ? 'signup' : 'signin')}
          >
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" type="email"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft" />
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" type="password"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft" />
            <button
              onClick={startEmailSignup}
              disabled={!email.trim() || !pw.trim()}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              Continue
            </button>
            <p className="text-muted text-xs text-center">
              A verification code will be sent to your email.
            </p>
          </FormCard>
        )}

        {view === 'codeVerify' && (
          <FormCard
            title="Verify your email"
            onBack={() => setView('emailSignup')}
            subtitle={`We sent a code to ${pendingEmail}. Use 123456 for this demo.`}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              className="w-full rounded-xl px-4 py-3 text-main text-center tracking-[0.5em] outline-none border border-app surface-soft"
            />
            <button
              onClick={finishEmailAccount}
              disabled={code.length !== 6}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              Verify & continue
            </button>
          </FormCard>
        )}

        {view === 'profile' && profile && (
          <div className="flex flex-col items-center px-6 pt-10">
            <div className="flex items-center justify-center w-24 h-24 rounded-full text-white text-3xl font-bold mb-4"
              style={{ background: 'linear-gradient(135deg, #2563eb, #60a5fa)' }}>
              {initials(profile.firstName, profile.lastName)}
            </div>
            <h2 className="text-main font-bold text-xl">
              {profile.firstName} {profile.lastName}
            </h2>
            {profile.email && <p className="text-muted text-sm">{profile.email}</p>}
            <span className="mt-2 text-xs px-3 py-1 rounded-full surface-soft text-soft border border-app">
              {profile.mode === 'guest' ? 'Guest' : 'Account'}
            </span>

            <div className="surface rounded-2xl p-4 w-full max-w-sm mt-6 text-center">
              <p className="text-muted text-sm">Total notes</p>
              <p className="text-main text-3xl font-bold mt-1">{totalNotes()}</p>
            </div>

            <div className="flex gap-3 mt-6 w-full max-w-sm">
              {profile.mode === 'guest' ? (
                <button
                  onClick={() => setView('signup')}
                  className="flex-1 rounded-xl py-3 font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Sign up
                </button>
              ) : (
                <button
                  onClick={() => { setProfile(null); setView('menu'); }}
                  className="flex-1 rounded-xl py-3 font-semibold surface-soft text-main border border-app"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full max-w-sm p-4 rounded-2xl surface border border-app hover:shadow-lg transition"
    >
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <span className="text-main font-medium text-left flex-1">{title}</span>
    </button>
  );
}

function FormCard({
  title, subtitle, children, onBack,
}: { title: string; subtitle?: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onBack} className="text-muted text-sm">Back</button>
        </div>
        <h2 className="text-main font-bold text-xl">{title}</h2>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
