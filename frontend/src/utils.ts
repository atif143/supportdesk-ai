// Small helpers used on more than one page

// The white box with a thin border that most sections use
export const cardClasses =
  'overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]';

// The title row at the top of a card on the ticket page
export const cardHeaderClasses = 'border-b border-zinc-100 px-5 py-3.5';

// The big dark button, for example "New ticket" or "Create ticket"
export const primaryButtonClasses =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900';

// The smaller white button with a border, for example "Summarize ticket"
export const secondaryButtonClasses =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900';

// "Agent User" -> "AU"
export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// "Nov 23" (the year is added only if it is not this year)
export function formatDate(value: string) {
  const date = new Date(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

// "Nov 23, 4:05 PM"
export function formatDateTime(value: string) {
  const date = new Date(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
