import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AppLayout } from '../components/AppLayout';
import { BackLink } from '../components/BackLink';
import { ErrorBox } from '../components/ErrorBox';
import { cardClasses, formatDate } from '../utils';

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
        <BackLink to={backLink} label={backText} />

        {isLoading && <p className="mt-6 text-sm text-zinc-500">Loading article…</p>}

        {error && <ErrorBox title="Could not load this article" message={error.message} className="mt-6" />}

        {article && (
          <article className={`mt-4 p-6 sm:p-8 ${cardClasses}`}>
            <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">Help article</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-zinc-900">{article.title}</h1>
            <p className="mt-1 text-[12.5px] text-zinc-500">
              Last updated {formatDate(article.updatedAt)}
            </p>
            <p className="mt-6 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-700">{article.body}</p>
          </article>
        )}
      </div>
    </AppLayout>
  );
}
