import express from 'express';
import { env } from './config';
import { sequelize } from './db';
import { authRouter } from './routes/auth';

const app = express();

// Read JSON data sent by the browser
app.use(express.json());

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

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
