import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export function TicketDetailPage({ user }: { user: User }) {
  const { id } = useParams(); // the ticket id from the address /tickets/:id
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState('');

  // Load the ticket and its comments
  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api(`/tickets/${id}`),
  });
  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api(`/tickets/${id}/comments`),
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
