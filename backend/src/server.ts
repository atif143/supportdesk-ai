import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config';
import { sequelize } from './db';
import { articlesRouter } from './routes/articles';
import { authRouter } from './routes/auth';
import { commentsRouter } from './routes/comments';
import { summaryRouter } from './routes/summary';
import { ticketsRouter } from './routes/tickets';
import { usersRouter } from './routes/users';

const app = express();

// Read JSON data sent by the browser
app.use(express.json());

// Read cookies sent by the browser
app.use(cookieParser());

// Check if the server and the database are working
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

// Login and register routes
app.use('/api/auth', authRouter);

// User routes
app.use('/api/users', usersRouter);

// Ticket and comment routes
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets', commentsRouter);
app.use('/api/tickets', summaryRouter);

// Help article routes (the knowledge base)
app.use('/api/articles', articlesRouter);

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
