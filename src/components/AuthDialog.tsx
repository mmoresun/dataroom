import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';
import { register as apiRegister } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

type Mode = 'signin' | 'signup';

/** The app's entry point for unauthenticated users — a non-dismissable dialog (nothing
 * meaningful exists behind it) toggling between sign-in and sign-up, plus Google sign-in. */
export function AuthDialog() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('signin');

  const handleGoogleCredential = async (idToken: string) => {
    try {
      await auth.loginWithGoogle(idToken);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to sign in with Google.');
    }
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'signin' ? 'Sign in' : 'Create account'}</DialogTitle>
        </DialogHeader>

        {mode === 'signin' ? <SignInForm /> : <SignUpForm />}

        <div className="my-1 text-center text-sm text-muted-foreground">or</div>
        <GoogleSignInButton onCredential={handleGoogleCredential} />

        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button type="button" className="text-foreground underline" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="text-foreground underline" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await auth.loginWithEmail(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRegister(email, password, firstName, lastName);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create account.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Registration doesn't require email confirmation before the first login,
      // so sign the new user straight in rather than bouncing them back to sign-in.
      await auth.loginWithEmail(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // The account was created successfully above — only the automatic sign-in
      // failed, so don't tell the user account creation itself failed.
      toast.error(
        err instanceof ApiError
          ? `Account created, but sign-in failed: ${err.message}`
          : 'Account created — please sign in.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="register-first-name">First name</Label>
          <Input
            id="register-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="register-last-name">Last name</Label>
          <Input id="register-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
