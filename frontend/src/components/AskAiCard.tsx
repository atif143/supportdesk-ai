import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiStream } from '../api';
import { cardClasses } from '../utils';
import { ErrorBox } from './ErrorBox';
import { AlertIcon, MessageIcon, SendIcon, XIcon } from './icons';

type Source = {
  articleId: string;
  title: string;
  link: string;
};

const MAX_QUESTION_LENGTH = 500;

// Gemini marks bold text with **like this**. We show plain text, so we remove the stars.
function plainText(text: string) {
  return text.replaceAll('**', '');
}

// Ask a question about the help articles. The answer appears while the AI writes it.
export function AskAiCard({ onUseReply }: { onUseReply: (reply: string) => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stopped, setStopped] = useState(false);

  // Lets the Stop button cancel the request
  const controllerRef = useRef<AbortController | null>(null);

  // If the user leaves the page while the answer is coming, stop it
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || streaming) {
      return;
    }

    setAnswer('');
    setSources([]);
    setError('');
    setStopped(false);
    setStreaming(true);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await apiStream('/kb/ask', {
        method: 'POST',
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      // Read the answer piece by piece. Each event looks like:
      //   event: text
      //   data: "some words"
      //   (empty line)
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // the last event may not be complete yet

        for (const block of events) {
          const [eventLine, dataLine] = block.split('\n');
          const name = eventLine.replace('event: ', '');
          const data = JSON.parse(dataLine.replace('data: ', ''));

          if (name === 'text') {
            setAnswer((current) => current + data);
          }
          if (name === 'sources') {
            setSources(data);
          }
          if (name === 'error') {
            setError(data.error);
          }
        }
      }
    } catch (err) {
      // Pressing Stop also ends up here. That is not an error to show.
      if (!controller.signal.aborted) {
        setError((err as Error).message);
      }
    }

    setStreaming(false);
  }

  function handleStop() {
    controllerRef.current?.abort();
    setStopped(true);
  }

  const canUseAnswer = !streaming && !error && !stopped && sources.length > 0;

  return (
    <section aria-labelledby="ask-ai-heading" className={cardClasses}>
      <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-[10px] font-semibold tracking-[0.04em] text-white"
        >
          AI
        </span>
        <div className="min-w-0">
          <h2 id="ask-ai-heading" className="text-[13.5px] font-semibold leading-tight text-zinc-900">
            Ask the knowledge base
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-tight text-zinc-500">Answers from our help articles</p>
        </div>
      </div>

      <div className="px-5 py-4">
        <form onSubmit={handleAsk}>
          <label htmlFor="ask-ai-question" className="sr-only">
            Your question
          </label>
          <textarea
            id="ask-ai-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="How do customers change their billing email?"
            disabled={streaming}
            className="w-full resize-y rounded-lg border border-zinc-300 bg-stone-50 px-3 py-2 text-[13px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60"
          />

          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              <XIcon className="size-4" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!question.trim()}
              className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon className="size-4" />
              Ask
            </button>
          )}
        </form>

        {error && <ErrorBox message={error} className="mt-4" />}

        {/* The answer, growing while the AI writes it */}
        {(answer || streaming) && (
          <div className="mt-4" aria-live="polite" aria-busy={streaming}>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">Answer</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
              {plainText(answer)}
            </p>

            {stopped && <p className="mt-2 text-[11.5px] text-zinc-500">Stopped. The answer is not complete.</p>}

            {sources.length > 0 && (
              <div className="mt-3">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">Sources</p>
                <ul className="mt-1.5 space-y-1">
                  {sources.map((source) => (
                    <li key={source.articleId}>
                      <Link
                        to={source.link}
                        target="_blank"
                        className="text-[12.5px] font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                      >
                        {source.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canUseAnswer && (
              <button
                type="button"
                onClick={() => onUseReply(plainText(answer))}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-[13px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <MessageIcon className="size-4" />
                Use in reply
              </button>
            )}

            {!streaming && (
              <p className="mt-4 flex items-start gap-1.5 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
                <AlertIcon className="mt-px size-3.5 shrink-0 text-zinc-400" />
                AI-generated answer from help articles. Check it before sending.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
