import { useState } from 'react';
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

  return (
    <Routes>
      <Route path="/" element={user ? <HomePage user={user} /> : <Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}
