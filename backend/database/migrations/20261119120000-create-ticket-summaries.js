// Saved AI summaries, one per ticket.
// The row is deleted when a new comment arrives, so the next click makes a fresh summary.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_summaries', {
      // One summary per ticket, so the ticket id is the key.
      // If the ticket is deleted, its summary is deleted too.
      ticket_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      problem: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      sentiment: {
        type: Sequelize.STRING, // positive, neutral or negative
        allowNull: false,
      },
      draft_reply: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ticket_summaries');
  },
};
