import express from 'express';

// Create the web server
const app = express();
const PORT = 4000;

// When someone opens http://localhost:4000/ , send back a message
app.get('/', (req, res) => {
  res.send('Hello from the SupportDesk AI backend!');
});

// Start the server and wait for requests
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
