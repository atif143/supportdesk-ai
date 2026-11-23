import { makeChunks, saveChunks } from '../ai/articleChunks';
import { sequelize } from '../db';
import { Article } from '../models/article';

// Makes the chunks and vectors for every help article.
// Run it after seeding the articles:  npm run kb:reindex
async function reindexArticles() {
  const articles = await Article.findAll({ order: [['title', 'ASC']] });

  for (const article of articles) {
    const id = article.get('id') as string;
    const title = article.get('title') as string;

    const chunks = await makeChunks(title, article.get('body') as string);
    await sequelize.transaction((transaction) => saveChunks(id, chunks, transaction));

    console.log(`${chunks.length} chunk(s): ${title}`);
  }

  console.log(`Done. ${articles.length} articles indexed.`);
  await sequelize.close();
}

reindexArticles().catch(async (error) => {
  console.log('Reindex failed:', error.message);
  await sequelize.close();
  process.exit(1);
});
