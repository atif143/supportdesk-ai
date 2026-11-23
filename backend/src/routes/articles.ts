import { Router } from 'express';
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

// POST /api/articles  -> create an article (admins only)
articlesRouter.post('/', requireLogin, requireRole(['admin']), async (req, res) => {
  const { title, body } = req.body;

  const error = checkArticle(title, body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const article = await Article.create({
    title: title.trim(),
    body: body.trim(),
    createdBy: res.locals.user.userId,
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

  await article.update({ title: title.trim(), body: body.trim() });
  res.json(article);
});

// DELETE /api/articles/:id  -> delete an article (admins only)
articlesRouter.delete('/:id', requireLogin, requireRole(['admin']), async (req, res) => {
  const article = await Article.findByPk(req.params.id as string);

  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  await article.destroy();
  res.status(204).end();
});
