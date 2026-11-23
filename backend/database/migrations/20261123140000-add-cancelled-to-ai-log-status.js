// A streamed answer can be stopped by the user. We log that as "cancelled".
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_ai_logs_status" ADD VALUE 'cancelled';`);
  },

  // PostgreSQL cannot remove one value from a type, so we make the old type again
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE ai_logs SET status = 'error' WHERE status = 'cancelled';
      ALTER TYPE "enum_ai_logs_status" RENAME TO "enum_ai_logs_status_old";
      CREATE TYPE "enum_ai_logs_status" AS ENUM ('success', 'error');
      ALTER TABLE ai_logs ALTER COLUMN status TYPE "enum_ai_logs_status" USING status::text::"enum_ai_logs_status";
      DROP TYPE "enum_ai_logs_status_old";
    `);
  },
};
