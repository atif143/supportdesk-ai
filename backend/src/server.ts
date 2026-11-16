import express from 'express';
import { env } from './config';

// Create the web server
const app = express();

// When someone opens http://localhost:4000/ , send back a message
app.get('/', (req, res) => {
  res.send('Hello from the SupportDesk AI backend!');
});

// Start the server and wait for requests
app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
