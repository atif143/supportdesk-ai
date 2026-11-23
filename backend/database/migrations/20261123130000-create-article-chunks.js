// Small pieces ("chunks") of the help articles, each with its embedding.
// The AI search looks in this table to find the pieces that best match a question.
module.exports = {
  async up(queryInterface, Sequelize) {
    // pgvector adds the "vector" column type and the search operators
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    await queryInterface.createTable('article_chunks', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      // If the article is deleted, its chunks are deleted too
      article_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'articles', key: 'id' },
        onDelete: 'CASCADE',
      },
      // 0 for the first piece of the article, 1 for the next, and so on
      chunk_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });

    // Sequelize has no vector type, so we add this column with plain SQL.
    // 768 numbers, the same size as our embeddings.
    await queryInterface.sequelize.query(
      'ALTER TABLE article_chunks ADD COLUMN embedding vector(768) NOT NULL;',
    );

    // Makes "find the closest chunks" fast, even with many chunks
    await queryInterface.sequelize.query(
      'CREATE INDEX article_chunks_embedding_index ON article_chunks USING hnsw (embedding vector_cosine_ops);',
    );
  },

  async down(queryInterface) {
    // The vector extension is left installed. It does no harm and other tables could use it.
    await queryInterface.dropTable('article_chunks');
  },
};
