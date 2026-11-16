import dotenv from 'dotenv';

// Read the .env file from the main project folder
dotenv.config({ path: '../.env' });

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  DATABASE_URL: process.env.DATABASE_URL || '',
};
