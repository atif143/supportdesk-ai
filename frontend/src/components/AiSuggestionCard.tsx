import { Ticket } from '../pages/TicketDetailPage';
import { cardClasses, cardHeaderClasses, secondaryButtonClasses } from '../utils';
import { RiCheckLine } from '@remixicon/react';
import { CATEGORY_LABELS, PriorityBadge } from './TicketBadges';

type AiSuggestionCardProps = {
  ticket: Ticket;
  isSaving: boolean;
  onUpdate: (changes: Record<string, string | null>) => void;
};

// The category and priority the AI picked when the ticket arrived.
// Staff can accept them with one click.
export function AiSuggestionCard({ ticket, isSaving, onUpdate }: AiSuggestionCardProps) {
  const { aiCategory, aiPriority } = ticket;
  const applied = ticket.category === aiCategory && ticket.priority === aiPriority;

  return (
    <section aria-labelledby="suggestion-heading" className={cardClasses}>
      <div className={cardHeaderClasses}>
        <h2 id="suggestion-heading" className="text-[13.5px] font-semibold text-zinc-900">
          AI suggestion
        </h2>
        <p className="mt-0.5 text-[11.5px] leading-tight text-zinc-500">
          Made when the ticket arrived
        </p>
      </div>

      <div className="px-5 py-4">
        {!aiCategory || !aiPriority ? (
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
                  {CATEGORY_LABELS[aiCategory] ?? aiCategory}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Priority
                </dt>
                <dd className="mt-1.5">
                  <PriorityBadge priority={aiPriority} />
                </dd>
              </div>
            </dl>

            {ticket.aiReason && (
              <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">{ticket.aiReason}</p>
            )}

            {applied ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                <RiCheckLine className="size-3.5" />
                Applied to this ticket
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onUpdate({ category: aiCategory, priority: aiPriority })}
                disabled={isSaving}
                className={`${secondaryButtonClasses} mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <RiCheckLine className="size-3.5" />
                Accept suggestion
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
