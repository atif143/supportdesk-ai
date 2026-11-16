import express from 'express';
import { env } from './config';
import { sequelize } from './db';

const app = express();

// Check if the server and the database are working
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
