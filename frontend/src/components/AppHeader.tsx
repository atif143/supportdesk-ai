import { Link, useLocation } from 'react-router-dom';
import { User } from '../App';
import { Brand } from './Brand';
import { initials } from '../utils';
import { LogOutIcon } from './icons';

type AppHeaderProps = {
  user: User;
  onLogout: () => void;
};

// A link in the top menu. The page you are on is shown with a grey background.
function NavLink({ to, active, children }: { to: string; active: boolean; children: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
        active ? 'bg-stone-100 text-zinc-900' : 'text-zinc-600 hover:bg-stone-100 hover:text-zinc-900'
      }`}
    >
      {children}
    </Link>
  );
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const onArticles = useLocation().pathname.startsWith('/articles');
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            aria-label="SupportDesk AI home"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <Brand />
          </Link>

          <nav className="hidden gap-1 sm:flex">
            <NavLink to="/" active={!onArticles}>
              Tickets
            </NavLink>
            {user.role === 'admin' && (
              <NavLink to="/articles" active={onArticles}>
                Knowledge base
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-stone-200 text-[11px] font-semibold text-zinc-700">
              {initials(user.name)}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-medium text-zinc-900">{user.name}</p>
              <p className="text-[11px] capitalize text-zinc-500">{user.role}</p>
            </div>
          </div>

          <span className="hidden h-6 w-px bg-zinc-200 sm:block" />

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <LogOutIcon className="size-4" />
            <span className="hidden sm:inline">Log out</span>
            <span className="sr-only sm:hidden">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
