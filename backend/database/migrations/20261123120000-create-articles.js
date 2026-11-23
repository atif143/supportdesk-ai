module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('articles', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // The admin who wrote it. If that user is removed, keep the article.
      created_by: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
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
    await queryInterface.dropTable('articles');
  },
};
