// Database settings for sequelize-cli. It reads DATABASE_URL from the .env file.
require('dotenv').config({ path: '../.env', quiet: true });

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
  },
};
