import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';

type Ticket = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
};

export function TicketsPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [searchText, setSearchText] = useState(''); // what is typed in the box
  const [search, setSearch] = useState(''); // what we actually search for

  // Build the address, for example: /tickets?page=1&status=open
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  // Load the tickets. It loads again by itself when the page or a filter changes.
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', page, status, priority, category, search],
    queryFn: () => api(`/tickets?${params}`),
  });

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchText);
    setPage(1);
  }

  const tickets: Ticket[] = data ? data.tickets : [];
  const totalPages = data ? Math.ceil(data.total / data.limit) || 1 : 1; // at least 1 page

  return (
    <div>
      <p>
        Hello, {user.name} ({user.role}) <button onClick={onLogout}>Log out</button>
      </p>

      <h1>Tickets</h1>

      <p>
        <Link to="/tickets/new">New ticket</Link>
      </p>

      <form onSubmit={handleSearch}>
        <label>
          Search
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </label>
        <button type="submit">Search</button>
      </form>

      <label>
        Status
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_on_customer">Waiting on customer</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </label>

      <label>
        Priority
        <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>

      <label>
        Category
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="billing">Billing</option>
          <option value="bug">Bug</option>
          <option value="feature_request">Feature request</option>
          <option value="account">Account</option>
          <option value="other">Other</option>
        </select>
      </label>

      {isLoading && <p>Loading tickets...</p>}

      {error && <p role="alert">{error.message}</p>}

      {data && tickets.length === 0 && <p>No tickets found.</p>}

      {tickets.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                </td>
                <td>{ticket.status}</td>
                <td>{ticket.priority}</td>
                <td>{ticket.category}</td>
                <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && (
        <p>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>{' '}
          Page {page} of {totalPages} ({data.total} tickets){' '}
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </p>
      )}
    </div>
  );
}
