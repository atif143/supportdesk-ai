import { FormEvent, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AppLayout } from '../components/AppLayout';
import { BackLink } from '../components/BackLink';
import { ErrorBox } from '../components/ErrorBox';

type FieldErrors = {
  title?: string;
  description?: string;
};

const TITLE_LIMIT = 120;
const DESCRIPTION_LIMIT = 5000;

const labelClasses = 'mb-2 flex items-baseline justify-between gap-3 text-[13px] font-medium text-zinc-700';
const counterClasses = 'text-[11px] font-normal tabular-nums text-zinc-500';

function controlClasses(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 ${
    hasError
      ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10'
      : 'border-zinc-300 bg-stone-50 hover:border-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10'
  }`;
}

export function NewTicketPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const nextErrors: FieldErrors = {};

    if (!trimmedTitle) nextErrors.title = 'Give your ticket a short title.';
    if (!trimmedDescription) nextErrors.description = 'Describe the problem so we can help.';

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Put the cursor in the first field that needs attention.
      (nextErrors.title ? titleRef : descriptionRef).current?.focus();
      return;
    }

    setSending(true);

    try {
      const ticket = await api('/tickets', {
        method: 'POST',
        body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription }),
      });
      queryClient.invalidateQueries({ queryKey: ['tickets'] }); // the list must load again
      navigate(`/tickets/${ticket.id}`); // show the ticket we just created
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  return (
    <AppLayout user={user} onLogout={onLogout}>
      <div className="mx-auto w-full max-w-2xl">
        <BackLink to="/" label="Back to tickets" />

        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900">New ticket</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Tell us what happened and include anything you have already tried.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] sm:p-6"
        >
          {error && <ErrorBox title="Could not create the ticket" message={error} className="mb-5" />}

          <div className="space-y-5">
            <div>
              <label htmlFor="ticket-title" className={labelClasses}>
                Title
                <span aria-hidden="true" className={counterClasses}>
                  {title.length}/{TITLE_LIMIT}
                </span>
              </label>
              <input
                id="ticket-title"
                ref={titleRef}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (fieldErrors.title) setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
                maxLength={TITLE_LIMIT}
                placeholder="A short summary of the problem"
                aria-invalid={fieldErrors.title ? true : undefined}
                aria-describedby={fieldErrors.title ? 'ticket-title-error' : undefined}
                disabled={sending}
                className={`h-11 ${controlClasses(Boolean(fieldErrors.title))}`}
              />
              {fieldErrors.title && (
                <p id="ticket-title-error" className="mt-1.5 text-xs leading-snug text-red-600">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="ticket-description" className={labelClasses}>
                Description
                <span aria-hidden="true" className={counterClasses}>
                  {description.length}/{DESCRIPTION_LIMIT}
                </span>
              </label>
              <textarea
                id="ticket-description"
                ref={descriptionRef}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((current) => ({ ...current, description: undefined }));
                  }
                }}
                rows={8}
                maxLength={DESCRIPTION_LIMIT}
                placeholder="What were you doing when it happened? What did you expect instead?"
                aria-invalid={fieldErrors.description ? true : undefined}
                aria-describedby={
                  fieldErrors.description ? 'ticket-description-error' : 'ticket-description-hint'
                }
                disabled={sending}
                className={`resize-y ${controlClasses(Boolean(fieldErrors.description))}`}
              />
              {fieldErrors.description ? (
                <p id="ticket-description-error" className="mt-1.5 text-xs leading-snug text-red-600">
                  {fieldErrors.description}
                </p>
              ) : (
                <p id="ticket-description-hint" className="mt-1.5 text-xs leading-snug text-zinc-500">
                  Screenshots or error messages can be added as a comment once the ticket exists.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">We usually reply within one business day.</p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                to="/"
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-700"
              >
                {sending ? 'Creating…' : 'Create ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
