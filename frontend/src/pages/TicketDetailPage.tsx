import { FormEvent, ReactNode, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AiSummaryCard } from '../components/AiSummaryCard';
import { AppLayout } from '../components/AppLayout';
import { AskAiCard } from '../components/AskAiCard';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  PriorityBadge,
  ReviewBadge,
  shortId,
  STATUS_OPTIONS,
  StatusBadge,
} from '../components/TicketBadges';
import { BackLink } from '../components/BackLink';
import { ErrorBox } from '../components/ErrorBox';
import { AlertIcon, CheckIcon, ChevronDownIcon, ClockIcon, MessageIcon } from '../components/icons';
import { useTicketUpdates } from '../socket';
import { cardClasses, formatDateTime, initials } from '../utils';

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

type Ticket = {
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

// Which status a ticket can move to from its current status (the server enforces this too)
const NEXT_STATUSES: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['waiting_on_customer', 'resolved'],
  waiting_on_customer: ['in_progress', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

const cardHeaderClasses = 'border-b border-zinc-100 px-5 py-3.5';
const selectClasses =
  'h-9 w-full appearance-none rounded-lg border border-zinc-300 bg-white pl-2.5 pr-8 text-[13px] text-zinc-800 outline-none transition hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-60';

function RolePill({ role }: { role: string }) {
  const label = role === 'agent' ? 'Agent' : role === 'admin' ? 'Admin' : 'Customer';
  const style =
    role === 'customer'
      ? 'border-zinc-200 bg-white text-zinc-600'
      : 'border-zinc-200 bg-stone-100 text-zinc-700';

  return (
    <span className={`rounded-full border px-1.5 py-px text-[10.5px] font-medium ${style}`}>
      {label}
    </span>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
};

function SelectField({ id, label, value, disabled, onChange, children }: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={selectClasses}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading ticket" className="mx-auto w-full max-w-6xl">
      <span className="sr-only">Loading ticket…</span>
      <div aria-hidden="true">
        <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
        <div className="mt-5 h-3 w-32 animate-pulse rounded bg-stone-200/80" />
        <div className="mt-3 h-7 w-2/3 max-w-md animate-pulse rounded bg-stone-200" />
        <div className="mt-3 h-3 w-44 animate-pulse rounded bg-stone-200/80" />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5">
            <div className="h-36 rounded-xl border border-zinc-200 bg-white" />
            <div className="h-72 rounded-xl border border-zinc-200 bg-white" />
          </div>
          <div className="space-y-5">
            <div className="h-40 rounded-xl border border-zinc-200 bg-white" />
            <div className="h-48 rounded-xl border border-zinc-200 bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <DetailSkeleton />
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
              <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div>
                <h1 className="text-sm font-semibold text-red-800">Could not load this ticket</h1>
                <p className="mt-1 text-[13px] text-red-700">{ticketQuery.error.message}</p>
                <button
                  type="button"
                  onClick={() => ticketQuery.refetch()}
                  className="mt-4 inline-flex h-9 items-center rounded-md border border-red-300 bg-white px-3 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-100"
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
  const staff: StaffMember[] = staffQuery.data || [];
  const suggestionApplied =
    Boolean(ticket.aiCategory) &&
    ticket.category === ticket.aiCategory &&
    ticket.priority === ticket.aiPriority;
  const suggestion =
    ticket.aiCategory && ticket.aiPriority
      ? { category: ticket.aiCategory, priority: ticket.aiPriority }
      : null;
  // The server only allows certain moves (open → in progress, and so on),
  // so the menu only offers the current status and the valid next ones.
  const statusOptions = STATUS_OPTIONS.filter(
    (option) =>
      option.value === ticket.status || (NEXT_STATUSES[ticket.status] ?? []).includes(option.value),
  );

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
              <ClockIcon className="size-3.5" />
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
                  <MessageIcon className="size-4 text-zinc-500" />
                  Conversation
                </h2>
                {comments.length > 0 && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                    {comments.length}
                  </span>
                )}
              </div>

              {commentsQuery.isLoading ? (
                <div aria-hidden="true" className="space-y-4 px-5 py-5">
                  {[0, 1].map((index) => (
                    <div key={index} className="flex gap-3">
                      <div className="size-8 shrink-0 animate-pulse rounded-full bg-stone-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-32 animate-pulse rounded bg-stone-200" />
                        <div className="h-2.5 w-10/12 animate-pulse rounded bg-stone-100" />
                        <div className="h-2.5 w-7/12 animate-pulse rounded bg-stone-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commentsQuery.error ? (
                <div className="px-5 py-5">
                  <ErrorBox message={commentsQuery.error.message} />
                </div>
              ) : comments.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[13px] font-medium text-zinc-700">No comments yet</p>
                  <p className="mt-1 text-[12.5px] text-zinc-500">
                    {isStaff
                      ? 'Reply to the customer below, or leave a note for the team.'
                      : 'Add anything that might help us solve this.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {comments.map((comment) => {
                    const internal = comment.visibility === 'internal';

                    return (
                      <li
                        key={comment.id}
                        className={`px-5 py-4 ${internal ? 'bg-amber-50/50' : ''}`}
                      >
                        <div className="flex gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-200 text-[11px] font-semibold text-zinc-700">
                            {initials(comment.author.name)}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-[13px] font-medium text-zinc-900">
                                {comment.author.name}
                              </p>
                              <RolePill role={comment.author.role} />
                              <span aria-hidden="true" className="text-[11px] text-zinc-300">
                                ·
                              </span>
                              <time
                                dateTime={comment.createdAt}
                                className="text-[11.5px] text-zinc-500"
                              >
                                {formatDateTime(comment.createdAt)}
                              </time>
                              {internal && (
                                <span className="rounded-full border border-amber-200 bg-amber-100/80 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-800">
                                  Internal note
                                </span>
                              )}
                            </div>

                            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

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
                  placeholder={
                    isStaff
                      ? isInternal
                        ? 'Write a note that only the team can see…'
                        : 'Write a reply to the customer…'
                      : 'Write a message to the support team…'
                  }
                  className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
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
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MessageIcon className="size-4" />
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
                <section aria-labelledby="properties-heading" className={cardClasses}>
                  <div className={`${cardHeaderClasses} flex items-center justify-between gap-3`}>
                    <h2
                      id="properties-heading"
                      className="text-[13.5px] font-semibold text-zinc-900"
                    >
                      Properties
                    </h2>
                    <span aria-live="polite" className="text-[11px] text-zinc-500">
                      {updateTicket.isPending && 'Saving…'}
                    </span>
                  </div>

                  <div className="space-y-3.5 px-5 py-4">
                    {updateError && <ErrorBox message={updateError} />}

                    <SelectField
                      id="ticket-status"
                      label="Status"
                      value={ticket.status}
                      disabled={updateTicket.isPending}
                      onChange={(value) => updateTicket.mutate({ status: value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>

                    <div className="grid grid-cols-2 gap-3">
                      <SelectField
                        id="ticket-priority"
                        label="Priority"
                        value={ticket.priority}
                        disabled={updateTicket.isPending}
                        onChange={(value) => updateTicket.mutate({ priority: value })}
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>

                      <SelectField
                        id="ticket-category"
                        label="Category"
                        value={ticket.category}
                        disabled={updateTicket.isPending}
                        onChange={(value) => updateTicket.mutate({ category: value })}
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    <SelectField
                      id="ticket-assignee"
                      label="Assigned to"
                      value={ticket.assigneeId || ''}
                      disabled={updateTicket.isPending || staffQuery.isLoading}
                      onChange={(value) => updateTicket.mutate({ assigneeId: value || null })}
                    >
                      <option value="">Nobody</option>
                      {staff.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                          {person.id === user.id ? ' (you)' : ''}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </section>

                <section aria-labelledby="suggestion-heading" className={cardClasses}>
                  <div className={cardHeaderClasses}>
                    <h2
                      id="suggestion-heading"
                      className="text-[13.5px] font-semibold text-zinc-900"
                    >
                      AI suggestion
                    </h2>
                    <p className="mt-0.5 text-[11.5px] leading-tight text-zinc-500">
                      Made when the ticket arrived
                    </p>
                  </div>

                  <div className="px-5 py-4">
                    {!suggestion ? (
                      <p className="text-[12.5px] leading-relaxed text-zinc-500">
                        No suggestion for this ticket.
                      </p>
                    ) : (
                      <>
                        {ticket.needsReview && (
                          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px] leading-snug text-amber-800">
                            Needs review by a person.
                          </div>
                        )}

                        <dl className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                              Category
                            </dt>
                            <dd className="mt-1 text-[13px] text-zinc-800">
                              {CATEGORY_LABELS[suggestion.category] ?? suggestion.category}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                              Priority
                            </dt>
                            <dd className="mt-1.5">
                              <PriorityBadge priority={suggestion.priority} />
                            </dd>
                          </div>
                        </dl>

                        {ticket.aiReason && (
                          <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
                            {ticket.aiReason}
                          </p>
                        )}

                        {suggestionApplied ? (
                          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                            <CheckIcon className="size-3.5" />
                            Applied to this ticket
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              updateTicket.mutate({
                                category: suggestion.category,
                                priority: suggestion.priority,
                              })
                            }
                            disabled={updateTicket.isPending}
                            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckIcon className="size-3.5" />
                            Accept suggestion
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </section>

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
              <section aria-labelledby="details-heading" className={cardClasses}>
                <div className={cardHeaderClasses}>
                  <h2 id="details-heading" className="text-[13.5px] font-semibold text-zinc-900">
                    Details
                  </h2>
                </div>
                <dl className="divide-y divide-zinc-100 px-5">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[12.5px] text-zinc-500">Status</dt>
                    <dd>
                      <StatusBadge status={ticket.status} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[12.5px] text-zinc-500">Priority</dt>
                    <dd>
                      <PriorityBadge priority={ticket.priority} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[12.5px] text-zinc-500">Category</dt>
                    <dd className="text-[12.5px] font-medium text-zinc-700">
                      {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-[12.5px] text-zinc-500">Opened</dt>
                    <dd className="text-[12.5px] text-zinc-700">
                      <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
