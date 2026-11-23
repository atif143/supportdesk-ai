import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AppLayout } from '../components/AppLayout';
import { AlertIcon, ArrowLeftIcon } from '../components/icons';

type Article = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

// Shows one help article. The sources under an AI answer link here.
export function ArticlePage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['article', id],
    queryFn: () => api(`/articles/${id}`),
  });
  const article = data as Article | undefined;

  // Admins came from the knowledge base list, agents from a ticket
  const backLink = user.role === 'admin' ? '/articles' : '/';
  const backText = user.role === 'admin' ? 'Back to knowledge base' : 'Back to tickets';

  return (
    <AppLayout user={user} onLogout={onLogout}>
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to={backLink}
          className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900"
        >
          <ArrowLeftIcon className="size-4" />
          {backText}
        </Link>

        {isLoading && <p className="mt-6 text-sm text-zinc-500">Loading article…</p>}

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Could not load this article</p>
              <p className="mt-0.5 text-[13px] text-red-700">{error.message}</p>
            </div>
          </div>
        )}

        {article && (
          <article className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(24,24,27,0.04)] sm:p-8">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">Help article</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-zinc-900">{article.title}</h1>
            <p className="mt-1 text-[12.5px] text-zinc-500">
              Last updated {new Date(article.updatedAt).toLocaleDateString()}
            </p>
            <p className="mt-6 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-700">{article.body}</p>
          </article>
        )}
      </div>
    </AppLayout>
  );
}
