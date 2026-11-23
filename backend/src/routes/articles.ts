import { Router } from 'express';
import { makeChunks, saveChunks } from '../ai/articleChunks';
import { sequelize } from '../db';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';
import { Article } from '../models/article';

export const articlesRouter = Router();

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 20000;

// Checks the title and body of an article. Returns an error message, or '' if they are fine.
function checkArticle(title: unknown, body: unknown) {
  if (typeof title !== 'string' || title.trim() === '') {
    return 'Title is required';
  }
  if (typeof body !== 'string' || body.trim() === '') {
    return 'Body is required';
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
  }
  if (body.length > MAX_BODY_LENGTH) {
    return `Body must be ${MAX_BODY_LENGTH} characters or fewer`;
  }
  return '';
}

// GET /api/articles  -> list all help articles, newest change first (agents and admins)
// The list leaves out the body to keep the answer small.
articlesRouter.get('/', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const articles = await Article.findAll({
    attributes: ['id', 'title', 'createdAt', 'updatedAt'],
    order: [['updatedAt', 'DESC']],
  });
  res.json(articles);
});

// GET /api/articles/:id  -> one article with its body (agents and admins)
articlesRouter.get('/:id', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const article = await Article.findByPk(req.params.id as string);

  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  res.json(article);
});

// Cut the article into chunks and get their vectors from the AI.
// Returns null if the AI failed. Then the caller saves nothing.
async function tryMakeChunks(title: string, body: string, userId: string) {
  try {
    return await makeChunks(title, body, userId);
  } catch (error) {
    console.log('Could not index article:', (error as Error).message);
    return null;
  }
}

const INDEX_ERROR = 'The article could not be prepared for AI search. Nothing was saved. Please try again.';

// POST /api/articles  -> create an article (admins only)
// The article and its chunks are saved together, so the AI search can use it at once.
articlesRouter.post('/', requireLogin, requireRole(['admin']), async (req, res) => {
  const { title, body } = req.body;
  const userId = res.locals.user.userId;

  const error = checkArticle(title, body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  // 1. Ask the AI first. If it fails, we stop before saving anything.
  const chunks = await tryMakeChunks(title.trim(), body.trim(), userId);
  if (!chunks) {
    res.status(502).json({ error: INDEX_ERROR });
    return;
  }

  // 2. Save the article and its chunks in one transaction (all or nothing)
  const article = await sequelize.transaction(async (transaction) => {
    const newArticle = await Article.create(
      { title: title.trim(), body: body.trim(), createdBy: userId },
      { transaction },
    );
    await saveChunks(newArticle.get('id') as string, chunks, transaction);
    return newArticle;
  });

  res.status(201).json(article);
});

// PUT /api/articles/:id  -> change the title and body of an article (admins only)
articlesRouter.put('/:id', requireLogin, requireRole(['admin']), async (req, res) => {
  const { title, body } = req.body;

  const error = checkArticle(title, body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const article = await Article.findByPk(req.params.id as string);
  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  // The text changed, so the old chunks are wrong. Make new ones first.
  const chunks = await tryMakeChunks(title.trim(), body.trim(), res.locals.user.userId);
  if (!chunks) {
    res.status(502).json({ error: INDEX_ERROR });
    return;
  }

  // Save the new text and replace the chunks together
  await sequelize.transaction(async (transaction) => {
    await article.update({ title: title.trim(), body: body.trim() }, { transaction });
    await saveChunks(article.get('id') as string, chunks, transaction);
  });

  res.json(article);
});

// DELETE /api/articles/:id  -> delete an article (admins only)
// Its chunks are deleted by the database too (ON DELETE CASCADE).
articlesRouter.delete('/:id', requireLogin, requireRole(['admin']), async (req, res) => {
  const article = await Article.findByPk(req.params.id as string);

  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  await article.destroy();
  res.status(204).end();
});
