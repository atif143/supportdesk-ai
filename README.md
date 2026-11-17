# SupportDesk AI

A customer support ticket app where an AI assistant helps support agents.

This README grows step by step as the project is built.

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate -w backend
npm run db:seed -w backend
npm run dev -w backend
npm run dev -w frontend
```

Open http://localhost:5173

## Demo logins

The seed creates one user for each role and 10,000 demo tickets.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | password123 |
| Agent | agent@example.com | password123 |
| Customer | customer@example.com | password123 |
