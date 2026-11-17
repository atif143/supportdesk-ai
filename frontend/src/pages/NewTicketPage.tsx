import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';

export function NewTicketPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setSending(true);

    try {
      await api('/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
      setSuccess(true);
      setTitle('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['tickets'] }); // the list must load again
    } catch (err) {
      setError((err as Error).message);
    }

    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <Link to="/">Back to tickets</Link>
      </p>

      <h1>New ticket</h1>

      {success && <p role="status">Your ticket was created.</p>}
      {error && <p role="alert">{error}</p>}

      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label>
        Describe your problem
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>

      <button type="submit" disabled={sending}>
        {sending ? 'Sending...' : 'Create ticket'}
      </button>
    </form>
  );
}
