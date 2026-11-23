import { ReactNode } from 'react';
import { User } from '../App';
import { AppHeader } from './AppHeader';

type AppLayoutProps = {
  user: User;
  onLogout: () => void;
  children: ReactNode;
};

// The shared shell for every signed-in page: header on top, one centred container below.
export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  return (
    <div className="min-h-svh bg-stone-50">
      <AppHeader user={user} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
