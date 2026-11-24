import { useState } from 'react';
import { cardClasses, secondaryButtonClasses } from '../utils';
import { ErrorBox } from './ErrorBox';
import { RiChat3Line, RiCheckLine, RiErrorWarningLine, RiFileCopyLine } from '@remixicon/react';

type AiSummary = {
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

// The server sends one of three moods. Each gets its own badge colour.
const MOODS: Record<string, { label: string; badge: string; dot: string }> = {
  positive: { label: 'Positive', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  neutral: { label: 'Neutral', badge: 'border-zinc-200 bg-zinc-100 text-zinc-700', dot: 'bg-zinc-400' },
  negative: { label: 'Negative', badge: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
};

export function AiSummaryCard({
  data,
  error,
  isPending,
  onGenerate,
  onUseReply,
}: AiSummaryCardProps) {
  const [copied, setCopied] = useState(false);

  // Copy the draft reply, show "Copied" for 2 seconds, then show "Copy" again
  async function copyReply(reply: string) {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const mood = data ? MOODS[data.sentiment] : null;

  return (
    <section aria-labelledby="ai-summary-heading" className={cardClasses}>
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
          <p role="status" className="text-[13px] text-zinc-500">
            Summarizing the ticket…
          </p>
        ) : (
          <>
            {error && (
              <ErrorBox title="Could not create a summary" message={error} className={data ? 'mb-4' : ''} />
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
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900"
                    >
                      {copied ? (
                        <RiCheckLine className="size-3.5 text-emerald-600" />
                      ) : (
                        <RiFileCopyLine className="size-3.5" />
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
                    className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <RiChat3Line className="size-4" />
                    Use this reply
                  </button>
                </div>

                <p className="mt-4 flex items-start gap-1.5 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
                  <RiErrorWarningLine className="mt-px size-3.5 shrink-0 text-zinc-400" />
                  Generated automatically. Check the details before sending.
                </p>
              </div>
            ) : error ? (
              <button
                type="button"
                onClick={onGenerate}
                className={`${secondaryButtonClasses} mt-3 w-full`}
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
                  className={`${secondaryButtonClasses} mt-3.5 w-full`}
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
