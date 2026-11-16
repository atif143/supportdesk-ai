import dotenv from 'dotenv';

// 1. Read the .env file.
//    We look in the backend folder first, then in the main project folder.
dotenv.config({ path: ['.env', '../.env'], quiet: true });

// 2. Stop the app if an important setting is missing.
const requiredSettings = ['DATABASE_URL'];

for (const name of requiredSettings) {
  if (!process.env[name]) {
    console.error(`Missing setting "${name}" in the .env file`);
    process.exit(1);
  }
}

// 3. All our settings in one place. Other files import "env" from here.
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,
  DATABASE_URL: process.env.DATABASE_URL as string,
};
