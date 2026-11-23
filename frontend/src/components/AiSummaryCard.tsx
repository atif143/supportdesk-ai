import { useEffect, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, CopyIcon, MessageIcon } from './icons';

export type AiSummary = {
  summary: string;
  problem: string;
  sentiment: string;
  draftReply: string;
};

type AiSummaryCardProps = {
  data?: AiSummary;
  error?: string;
  isPending: boolean;
  onGenerate: () => void;
  onUseReply: (reply: string) => void;
};

// The summary calls the customer's mood "positive", "frustrated" and so on.
// We colour the badge to match, without making a negative mood look alarming.
function sentimentMeta(sentiment: string) {
  const value = sentiment.toLowerCase();
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown';

  if (/posi|happy|satisf|calm|pleas|relie/.test(value)) {
    return {
      label,
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    };
  }

  if (/frustrat|angry|upset|annoy|negat|unhappy|urgent|confus/.test(value)) {
    return {
      label,
      badge: 'border-amber-200 bg-amber-50 text-amber-800',
      dot: 'bg-amber-500',
    };
  }

  return {
    label,
    badge: 'border-zinc-200 bg-zinc-100 text-zinc-700',
    dot: 'bg-zinc-400',
  };
}

const secondaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900';

export function AiSummaryCard({
  data,
  error,
  isPending,
  onGenerate,
  onUseReply,
}: AiSummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  async function copyReply(reply: string) {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const mood = data ? sentimentMeta(data.sentiment) : null;

  return (
    <section
      aria-labelledby="ai-summary-heading"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-[10px] font-semibold tracking-[0.04em] text-white"
          >
            AI
          </span>
          <div className="min-w-0">
            <h2
              id="ai-summary-heading"
              className="text-[13.5px] font-semibold leading-tight text-zinc-900"
            >
              Summary
            </h2>
            <p className="mt-0.5 text-[11.5px] leading-tight text-zinc-500">
              Recap and draft reply
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4" aria-busy={isPending}>
        {isPending ? (
          <div role="status">
            <span className="sr-only">Summarizing the ticket…</span>
            <div aria-hidden="true" className="space-y-2">
              <div className="h-2.5 w-full animate-pulse rounded bg-stone-200/90" />
              <div className="h-2.5 w-10/12 animate-pulse rounded bg-stone-200/90" />
              <div className="h-2.5 w-7/12 animate-pulse rounded bg-stone-200/90" />
            </div>
            <div aria-hidden="true" className="mt-4 space-y-2 rounded-lg bg-stone-50 p-3">
              <div className="h-2 w-20 animate-pulse rounded bg-stone-200" />
              <div className="h-2.5 w-9/12 animate-pulse rounded bg-stone-200/80" />
              <div className="h-2 w-24 animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-20 animate-pulse rounded-full bg-stone-200/80" />
            </div>
            <div
              aria-hidden="true"
              className="mt-4 h-20 animate-pulse rounded-lg border border-dashed border-zinc-200 bg-stone-50"
            />
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className={`rounded-lg border border-red-200 bg-red-50 p-3 ${data ? 'mb-4' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <AlertIcon className="mt-px size-4 shrink-0 text-red-600" />
                  <div>
                    <p className="text-[12.5px] font-medium leading-snug text-red-800">
                      Could not create a summary
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {data ? (
              <div>
                <p className="text-[13px] leading-relaxed text-zinc-700">{data.summary}</p>

                <div className="mt-4 space-y-3 rounded-lg bg-stone-50 p-3.5">
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                      Main problem
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-700">
                      {data.problem}
                    </p>
                  </div>

                  {mood && (
                    <div>
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                        Customer mood
                      </p>
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${mood.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${mood.dot}`} />
                        {mood.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                      Draft reply
                    </p>
                    <button
                      type="button"
                      onClick={() => copyReply(data.draftReply)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900"
                    >
                      {copied ? (
                        <CheckIcon className="size-3.5 text-emerald-600" />
                      ) : (
                        <CopyIcon className="size-3.5" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-200 px-3 py-2.5 text-[12.5px] leading-relaxed text-zinc-700">
                    {data.draftReply}
                  </p>

                  <button
                    type="button"
                    onClick={() => onUseReply(data.draftReply)}
                    className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <MessageIcon className="size-4" />
                    Use this reply
                  </button>
                </div>

                <p className="mt-4 flex items-start gap-1.5 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
                  <AlertIcon className="mt-px size-3.5 shrink-0 text-zinc-400" />
                  Generated automatically. Check the details before sending.
                </p>
              </div>
            ) : error ? (
              <button
                type="button"
                onClick={onGenerate}
                className={`${secondaryButton} mt-3 w-full`}
              >
                Try again
              </button>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed text-zinc-600">
                  Turn this ticket into a short recap, its main problem, and a reply you can edit
                  before sending.
                </p>

                <button
                  type="button"
                  onClick={onGenerate}
                  className={`${secondaryButton} mt-3.5 w-full`}
                >
                  Summarize ticket
                </button>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
