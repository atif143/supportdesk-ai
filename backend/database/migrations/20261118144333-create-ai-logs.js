module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_logs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      // Who asked. Empty for automatic jobs. If the user is deleted, keep the log.
      user_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      feature: {
        type: Sequelize.STRING, // for example "classify" or "summary"
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      input_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      output_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      latency_ms: {
        type: Sequelize.INTEGER, // how long the call took
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('success', 'error'),
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_logs');
    await queryInterface.sequelize.query('DROP TYPE "enum_ai_logs_status";');
  },
};
