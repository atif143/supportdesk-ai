import { FormEvent, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AppLayout } from '../components/AppLayout';
import { RiAddLine, RiArrowDownSLine, RiCloseLine, RiErrorWarningLine, RiSearchLine, RiTicket2Line } from '@remixicon/react';
import { Pagination } from '../components/Pagination';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../components/TicketBadges';
import { TicketList, TicketRow } from '../components/TicketList';
import { useTicketListUpdates } from '../socket';
import { cardClasses, primaryButtonClasses } from '../utils';

// The filter lists: the same choices as on the ticket page, plus "All ..." at the top
const STATUS_FILTERS = [{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS];
const PRIORITY_FILTERS = [{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS];
const CATEGORY_FILTERS = [{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS];

const searchInputClasses =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-9 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';

// The chosen scope button is white, the other one is grey
function scopeButtonClasses(active: boolean) {
  const colours = active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900';
  return `h-8 flex-1 rounded-md px-3 text-[13px] font-medium sm:flex-none ${colours}`;
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
        className="h-10 w-full appearance-none rounded-lg border border-zinc-300 bg-white pl-3 pr-8 text-[13px] text-zinc-700 outline-none hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 sm:w-auto"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <RiArrowDownSLine className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
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

  // Real-time: when any ticket is created or changed, load the list again
  useTicketListUpdates();

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

  // "All tickets" or "Assigned to me"
  function changeScope(mine: boolean) {
    setOnlyMine(mine);
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

  const tickets: TicketRow[] = data ? data.tickets : [];
  const total: number = data ? data.total : 0;
  const limit: number = data ? data.limit : 20;
  const hasFilters = Boolean(status || priority || category || search);

  // The small text when the list is empty
  let emptyText = 'New requests will appear here as they come in.';
  if (user.role === 'customer') emptyText = 'When you create a ticket, it will appear here.';
  if (hasFilters) emptyText = 'Try adjusting the filters or clearing your search.';

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

        <Link to="/tickets/new" className={`${primaryButtonClasses} shrink-0`}>
          <RiAddLine className="size-4" />
          New ticket
        </Link>
      </div>

      <section aria-busy={isLoading} className={`mt-6 ${cardClasses}`}>
        <div className="flex flex-col gap-2.5 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:p-5">
          <form role="search" onSubmit={handleSearch} className="relative w-full lg:max-w-xs">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
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
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-zinc-400 hover:bg-stone-100 hover:text-zinc-700"
              >
                <RiCloseLine className="size-3.5" />
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
                  onClick={() => changeScope(false)}
                  className={scopeButtonClasses(!onlyMine)}
                >
                  All tickets
                </button>
                <button
                  type="button"
                  aria-pressed={onlyMine}
                  onClick={() => changeScope(true)}
                  className={scopeButtonClasses(onlyMine)}
                >
                  Assigned to me
                </button>
              </div>
            )}

            <FilterSelect
              label="Filter by status"
              value={status}
              options={STATUS_FILTERS}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />

            <FilterSelect
              label="Filter by priority"
              value={priority}
              options={PRIORITY_FILTERS}
              onChange={(value) => {
                setPriority(value);
                setPage(1);
              }}
            />

            <FilterSelect
              label="Filter by category"
              value={category}
              options={CATEGORY_FILTERS}
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
                className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-900 sm:col-auto"
              >
                <RiCloseLine className="size-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="px-5 py-6 text-sm text-zinc-500">Loading tickets…</p>
        ) : error ? (
          <div className="p-5 sm:p-6">
            <div
              role="alert"
              className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Could not load tickets</p>
                  <p className="mt-0.5 text-[13px] text-red-700">{error.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-red-300 bg-white px-3 text-[13px] font-medium text-red-700 hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-zinc-200 bg-stone-50 text-zinc-400">
              <RiTicket2Line className="size-5" />
            </span>
            <h2 className="mt-4 text-sm font-semibold text-zinc-900">
              {hasFilters ? 'No tickets match your filters' : 'No tickets yet'}
            </h2>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">{emptyText}</p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-700 hover:bg-stone-50"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/tickets/new"
                className="mt-4 inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-[13px] font-medium text-white hover:bg-zinc-800"
              >
                New ticket
              </Link>
            )}
          </div>
        ) : (
          <>
            <TicketList tickets={tickets} />
            <Pagination
              page={page}
              limit={limit}
              total={total}
              isFetching={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </AppLayout>
  );
}
