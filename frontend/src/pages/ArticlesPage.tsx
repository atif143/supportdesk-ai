import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { User } from '../App';
import { AppLayout } from '../components/AppLayout';
import { ErrorBox } from '../components/ErrorBox';
import { PlusIcon } from '../components/icons';
import { cardClasses, formatDate, primaryButtonClasses } from '../utils';

type ArticleRow = {
  id: string;
  title: string;
  updatedAt: string;
};

const TITLE_LIMIT = 200;
const BODY_LIMIT = 20000;

const inputClasses =
  'w-full rounded-lg border border-zinc-300 bg-stone-50 px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60';

// The knowledge base (admins only): create, edit and delete help articles.
// The AI assistant answers questions from these articles.
export function ArticlesPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const queryClient = useQueryClient();

  // Which article the form is showing: null = no form, 'new' = a new article, or an article id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');

  const articlesQuery = useQuery({
    queryKey: ['articles'],
    queryFn: () => api('/articles'),
  });
  const articles: ArticleRow[] = articlesQuery.data || [];

  // Create or update. This can take a few seconds, because the AI prepares the article for search.
  const saveArticle = useMutation({
    mutationFn: () =>
      editingId === 'new'
        ? api('/articles', { method: 'POST', body: JSON.stringify({ title, body }) })
        : api(`/articles/${editingId}`, { method: 'PUT', body: JSON.stringify({ title, body }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', editingId] });
      closeForm();
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteArticle = useMutation({
    mutationFn: (id: string) => api(`/articles/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['articles'] }),
    onError: (err) => setListError(err.message),
  });

  function openNew() {
    setEditingId('new');
    setTitle('');
    setBody('');
    setFormError('');
  }

  // The list has no body, so load the full article first
  async function openEdit(id: string) {
    setFormError('');
    setListError('');
    try {
      const article = await api(`/articles/${id}`);
      setEditingId(id);
      setTitle(article.title);
      setBody(article.body);
    } catch (err) {
      setListError((err as Error).message);
    }
  }

  function closeForm() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setFormError('');
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFormError('Title and body are required');
      return;
    }
    setFormError('');
    saveArticle.mutate();
  }

  function handleDelete(article: ArticleRow) {
    if (window.confirm(`Delete "${article.title}"? The AI will stop using it.`)) {
      setListError('');
      deleteArticle.mutate(article.id);
    }
  }

  return (
    <AppLayout user={user} onLogout={onLogout}>
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900">Knowledge base</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Help articles that the AI assistant uses to answer questions.
            </p>
          </div>
          {editingId === null && (
            <button
              type="button"
              onClick={openNew}
              className={`${primaryButtonClasses} shrink-0`}
            >
              <PlusIcon className="size-4" />
              New article
            </button>
          )}
        </div>

        {/* The form for a new article, or for the article being edited */}
        {editingId !== null && (
          <form
            onSubmit={handleSave}
            noValidate
            className={`mt-6 p-5 sm:p-6 ${cardClasses}`}
          >
            <h2 className="text-sm font-semibold text-zinc-900">
              {editingId === 'new' ? 'New article' : 'Edit article'}
            </h2>

            {formError && <ErrorBox message={formError} className="mt-4" />}

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="article-title" className="mb-2 block text-[13px] font-medium text-zinc-700">
                  Title
                </label>
                <input
                  id="article-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={TITLE_LIMIT}
                  placeholder="How to change the billing email address"
                  disabled={saveArticle.isPending}
                  className={`h-11 ${inputClasses}`}
                />
              </div>

              <div>
                <label htmlFor="article-body" className="mb-2 block text-[13px] font-medium text-zinc-700">
                  Body
                </label>
                <textarea
                  id="article-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={12}
                  maxLength={BODY_LIMIT}
                  placeholder="Write the steps. Leave an empty line between paragraphs."
                  disabled={saveArticle.isPending}
                  className={`resize-y ${inputClasses}`}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saveArticle.isPending}
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-900 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveArticle.isPending}
                className={`${primaryButtonClasses} disabled:cursor-not-allowed disabled:bg-zinc-700`}
              >
                {saveArticle.isPending ? 'Saving and preparing for AI…' : 'Save article'}
              </button>
            </div>
          </form>
        )}

        {/* The list of articles */}
        <section className={`mt-6 ${cardClasses}`}>
          {listError && <ErrorBox message={listError} className="m-4" />}

          {articlesQuery.isLoading ? (
            <p className="px-5 py-6 text-sm text-zinc-500">Loading articles…</p>
          ) : articlesQuery.error ? (
            <ErrorBox title="Could not load articles" message={articlesQuery.error.message} className="m-4" />
          ) : articles.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-zinc-900">No articles yet</p>
              <p className="mt-1 text-sm text-zinc-500">Add the first help article for the AI assistant.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {articles.map((article) => (
                <li key={article.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <Link
                      to={`/articles/${article.id}`}
                      className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-zinc-500">
                      Updated {formatDate(article.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(article.id)}
                      disabled={saveArticle.isPending}
                      className="h-8 rounded-md px-2.5 text-[13px] font-medium text-zinc-700 hover:bg-stone-100 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(article)}
                      disabled={deleteArticle.isPending}
                      className="h-8 rounded-md px-2.5 text-[13px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
