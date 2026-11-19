// Add the AI suggestion to each ticket.
// The real category and priority stay in their own columns (the human choice),
// so later we can compare the AI suggestion with what the agent chose.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tickets', 'ai_category', { type: Sequelize.STRING });
    await queryInterface.addColumn('tickets', 'ai_priority', { type: Sequelize.STRING });
    await queryInterface.addColumn('tickets', 'ai_reason', { type: Sequelize.TEXT });
    // true when the AI could not decide and a person must check the ticket
    await queryInterface.addColumn('tickets', 'needs_review', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tickets', 'ai_category');
    await queryInterface.removeColumn('tickets', 'ai_priority');
    await queryInterface.removeColumn('tickets', 'ai_reason');
    await queryInterface.removeColumn('tickets', 'needs_review');
  },
};
