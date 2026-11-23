import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthAlert } from '../components/AuthAlert';
import { AuthCardHeader } from '../components/AuthCardHeader';
import { AuthLayout } from '../components/AuthLayout';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { AuthSwitch } from '../components/AuthSwitch';
import { TextField } from '../components/TextField';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the page from reloading
    setError('');
    setConfirmError('');

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'We could not create your account. Please try again.');
        return;
      }

      navigate('/login', { state: { registered: true } });
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCardHeader
        title="Create account"
        subtitle="Submit and track your support requests in one place."
      />

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        {error && <AuthAlert>{error}</AuthAlert>}

        <TextField
          id="register-name"
          label="Full name"
          value={name}
          onChange={setName}
          placeholder="Alex Morgan"
          autoComplete="name"
          disabled={submitting}
        />

        <TextField
          id="register-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
          autoComplete="email"
          disabled={submitting}
        />

        <TextField
          id="register-password"
          label="Password"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setConfirmError('');
          }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          disabled={submitting}
        />

        <TextField
          id="register-confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            setConfirmError('');
          }}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={confirmError}
          disabled={submitting}
        />

        <AuthSubmitButton busy={submitting} label="Create account" busyLabel="Creating account…" />
      </form>

      <AuthSwitch prompt="Already have an account?" linkText="Sign in" to="/login" />
    </AuthLayout>
  );
}
