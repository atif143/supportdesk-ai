import express from 'express';
import { env } from './config';
import { sequelize } from './db';

// Create the web server
const app = express();

// When someone opens http://localhost:4000/ , send back a message
app.get('/', (req, res) => {
  res.send('Hello from the SupportDesk AI backend!');
});

// Health check: tells us if the server and the database are working
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate(); // try to talk to the database
    res.json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

// Start the server and wait for requests
app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
