import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { embedTexts } from './askAi';

// One chunk found by the search
export type FoundChunk = {
  articleId: string;
  title: string;
  content: string;
  similarity: number; // 1 = same meaning, 0 = nothing in common
};

// Find the chunks whose meaning is closest to the question.
// k = how many chunks to return.
export async function searchChunks(question: string, k: number, userId: string | null = null) {
  // 1. Turn the question into numbers, the same way the chunks were
  const [vector] = await embedTexts([question], userId);

  // 2. Ask pgvector for the closest chunks.
  //    "<=>" is the cosine distance: 0 = same direction (same meaning), bigger = less alike.
  //    So similarity = 1 - distance.
  const chunks = await sequelize.query<FoundChunk>(
    `SELECT article_chunks.article_id AS "articleId",
            articles.title AS "title",
            article_chunks.content AS "content",
            1 - (article_chunks.embedding <=> CAST(:vector AS vector)) AS "similarity"
     FROM article_chunks
     JOIN articles ON articles.id = article_chunks.article_id
     ORDER BY article_chunks.embedding <=> CAST(:vector AS vector)
     LIMIT :k`,
    {
      replacements: { vector: JSON.stringify(vector), k },
      type: QueryTypes.SELECT,
    },
  );

  return chunks;
}
