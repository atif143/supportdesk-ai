import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AiSuggestionCard } from '../components/AiSuggestionCard';
import { AiSummaryCard } from '../components/AiSummaryCard';
import { AppLayout } from '../components/AppLayout';
import { AskAiCard } from '../components/AskAiCard';
import { BackLink } from '../components/BackLink';
import { Comment, CommentList } from '../components/CommentList';
import { ErrorBox } from '../components/ErrorBox';
import { RiChat3Line, RiErrorWarningLine, RiTimeLine } from '@remixicon/react';
import {
  CATEGORY_LABELS,
  PriorityBadge,
  ReviewBadge,
  shortId,
  StatusBadge,
} from '../components/TicketBadges';
import { TicketDetailsCard } from '../components/TicketDetailsCard';
import { TicketPropertiesCard } from '../components/TicketPropertiesCard';
import { useTicketUpdates } from '../socket';
import { cardClasses, cardHeaderClasses, formatDateTime } from '../utils';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  assigneeId: string | null;
  aiCategory?: string;
  aiPriority?: string;
  aiReason?: string;
  needsReview?: boolean;
};

export function TicketDetailPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { id } = useParams(); // the ticket id from the address /tickets/:id
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const isStaff = user.role !== 'customer';

  // Real-time: when someone else changes this ticket or adds a comment, show it at once
  useTicketUpdates(id);

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
    enabled: isStaff,
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

  // Ask the AI for a summary and a draft reply (agents and admins)
  const summarize = useMutation({
    mutationFn: () => api(`/tickets/${id}/summary`, { method: 'POST' }),
  });

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSending(true); // stops a double click from posting the comment twice

    try {
      await api(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, visibility: isInternal ? 'internal' : 'public' }),
      });
      setBody('');
      setIsInternal(false);
      summarize.reset(); // the summary is old now, so hide it
      queryClient.invalidateQueries({ queryKey: ['comments', id] }); // load the comments again
    } catch (err) {
      setError((err as Error).message);
    }

    setSending(false);
  }

  // "Use this reply" puts the draft in the comment box and jumps to it.
  // The draft is written for the customer, so it must not be sent as an internal note.
  function applyDraftReply(reply: string) {
    setBody(reply);
    setIsInternal(false);
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    composerRef.current?.focus({ preventScroll: true });
  }

  if (ticketQuery.isLoading) {
    return (
      <AppLayout user={user} onLogout={onLogout}>
        <p className="text-sm text-zinc-500">Loading ticket…</p>
      </AppLayout>
    );
  }

  if (ticketQuery.error) {
    return (
      <AppLayout user={user} onLogout={onLogout}>
        <div className="mx-auto w-full max-w-xl">
          <BackLink to="/" label="Back to tickets" />

          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div>
                <h1 className="text-sm font-semibold text-red-800">Could not load this ticket</h1>
                <p className="mt-1 text-[13px] text-red-700">{ticketQuery.error.message}</p>
                <button
                  type="button"
                  onClick={() => ticketQuery.refetch()}
                  className="mt-4 inline-flex h-9 items-center rounded-md border border-red-300 bg-white px-3 text-[13px] font-medium text-red-700 hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ticket = ticketQuery.data as Ticket;
  const comments: Comment[] = commentsQuery.data || [];

  // The hint inside the comment box
  let placeholder = 'Write a message to the support team…';
  if (isStaff) {
    placeholder = isInternal
      ? 'Write a note that only the team can see…'
      : 'Write a reply to the customer…';
  }

  return (
    <AppLayout user={user} onLogout={onLogout}>
      <div className="mx-auto w-full max-w-6xl">
        <BackLink to="/" label="Back to tickets" />

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span className="font-mono text-[11.5px] text-zinc-500">#{shortId(ticket.id)}</span>
            <span aria-hidden="true" className="h-3 w-px bg-zinc-300" />
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.needsReview && <ReviewBadge />}
          </div>

          <h1 className="mt-2.5 text-xl font-semibold tracking-[-0.02em] text-zinc-900 sm:text-2xl">
            {ticket.title}
          </h1>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <RiTimeLine className="size-3.5" />
              Opened <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
            </span>
            <span aria-hidden="true">·</span>
            <span>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
          </p>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-5">
            {/* The original request */}
            <section aria-labelledby="description-heading" className={cardClasses}>
              <div className={cardHeaderClasses}>
                <h2 id="description-heading" className="text-[13.5px] font-semibold text-zinc-900">
                  Description
                </h2>
              </div>
              <div className="px-5 py-4 sm:py-5">
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-700">
                  {ticket.description}
                </p>
              </div>
            </section>

            {/* The back-and-forth between the customer and the team */}
            <section aria-labelledby="conversation-heading" className={cardClasses}>
              <div className={`${cardHeaderClasses} flex items-center justify-between gap-3`}>
                <h2
                  id="conversation-heading"
                  className="flex items-center gap-2 text-[13.5px] font-semibold text-zinc-900"
                >
                  <RiChat3Line className="size-4 text-zinc-500" />
                  Conversation
                </h2>
                {comments.length > 0 && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                    {comments.length}
                  </span>
                )}
              </div>

              <CommentList
                comments={comments}
                isLoading={commentsQuery.isLoading}
                error={commentsQuery.error?.message}
                isStaff={isStaff}
              />

              <form
                onSubmit={handleAddComment}
                className="border-t border-zinc-100 bg-stone-50/60 px-5 py-4"
              >
                {error && <ErrorBox message={error} className="mb-3" />}

                <label htmlFor="comment-body" className="sr-only">
                  {isInternal ? 'Internal note' : 'Comment'}
                </label>
                <textarea
                  id="comment-body"
                  ref={composerRef}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={4}
                  placeholder={placeholder}
                  className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {isStaff ? (
                    <label className="inline-flex cursor-pointer items-start gap-2 text-[12px] text-zinc-600">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(event) => setIsInternal(event.target.checked)}
                        className="mt-0.5 size-4 rounded border-zinc-300 accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                      />
                      <span>
                        Internal note
                        <span className="text-zinc-500"> — hidden from the customer</span>
                      </span>
                    </label>
                  ) : (
                    <p className="text-[12px] text-zinc-500">Your reply is visible to the team.</p>
                  )}

                  <button
                    type="submit"
                    disabled={!body.trim() || sending}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[13px] font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RiChat3Line className="size-4" />
                    {sending ? 'Sending…' : 'Add comment'}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* The sidebar: facts about the ticket, plus AI help for the team */}
          <aside className="min-w-0 space-y-5">
            {isStaff ? (
              <>
                <TicketPropertiesCard
                  ticket={ticket}
                  staff={staffQuery.data || []}
                  staffLoading={staffQuery.isLoading}
                  userId={user.id}
                  isSaving={updateTicket.isPending}
                  error={updateError}
                  onUpdate={(changes) => updateTicket.mutate(changes)}
                />

                <AiSuggestionCard
                  ticket={ticket}
                  isSaving={updateTicket.isPending}
                  onUpdate={(changes) => updateTicket.mutate(changes)}
                />

                <AiSummaryCard
                  data={summarize.data}
                  error={summarize.error?.message}
                  isPending={summarize.isPending}
                  onGenerate={() => summarize.mutate()}
                  onUseReply={applyDraftReply}
                />

                <AskAiCard onUseReply={applyDraftReply} />
              </>
            ) : (
              <TicketDetailsCard ticket={ticket} />
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
