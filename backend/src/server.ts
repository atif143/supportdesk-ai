import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config';
import { sequelize } from './db';
import { authRouter } from './routes/auth';
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

// User management routes (admins only)
app.use('/api/users', usersRouter);

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
