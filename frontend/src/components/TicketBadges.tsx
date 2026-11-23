// Small coloured labels for a ticket. Used on the tickets list and the ticket page.

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  open: {
    label: 'Open',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    dot: 'bg-sky-500',
  },
  in_progress: {
    label: 'In progress',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  waiting_on_customer: {
    label: 'Waiting on customer',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },
  resolved: {
    label: 'Resolved',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  closed: {
    label: 'Closed',
    badge: 'border-zinc-200 bg-zinc-100 text-zinc-600',
    dot: 'bg-zinc-400',
  },
};

const PRIORITY_META: Record<string, { label: string; text: string; dot: string }> = {
  urgent: { label: 'Urgent', text: 'text-red-700', dot: 'bg-red-500' },
  high: { label: 'High', text: 'text-orange-700', dot: 'bg-orange-500' },
  medium: { label: 'Medium', text: 'text-zinc-600', dot: 'bg-amber-400' },
  low: { label: 'Low', text: 'text-zinc-500', dot: 'bg-zinc-300' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing',
  bug: 'Bug',
  feature_request: 'Feature request',
  account: 'Account',
  other: 'Other',
};

// The choices for the drop-down lists (value = what the server uses, label = what people see)
export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_customer', label: 'Waiting on customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const CATEGORY_OPTIONS = [
  { value: 'billing', label: 'Billing' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

// The first 8 letters of the id, for example #3F2A9C1B
export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    badge: 'border-zinc-200 bg-zinc-100 text-zinc-600',
    dot: 'bg-zinc-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${meta.badge}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] ?? {
    label: priority,
    text: 'text-zinc-600',
    dot: 'bg-zinc-300',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${meta.text}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function ReviewBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700">
      Needs review
    </span>
  );
}
