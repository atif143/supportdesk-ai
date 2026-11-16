import { Sequelize } from 'sequelize';
import { env } from './config';

// The connection to our PostgreSQL database
export const sequelize = new Sequelize(env.DATABASE_URL, {
  logging: false, // don't print every SQL query in the terminal
});
