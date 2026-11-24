import { Ticket } from '../pages/TicketDetailPage';
import { cardClasses, cardHeaderClasses, formatDateTime } from '../utils';
import { CATEGORY_LABELS, PriorityBadge, StatusBadge } from './TicketBadges';

// The read-only facts about a ticket. Customers see this instead of the drop-downs.
export function TicketDetailsCard({ ticket }: { ticket: Ticket }) {
  return (
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
  );
}
