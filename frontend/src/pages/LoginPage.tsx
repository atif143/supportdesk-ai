import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../App';

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the page from reloading
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
      return;
    }

    onLogin(data.user);
    navigate('/');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Log in</h1>

      {error && <p role="alert">{error}</p>}

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>

      <button type="submit">Log in</button>

      <p>
        No account yet? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
