// Small helpers used on more than one page

// The white box with a thin border that most sections use
export const cardClasses =
  'overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]';

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
