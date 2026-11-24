import { formatDateTime, initials } from '../utils';
import { ErrorBox } from './ErrorBox';

export type Comment = {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  author: { name: string; role: string };
};

type CommentListProps = {
  comments: Comment[];
  isLoading: boolean;
  error?: string;
  isStaff: boolean;
};

function RolePill({ role }: { role: string }) {
  let label = 'Customer';
  if (role === 'agent') label = 'Agent';
  if (role === 'admin') label = 'Admin';

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

// The comments on a ticket, oldest first. Internal notes get a yellow background.
export function CommentList({ comments, isLoading, error, isStaff }: CommentListProps) {
  if (isLoading) {
    return <p className="px-5 py-5 text-[13px] text-zinc-500">Loading comments…</p>;
  }

  if (error) {
    return (
      <div className="px-5 py-5">
        <ErrorBox message={error} />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-[13px] font-medium text-zinc-700">No comments yet</p>
        <p className="mt-1 text-[12.5px] text-zinc-500">
          {isStaff
            ? 'Reply to the customer below, or leave a note for the team.'
            : 'Add anything that might help us solve this.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {comments.map((comment) => {
        const internal = comment.visibility === 'internal';

        return (
          <li key={comment.id} className={`px-5 py-4 ${internal ? 'bg-amber-50/50' : ''}`}>
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-200 text-[11px] font-semibold text-zinc-700">
                {initials(comment.author.name)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-[13px] font-medium text-zinc-900">{comment.author.name}</p>
                  <RolePill role={comment.author.role} />
                  <span aria-hidden="true" className="text-[11px] text-zinc-300">
                    ·
                  </span>
                  <time dateTime={comment.createdAt} className="text-[11.5px] text-zinc-500">
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
  );
}
