import { ReactNode } from 'react';
import { Ticket } from '../pages/TicketDetailPage';
import { cardClasses, cardHeaderClasses } from '../utils';
import { ErrorBox } from './ErrorBox';
import { ChevronDownIcon } from './icons';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from './TicketBadges';

type StaffMember = {
  id: string;
  name: string;
};

type TicketPropertiesCardProps = {
  ticket: Ticket;
  staff: StaffMember[];
  staffLoading: boolean;
  userId: string;
  isSaving: boolean;
  error: string;
  onUpdate: (changes: Record<string, string | null>) => void;
};

// Which status a ticket can move to from its current status (the server enforces this too)
const NEXT_STATUSES: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['waiting_on_customer', 'resolved'],
  waiting_on_customer: ['in_progress', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

const selectClasses =
  'h-9 w-full appearance-none rounded-lg border border-zinc-300 bg-white pl-2.5 pr-8 text-[13px] text-zinc-800 outline-none hover:border-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-60';

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

// The staff card with the 4 drop-downs: status, priority, category and who it is assigned to
export function TicketPropertiesCard({
  ticket,
  staff,
  staffLoading,
  userId,
  isSaving,
  error,
  onUpdate,
}: TicketPropertiesCardProps) {
  // The server only allows certain moves (open → in progress, and so on),
  // so the menu only offers the current status and the valid next ones.
  const nextStatuses = NEXT_STATUSES[ticket.status] || [];
  const statusOptions = STATUS_OPTIONS.filter(
    (option) => option.value === ticket.status || nextStatuses.includes(option.value),
  );

  return (
    <section aria-labelledby="properties-heading" className={cardClasses}>
      <div className={`${cardHeaderClasses} flex items-center justify-between gap-3`}>
        <h2 id="properties-heading" className="text-[13.5px] font-semibold text-zinc-900">
          Properties
        </h2>
        <span aria-live="polite" className="text-[11px] text-zinc-500">
          {isSaving && 'Saving…'}
        </span>
      </div>

      <div className="space-y-3.5 px-5 py-4">
        {error && <ErrorBox message={error} />}

        <SelectField
          id="ticket-status"
          label="Status"
          value={ticket.status}
          disabled={isSaving}
          onChange={(value) => onUpdate({ status: value })}
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
            disabled={isSaving}
            onChange={(value) => onUpdate({ priority: value })}
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
            disabled={isSaving}
            onChange={(value) => onUpdate({ category: value })}
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
          disabled={isSaving || staffLoading}
          onChange={(value) => onUpdate({ assigneeId: value || null })}
        >
          <option value="">Nobody</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
              {person.id === userId ? ' (you)' : ''}
            </option>
          ))}
        </SelectField>
      </div>
    </section>
  );
}
