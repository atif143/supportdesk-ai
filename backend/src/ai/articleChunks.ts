import { Transaction } from 'sequelize';
import { sequelize } from '../db';
import { embedTexts } from './askAi';

// About 4 characters are 1 token, so 1,600 characters are about 400 tokens
// (the brief asks for chunks of 300 to 500 tokens).
const CHUNK_SIZE = 1600;

// Each new chunk starts with the last 200 characters of the chunk before it,
// so a sentence that is cut at the border is still complete in one of them.
const OVERLAP = 200;

type Chunk = {
  content: string;
  vector: number[];
};

// Cut a long text into pieces of at most CHUNK_SIZE characters.
// We cut between paragraphs when we can, so each piece stays readable.
function splitIntoChunks(text: string) {
  // 1. Split into paragraphs. A paragraph that is still too long is cut by size.
  const paragraphs: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    const trimmed = paragraph.trim();
    for (let start = 0; start < trimmed.length; start += CHUNK_SIZE) {
      paragraphs.push(trimmed.slice(start, start + CHUNK_SIZE));
    }
  }

  // 2. Add paragraphs to the current chunk until the next one does not fit
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current !== '' && current.length + paragraph.length > CHUNK_SIZE) {
      chunks.push(current);
      // Start the next chunk with the end of this one (the overlap), from a whole word
      const end = current.slice(-OVERLAP);
      current = end.slice(end.indexOf(' ') + 1);
    }
    current = current === '' ? paragraph : current + '\n\n' + paragraph;
  }

  if (current !== '') {
    chunks.push(current);
  }
  return chunks;
}

// Cut an article into chunks and get a vector for each one (this calls the AI).
// The title is put in front of each chunk before embedding, so a chunk keeps its topic.
export async function makeChunks(title: string, body: string, userId: string | null = null) {
  const pieces = splitIntoChunks(body);
  const vectors = await embedTexts(
    pieces.map((piece) => `${title}\n\n${piece}`),
    userId,
  );

  const chunks: Chunk[] = pieces.map((piece, index) => ({ content: piece, vector: vectors[index] }));
  return chunks;
}

// Replace the saved chunks of an article with new ones.
// Run it inside a transaction, so the article never ends up with half of its chunks.
export async function saveChunks(articleId: string, chunks: Chunk[], transaction: Transaction) {
  await sequelize.query('DELETE FROM article_chunks WHERE article_id = :articleId', {
    replacements: { articleId },
    transaction,
  });

  for (let index = 0; index < chunks.length; index++) {
    // pgvector reads a vector written like "[0.1,0.2,0.3]", which is what JSON.stringify gives
    await sequelize.query(
      `INSERT INTO article_chunks (article_id, chunk_index, content, embedding)
       VALUES (:articleId, :chunkIndex, :content, CAST(:embedding AS vector))`,
      {
        replacements: {
          articleId,
          chunkIndex: index,
          content: chunks[index].content,
          embedding: JSON.stringify(chunks[index].vector),
        },
        transaction,
      },
    );
  }
}
