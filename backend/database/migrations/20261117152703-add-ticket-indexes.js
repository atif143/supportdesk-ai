// Indexes make the ticket list fast when filtering, sorting and searching
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('tickets', ['status']);
    await queryInterface.addIndex('tickets', ['priority']);
    await queryInterface.addIndex('tickets', ['category']);
    await queryInterface.addIndex('tickets', ['assignee_id']);
    await queryInterface.addIndex('tickets', ['requester_id']);
    await queryInterface.addIndex('tickets', ['created_at']);

    // Fast "title contains ..." search (needs the pg_trgm add-on)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query(
      'CREATE INDEX tickets_title_search ON tickets USING gin (title gin_trgm_ops);',
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('tickets', ['status']);
    await queryInterface.removeIndex('tickets', ['priority']);
    await queryInterface.removeIndex('tickets', ['category']);
    await queryInterface.removeIndex('tickets', ['assignee_id']);
    await queryInterface.removeIndex('tickets', ['requester_id']);
    await queryInterface.removeIndex('tickets', ['created_at']);
    await queryInterface.sequelize.query('DROP INDEX tickets_title_search;');
  },
};
