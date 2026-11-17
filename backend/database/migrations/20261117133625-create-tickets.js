module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
      },
      category: {
        type: Sequelize.ENUM('billing', 'bug', 'feature_request', 'account', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      requester_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      assignee_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'id' },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tickets');
    await queryInterface.sequelize.query('DROP TYPE "enum_tickets_status";');
    await queryInterface.sequelize.query('DROP TYPE "enum_tickets_priority";');
    await queryInterface.sequelize.query('DROP TYPE "enum_tickets_category";');
  },
};
