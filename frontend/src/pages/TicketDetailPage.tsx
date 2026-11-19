import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';

type Comment = {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  author: { name: string; role: string };
};

type StaffMember = {
  id: string;
  name: string;
};

export function TicketDetailPage({ user }: { user: User }) {
  const { id } = useParams(); // the ticket id from the address /tickets/:id
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');

  // Load the ticket and its comments
  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api(`/tickets/${id}`),
  });
  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api(`/tickets/${id}/comments`),
  });
  // Agents and admins, for the "Assigned to" list (not loaded for customers)
  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => api('/users/staff'),
    enabled: user.role !== 'customer',
  });

  // Change the ticket (agents and admins). "Optimistic": the screen changes at once,
  // and if the server says no, the old values come back.
  const updateTicket = useMutation({
    mutationFn: (changes: Record<string, string | null>) =>
      api(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),

    // 1. Before sending: remember the old ticket, then show the change at once
    onMutate: async (changes) => {
      setUpdateError('');
      await queryClient.cancelQueries({ queryKey: ['ticket', id] });
      const oldTicket = queryClient.getQueryData<Record<string, unknown>>(['ticket', id]);
      queryClient.setQueryData(['ticket', id], { ...oldTicket, ...changes });
      return { oldTicket };
    },

    // 2. If the server says no: put the old ticket back and show the error
    onError: (err, changes, context) => {
      queryClient.setQueryData(['ticket', id], context?.oldTicket);
      setUpdateError(err.message);
    },

    // 3. In both cases: load the real ticket and the list again
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await api(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, visibility: isInternal ? 'internal' : 'public' }),
      });
      setBody('');
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['comments', id] }); // load the comments again
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (ticketQuery.isLoading) {
    return <p>Loading ticket...</p>;
  }
  if (ticketQuery.error) {
    return <p role="alert">{ticketQuery.error.message}</p>;
  }

  const ticket = ticketQuery.data;
  const comments: Comment[] = commentsQuery.data || [];
  const staff: StaffMember[] = staffQuery.data || [];

  return (
    <div>
      <p>
        <Link to="/">Back to tickets</Link>
      </p>

      <h1>{ticket.title}</h1>
      <p>
        Status: {ticket.status} | Priority: {ticket.priority} | Category: {ticket.category}
      </p>
      <p>{ticket.description}</p>

      {user.role !== 'customer' && (
        <div>
          <h2>AI suggestion</h2>

          {!ticket.aiCategory && <p>No AI suggestion yet.</p>}

          {ticket.aiCategory && (
            <div>
              {ticket.needsReview && <p role="alert">Needs review by a person.</p>}
              <p>
                Category: {ticket.aiCategory} | Priority: {ticket.aiPriority}
              </p>
              <p>Reason: {ticket.aiReason}</p>

              {ticket.category === ticket.aiCategory && ticket.priority === ticket.aiPriority ? (
                <p>The ticket uses this suggestion.</p>
              ) : (
                <button
                  onClick={() => updateTicket.mutate({ category: ticket.aiCategory, priority: ticket.aiPriority })}
                >
                  Accept suggestion
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {user.role !== 'customer' && (
        <div>
          <h2>Update ticket</h2>

          {updateError && <p role="alert">{updateError}</p>}

          <label>
            Status
            <select value={ticket.status} onChange={(e) => updateTicket.mutate({ status: e.target.value })}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_on_customer">Waiting on customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label>
            Priority
            <select value={ticket.priority} onChange={(e) => updateTicket.mutate({ priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label>
            Category
            <select value={ticket.category} onChange={(e) => updateTicket.mutate({ category: e.target.value })}>
              <option value="billing">Billing</option>
              <option value="bug">Bug</option>
              <option value="feature_request">Feature request</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Assigned to
            <select
              value={ticket.assigneeId || ''}
              onChange={(e) => updateTicket.mutate({ assigneeId: e.target.value || null })}
            >
              <option value="">Nobody</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.id === user.id && ' (you)'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <h2>Comments</h2>

      {commentsQuery.isLoading && <p>Loading comments...</p>}
      {commentsQuery.data && comments.length === 0 && <p>No comments yet.</p>}

      {comments.map((comment) => (
        <div key={comment.id}>
          <p>
            <strong>{comment.author.name}</strong> ({comment.author.role})
            {comment.visibility === 'internal' && ' - internal note'} -{' '}
            {new Date(comment.createdAt).toLocaleString()}
          </p>
          <p>{comment.body}</p>
        </div>
      ))}

      <form onSubmit={handleAddComment}>
        {error && <p role="alert">{error}</p>}

        <label>
          Write a comment
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required />
        </label>

        {user.role !== 'customer' && (
          <label>
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
            Internal note (only staff can see it)
          </label>
        )}

        <button type="submit">Add comment</button>
      </form>
    </div>
  );
}
