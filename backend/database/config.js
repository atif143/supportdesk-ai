require('dotenv').config({ path: '../.env' });

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
  },
};
