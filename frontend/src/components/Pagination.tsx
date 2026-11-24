import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';

type PaginationProps = {
  page: number;
  limit: number; // how many tickets fit on one page
  total: number; // how many tickets there are in all
  isFetching: boolean;
  onPageChange: (page: number) => void;
};

const pageButtonClasses =
  'inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40';

// "Showing 1–20 of 57" with Previous and Next buttons, under the ticket list
export function Pagination({ page, limit, total, isFetching, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-zinc-500" aria-live="polite">
        {isFetching ? (
          'Updating…'
        ) : (
          <>
            Showing{' '}
            <span className="font-medium text-zinc-700">
              {first}–{last}
            </span>{' '}
            of <span className="font-medium text-zinc-700">{total.toLocaleString()}</span>
          </>
        )}
      </p>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={pageButtonClasses}
        >
          <RiArrowLeftSLine className="size-4" />
          Previous
        </button>

        <span className="text-xs text-zinc-500">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={pageButtonClasses}
        >
          Next
          <RiArrowRightSLine className="size-4" />
        </button>
      </div>
    </div>
  );
}
