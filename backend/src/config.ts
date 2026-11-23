import dotenv from 'dotenv';

// Read the .env file from the main project folder
dotenv.config({ path: '../.env' });

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'mock',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  GEMINI_EMBED_MODEL: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
};
