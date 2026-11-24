import { Link } from 'react-router-dom';
import { formatDate } from '../utils';
import { ChevronRightIcon } from './icons';
import { CATEGORY_LABELS, PriorityBadge, ReviewBadge, shortId, StatusBadge } from './TicketBadges';

export type TicketRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  needsReview?: boolean;
};

// The tickets on the list page: small cards on phones, a table on bigger screens
export function TicketList({ tickets }: { tickets: TicketRow[] }) {
  return (
    <>
      {/* Phones: a compact card per ticket */}
      <ul className="divide-y divide-zinc-100 md:hidden">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="relative p-4 active:bg-stone-50">
            <Link
              to={`/tickets/${ticket.id}`}
              className="block text-sm font-medium text-zinc-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {ticket.title}
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.needsReview && <ReviewBadge />}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] text-zinc-500">
              <span>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets and up: a full table */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Tickets</caption>
          <thead className="border-b border-zinc-200 bg-stone-50/70 text-[11px] uppercase tracking-[0.06em] text-zinc-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Ticket
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Priority
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                Category
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                Created
              </th>
              <th scope="col" className="w-10 py-3 pl-2 pr-5">
                <span className="sr-only">Open ticket</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="group relative hover:bg-stone-50/80">
                <td className="min-w-0 px-5 py-3.5">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    title={ticket.title}
                    className="block min-w-0 font-medium text-zinc-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <span className="block max-w-[380px] truncate">{ticket.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-500">#{shortId(ticket.id)}</span>
                    {ticket.needsReview && <ReviewBadge />}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3.5 text-[13px] text-zinc-600 lg:table-cell">
                  {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3.5 text-[13px] text-zinc-500 md:table-cell">
                  {formatDate(ticket.createdAt)}
                </td>
                <td className="py-3.5 pl-2 pr-5 text-right">
                  <ChevronRightIcon className="ml-auto size-4 text-zinc-300 group-hover:text-zinc-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
