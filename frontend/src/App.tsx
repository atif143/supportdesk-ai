import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api, setLoginToken } from './api';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TicketsPage } from './pages/TicketsPage';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function App() {
  // The logged-in user. null means nobody is logged in.
  const [user, setUser] = useState<User | null>(null);
  // true while we check if the user is still logged in
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // When the website opens, use the refresh cookie to log the user back in
  useEffect(() => {
    async function restoreLogin() {
      const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });

      if (refreshResponse.ok) {
        const { token } = await refreshResponse.json();
        setLoginToken(token);
        setUser(await api('/auth/me'));
      }

      setLoading(false);
    }

    restoreLogin();
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoginToken('');
    queryClient.clear(); // forget all loaded data
    setUser(null);
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <TicketsPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
      />
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}
