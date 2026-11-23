import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setLoginToken } from '../api';
import { User } from '../App';
import { AuthAlert } from '../components/AuthAlert';
import { AuthCardHeader } from '../components/AuthCardHeader';
import { AuthLayout } from '../components/AuthLayout';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { AuthSwitch } from '../components/AuthSwitch';
import { TextField } from '../components/TextField';

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // The registration page sends us here with state.registered after a successful sign-up.
  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the page from reloading
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'We could not sign you in. Please try again.');
        return;
      }

      setLoginToken(data.token);
      onLogin(data.user);
      navigate('/');
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCardHeader title="Sign in" subtitle="Enter your details to access your workspace." />

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        {error && <AuthAlert>{error}</AuthAlert>}

        {justRegistered && !error && (
          <AuthAlert tone="success">Your account is ready. Sign in to continue.</AuthAlert>
        )}

        <TextField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
          autoComplete="email"
          disabled={submitting}
        />

        <TextField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={submitting}
        />

        <AuthSubmitButton busy={submitting} label="Sign in" busyLabel="Signing in…" />
      </form>

      <AuthSwitch prompt="Don't have an account?" linkText="Create one" to="/register" />
    </AuthLayout>
  );
}
