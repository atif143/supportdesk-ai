import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

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

  // When the website opens, use the refresh cookie to log the user back in
  useEffect(() => {
    async function restoreLogin() {
      const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });

      if (refreshResponse.ok) {
        const { token } = await refreshResponse.json();
        const meResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(await meResponse.json());
      }

      setLoading(false);
    }

    restoreLogin();
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <HomePage user={user} onLogout={logout} /> : <Navigate to="/login" />}
      />
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}
