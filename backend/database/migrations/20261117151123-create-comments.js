module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      visibility: {
        type: Sequelize.ENUM('public', 'internal'),
        allowNull: false,
        defaultValue: 'public',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });

    // Makes "all comments of one ticket, in order" fast
    await queryInterface.addIndex('comments', ['ticket_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comments');
    await queryInterface.sequelize.query('DROP TYPE "enum_comments_visibility";');
  },
};
