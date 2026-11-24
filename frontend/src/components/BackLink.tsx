import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from './icons';

// The small "← Back to ..." link at the top of a page
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    >
      <ArrowLeftIcon className="size-4" />
      {label}
    </Link>
  );
}
