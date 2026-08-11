
import { useState } from 'react';
import { User, Mail, Globe } from 'lucide-react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { useNotes } from '@/store/NotesContext';
import { initials } from '@/lib/notes';

interface AccountProps {
  onBack: () => void;
}

export function Account({ onBack }: AccountProps) {
  const { profile, setProfile, totalNotes } = useNotes();

  const [view, setView] = useState<
    'menu' | 'guest' | 'signup' | 'signin' | 'emailSignup' | 'emailSignin' | 'verifyEmail' | 'profile'
  >(profile ? 'profile' : 'menu');

  // guest
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');

  // email
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const startGuest = () => {
    setProfile({
      mode: 'guest',
      firstName: first,
      lastName: last,
    });
    setView('profile');
  };

  // REAL EMAIL SIGN-UP
  const startEmailSignup = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !pw) {
      alert('Please enter your email and password.');
      return;
    }

    if (pw.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);

      const result =
        await FirebaseAuthentication.createUserWithEmailAndPassword({
          email: cleanEmail,
          password: pw,
        });

      const user = result.user;

      if (!user) {
        throw new Error('Account creation did not return a user.');
      }

      // Send REAL Firebase verification email
      await FirebaseAuthentication.sendEmailVerification();

      setPendingEmail(cleanEmail);
      setView('verifyEmail');
    } catch (error: any) {
      console.error('Email sign-up failed:', error);

      const message =
        error?.message || 'Unable to create the account. Please try again.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  // REAL EMAIL SIGN-IN
  const signInWithEmail = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !pw) {
      alert('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      const result =
        await FirebaseAuthentication.signInWithEmailAndPassword({
          email: cleanEmail,
          password: pw,
        });

      const user = result.user;

      if (!user) {
        throw new Error('Sign-in did not return a user.');
      }

      // Do not allow an unverified email account into the app
      if (!user.emailVerified) {
        setPendingEmail(cleanEmail);
        setView('verifyEmail');

        try {
          await FirebaseAuthentication.sendEmailVerification();
        } catch (verificationError) {
          console.error(
            'Verification email could not be resent:',
            verificationError
          );
        }

        alert(
          'Please verify your email first. We sent a verification email to your address.'
        );

        return;
      }

      const displayName =
        user.displayName?.trim() ||
        cleanEmail.split('@')[0] ||
        'User';

      const [firstName, ...lastParts] = displayName.split(/\s+/);

      setProfile({
        mode: 'account',
        firstName: firstName || 'User',
        lastName: lastParts.join(' '),
        email: user.email || cleanEmail,
      });

      setView('profile');
    } catch (error: any) {
      console.error('Email Sign-In failed:', error);

      const message =
        error?.message || 'Email sign-in failed. Please check your details.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  // Check whether the email has been verified
  const checkEmailVerification = async () => {
    try {
      setLoading(true);

      await FirebaseAuthentication.reload();

      const result = await FirebaseAuthentication.getCurrentUser();
      const user = result.user;

      if (!user) {
        alert('No account is currently signed in.');
        return;
      }

      if (!user.emailVerified) {
        alert(
          'Your email is not verified yet. Please open the verification email and tap the verification link.'
        );
        return;
      }

      const displayName =
        user.displayName?.trim() ||
        pendingEmail.split('@')[0] ||
        'User';

      const [firstName, ...lastParts] = displayName.split(/\s+/);

      setProfile({
        mode: 'account',
        firstName: firstName || 'User',
        lastName: lastParts.join(' '),
        email: user.email || pendingEmail,
      });

      setView('profile');
    } catch (error: any) {
      console.error('Email verification check failed:', error);
      alert('Could not check verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // REAL GOOGLE SIGN-IN
  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      const result = await FirebaseAuthentication.signInWithGoogle();

      const user = result.user;

      if (!user) {
        throw new Error('Google sign-in did not return a user.');
      }

      const displayName = user.displayName?.trim() || 'User';
      const [firstName, ...lastParts] = displayName.split(/\s+/);

      setProfile({
        mode: 'account',
        firstName: firstName || 'User',
        lastName: lastParts.join(' '),
        email: user.email || '',
      });

      setView('profile');
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);

      alert(
        error?.message ||
          'Google Sign-In failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await FirebaseAuthentication.signOut();
    } catch (error) {
      console.error('Firebase sign-out failed:', error);
    }

    setProfile(null);
    setView('menu');
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-app"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <button
          onClick={onBack}
          className="text-muted"
          aria-label="Back"
        >
          ←
        </button>

        <h1 className="text-main font-semibold">Account</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'menu' && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-3">
            <User size={40} className="text-muted mb-2" />

            <OptionCard
              icon={<User size={20} />}
              title="Use as guest"
              onClick={() => setView('guest')}
            />

            <OptionCard
              icon={<Mail size={20} />}
              title="Sign up"
              onClick={() => setView('signup')}
            />

            <OptionCard
              icon={<Mail size={20} />}
              title="Sign in"
              onClick={() => setView('signin')}
            />
          </div>
        )}

        {view === 'guest' && (
          <FormCard
            title="Continue as guest"
            onBack={() => setView('menu')}
          >
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="First name"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft"
            />

            <input
              value={last}
              onChange={(e) => setLast(e.target.value)}
              placeholder="Last name"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft"
            />

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
            <h2 className="text-main font-bold text-xl mb-2">
              Create account
            </h2>

            <OptionCard
              icon={<Globe size={20} />}
              title="Sign up with Google"
              onClick={signInWithGoogle}
            />

            <OptionCard
              icon={<Mail size={20} />}
              title="Sign up with email"
              onClick={() => setView('emailSignup')}
            />

            <button
              onClick={() => setView('menu')}
              className="text-muted text-sm mt-2"
            >
              Back
            </button>
          </div>
        )}

        {view === 'signin' && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-3">
            <h2 className="text-main font-bold text-xl mb-2">
              Welcome back
            </h2>

            <OptionCard
              icon={<Globe size={20} />}
              title="Sign in with Google"
              onClick={signInWithGoogle}
            />

            <OptionCard
              icon={<Mail size={20} />}
              title="Sign in with email"
              onClick={() => setView('emailSignin')}
            />

            <button
              onClick={() => setView('menu')}
              className="text-muted text-sm mt-2"
            >
              Back
            </button>
          </div>
        )}

        {(view === 'emailSignup' || view === 'emailSignin') && (
          <FormCard
            title={
              view === 'emailSignup'
                ? 'Sign up with email'
                : 'Sign in with email'
            }
            onBack={() =>
              setView(view === 'emailSignup' ? 'signup' : 'signin')
            }
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft"
            />

            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete={
                view === 'emailSignup'
                  ? 'new-password'
                  : 'current-password'
              }
              className="w-full rounded-xl px-4 py-3 text-main outline-none border border-app surface-soft"
            />

            <button
              onClick={
                view === 'emailSignup'
                  ? startEmailSignup
                  : signInWithEmail
              }
              disabled={
                loading ||
                !email.trim() ||
                !pw.trim()
              }
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {loading
                ? 'Please wait...'
                : view === 'emailSignup'
                  ? 'Create account'
                  : 'Sign in'}
            </button>

            {view === 'emailSignup' && (
              <p className="text-muted text-xs text-center">
                A real Firebase verification email will be sent to your email address.
              </p>
            )}
          </FormCard>
        )}

        {view === 'verifyEmail' && (
          <FormCard
            title="Verify your email"
            onBack={() => setView('emailSignup')}
            subtitle={`We sent a verification email to ${pendingEmail}.`}
          >
            <div className="surface-soft rounded-xl p-4 text-center">
              <p className="text-main font-medium">
                Check your inbox
              </p>

              <p className="text-muted text-sm mt-2">
                Open the email from Firebase and tap the verification link.
                Then return to the app and press the button below.
              </p>
            </div>

            <button
              onClick={checkEmailVerification}
              disabled={loading}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {loading
                ? 'Checking...'
                : 'I verified my email'}
            </button>

            <button
              onClick={async () => {
                try {
                  await FirebaseAuthentication.sendEmailVerification();
                  alert('Verification email sent again.');
                } catch (error: any) {
                  console.error(
                    'Resend verification email failed:',
                    error
                  );
                  alert(
                    error?.message ||
                      'Could not resend the verification email.'
                  );
                }
              }}
              className="w-full rounded-xl py-3 font-semibold surface-soft text-main border border-app"
            >
              Resend verification email
            </button>

            <p className="text-muted text-xs text-center">
              Check Spam/Junk if you do not see the email.
            </p>
          </FormCard>
        )}

        {view === 'profile' && profile && (
          <div className="flex flex-col items-center px-6 pt-10">
            <div
              className="flex items-center justify-center w-24 h-24 rounded-full text-white text-3xl font-bold mb-4"
              style={{
                background:
                  'linear-gradient(135deg, #2563eb, #60a5fa)',
              }}
            >
              {initials(profile.firstName, profile.lastName)}
            </div>

            <h2 className="text-main font-bold text-xl">
              {profile.firstName} {profile.lastName}
            </h2>

            {profile.email && (
              <p className="text-muted text-sm">
                {profile.email}
              </p>
            )}

            <span className="mt-2 text-xs px-3 py-1 rounded-full surface-soft text-soft border border-app">
              {profile.mode === 'guest'
                ? 'Guest'
                : 'Account'}
            </span>

            <div className="surface rounded-2xl p-4 w-full max-w-sm mt-6 text-center">
              <p className="text-muted text-sm">
                Total notes
              </p>

              <p className="text-main text-3xl font-bold mt-1">
                {totalNotes()}
              </p>
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
                  onClick={signOut}
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

function OptionCard({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full max-w-sm rounded-xl p-4 surface border border-app hover:shadow-md"
    >
      <span style={{ color: 'var(--accent)' }}>
        {icon}
      </span>

      <span className="text-main font-medium">
        {title}
      </span>
    </button>
  );
}

function FormCard({
  title,
  subtitle,
  children,
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="text-muted text-sm mb-4"
        >
          ← Back
        </button>

        <h2 className="text-main font-bold text-xl mb-2">
          {title}
        </h2>

        {subtitle && (
          <p className="text-muted text-sm mb-4">
            {subtitle}
          </p>
        )}

        <div className="space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
