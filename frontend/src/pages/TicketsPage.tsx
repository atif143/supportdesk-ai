import { FormEvent, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AppLayout } from '../components/AppLayout';
import {
  AlertIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  TicketIcon,
  XIcon,
} from '../components/icons';
import {
  CATEGORY_LABELS,
  PriorityBadge,
  ReviewBadge,
  shortId,
  StatusBadge,
} from '../components/TicketBadges';

type Ticket = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  needsReview?: boolean;
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_customer', label: 'Waiting on customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'billing', label: 'Billing' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

const searchInputClasses =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';

function formatDate(value: string) {
  const date = new Date(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
};

function FilterSelect({ label, value, options, onChange, className = '' }: FilterSelectProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-zinc-300 bg-white pl-3 pr-8 text-[13px] text-zinc-700 outline-none transition hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 sm:w-auto"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}

function TicketSkeleton() {
  const widths = ['w-1/2', 'w-2/3', 'w-1/3'];

  return (
    <div aria-hidden="true" className="divide-y divide-zinc-100">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-3.5 animate-pulse rounded bg-stone-200 ${widths[index % widths.length]}`} />
            <div className="h-2.5 w-24 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-stone-100" />
          <div className="hidden h-3 w-14 animate-pulse rounded bg-stone-100 lg:block" />
          <div className="hidden h-3 w-16 animate-pulse rounded bg-stone-100 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function TicketsPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [searchText, setSearchText] = useState(''); // what is typed in the box
  const [search, setSearch] = useState(''); // what we actually search for
  // Agents start with only their own tickets. Admins start with all tickets.
  const [onlyMine, setOnlyMine] = useState(user.role === 'agent');

  // Wait until the user stops typing before asking the server.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  // Build the address, for example: /tickets?page=1&status=open
  const params = new URLSearchParams({ page: String(page) });
  if (onlyMine) params.set('assigneeId', user.id);
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  // Load the tickets. It loads again by itself when the page or a filter changes.
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['tickets', page, onlyMine, status, priority, category, search],
    queryFn: () => api(`/tickets?${params}`),
    placeholderData: keepPreviousData,
  });

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchText.trim());
    setPage(1);
  }

  function clearSearch() {
    setSearchText('');
    setSearch('');
    setPage(1);
  }

  function clearFilters() {
    setStatus('');
    setPriority('');
    setCategory('');
    setSearchText('');
    setSearch('');
    setPage(1);
  }

  const tickets: Ticket[] = data ? data.tickets : [];
  const total: number = data ? data.total : 0;
  const limit: number = data ? data.limit : 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const hasFilters = Boolean(status || priority || category || search);

  return (
    <AppLayout user={user} onLogout={onLogout}>
      <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900">Tickets</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {user.role === 'customer'
                ? 'Track every request you have sent to our support team.'
                : 'Manage every request in your support queue.'}
            </p>
          </div>

          <Link
            to="/tickets/new"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <PlusIcon className="size-4" />
            New ticket
          </Link>
        </div>

        <section
          aria-busy={isLoading}
          className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
        >
          <div className="flex flex-col gap-2.5 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:p-5">
            <form role="search" onSubmit={handleSearch} className="relative w-full lg:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                aria-label="Search tickets"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search tickets..."
                className={searchInputClasses}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-zinc-400 transition-colors hover:bg-stone-100 hover:text-zinc-700"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </form>

            <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap lg:justify-end">
              {user.role !== 'customer' && (
                <div
                  role="group"
                  aria-label="Ticket scope"
                  className="col-span-2 flex h-10 items-center rounded-lg border border-zinc-200 bg-stone-100 p-1 sm:col-auto"
                >
                  <button
                    type="button"
                    aria-pressed={!onlyMine}
                    onClick={() => {
                      setOnlyMine(false);
                      setPage(1);
                    }}
                    className={`h-8 flex-1 rounded-md px-3 text-[13px] font-medium transition sm:flex-none ${
                      !onlyMine
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    All tickets
                  </button>
                  <button
                    type="button"
                    aria-pressed={onlyMine}
                    onClick={() => {
                      setOnlyMine(true);
                      setPage(1);
                    }}
                    className={`h-8 flex-1 rounded-md px-3 text-[13px] font-medium transition sm:flex-none ${
                      onlyMine
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Assigned to me
                  </button>
                </div>
              )}

              <FilterSelect
                label="Filter by status"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />

              <FilterSelect
                label="Filter by priority"
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={(value) => {
                  setPriority(value);
                  setPage(1);
                }}
              />

              <FilterSelect
                label="Filter by category"
                value={category}
                options={CATEGORY_OPTIONS}
                className="col-span-2 sm:col-auto"
                onChange={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
              />

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900 sm:col-auto"
                >
                  <XIcon className="size-3.5" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <TicketSkeleton />
          ) : error ? (
            <div className="p-5 sm:p-6">
              <div
                role="alert"
                className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Could not load tickets</p>
                    <p className="mt-0.5 text-[13px] text-red-700">{error.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-red-300 bg-white px-3 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="grid size-11 place-items-center rounded-full border border-zinc-200 bg-stone-50 text-zinc-400">
                <TicketIcon className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-zinc-900">
                {hasFilters ? 'No tickets match your filters' : 'No tickets yet'}
              </h2>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                {hasFilters
                  ? 'Try adjusting the filters or clearing your search.'
                  : user.role === 'customer'
                    ? 'When you create a ticket, it will appear here.'
                    : 'New requests will appear here as they come in.'}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-stone-50"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/tickets/new"
                  className="mt-4 inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  New ticket
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Phones: a compact card per ticket */}
              <ul className="divide-y divide-zinc-100 md:hidden">
                {tickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="relative p-4 transition-colors active:bg-stone-50"
                  >
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="block text-sm font-medium text-zinc-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                      {ticket.title}
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      {ticket.needsReview && <ReviewBadge />}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] text-zinc-500">
                      <span>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablets and up: a full table */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Tickets</caption>
                  <thead className="border-b border-zinc-200 bg-stone-50/70 text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Ticket
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Priority
                      </th>
                      <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                        Category
                      </th>
                      <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                        Created
                      </th>
                      <th scope="col" className="w-10 py-3 pl-2 pr-5">
                        <span className="sr-only">Open ticket</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="group relative transition-colors hover:bg-stone-50/80"
                      >
                        <td className="min-w-0 px-5 py-3.5">
                          <Link
                            to={`/tickets/${ticket.id}`}
                            title={ticket.title}
                            className="block min-w-0 font-medium text-zinc-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                          >
                            <span className="block max-w-[380px] truncate">{ticket.title}</span>
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[11px] text-zinc-500">
                              #{shortId(ticket.id)}
                            </span>
                            {ticket.needsReview && <ReviewBadge />}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3.5 text-[13px] text-zinc-600 lg:table-cell">
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3.5 text-[13px] text-zinc-500 md:table-cell">
                          {formatDate(ticket.createdAt)}
                        </td>
                        <td className="py-3.5 pl-2 pr-5 text-right">
                          <ChevronRightIcon className="ml-auto size-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-zinc-500" aria-live="polite">
                  {isFetching ? (
                    'Updating…'
                  ) : (
                    <>
                      Showing{' '}
                      <span className="font-medium text-zinc-700">
                        {first}–{last}
                      </span>{' '}
                      of <span className="font-medium text-zinc-700">{total.toLocaleString()}</span>
                    </>
                  )}
                </p>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </button>

                  <span className="text-xs text-zinc-500">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
    </AppLayout>
  );
}
