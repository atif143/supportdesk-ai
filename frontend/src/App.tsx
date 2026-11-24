import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api, setLoginToken } from './api';
import { socket } from './socket';
import { ArticlePage } from './pages/ArticlePage';
import { ArticlesPage } from './pages/ArticlesPage';
import { LoginPage } from './pages/LoginPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { RegisterPage } from './pages/RegisterPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
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
      try {
        const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });

        if (refreshResponse.ok) {
          const { token } = await refreshResponse.json();
          setLoginToken(token);
          setUser(await api('/auth/me'));
        }
      } catch {
        // The server may be unavailable. Show the login page instead of hanging.
      } finally {
        setLoading(false);
      }
    }

    restoreLogin();
  }, []);

  // Real-time updates: open the WebSocket connection after login, close it on logout
  useEffect(() => {
    if (user) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [user]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoginToken('');
    queryClient.clear(); // forget all loaded data
    setUser(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-white">
        <p className="text-sm text-zinc-600">Loading…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <TicketsPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
      />
      <Route
        path="/tickets/new"
        element={
          user ? <NewTicketPage user={user} onLogout={logout} /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/tickets/:id"
        element={user ? <TicketDetailPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
      />
      {/* The knowledge base list is for admins. One article can be read by agents and admins. */}
      <Route
        path="/articles"
        element={
          user?.role === 'admin' ? <ArticlesPage user={user} onLogout={logout} /> : <Navigate to="/" />
        }
      />
      <Route
        path="/articles/:id"
        element={
          user && user.role !== 'customer' ? (
            <ArticlePage user={user} onLogout={logout} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}
