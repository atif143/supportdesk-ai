import express from 'express';
import pinoHttp from 'pino-http';
import { env, logger } from './config';

// Create the web server
const app = express();

// Write one log line for every request
app.use(pinoHttp({ logger }));

// When someone opens http://localhost:4000/ , send back a message
app.get('/', (req, res) => {
  res.send('Hello from the SupportDesk AI backend!');
});

// Start the server and wait for requests
app.listen(env.PORT, () => {
  logger.info(`Server is running on http://localhost:${env.PORT}`);
});
