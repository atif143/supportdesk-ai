import { Comment } from '../models/comment';
import { TicketSummary } from '../models/ticketSummary';
import { User } from '../models/user';
import { askAi } from './askAi';
import { readJson } from './readJson';

const SENTIMENTS = ['positive', 'neutral', 'negative'];

// Long threads are cut so the AI request does not get too big (about 2,000 tokens)
const MAX_THREAD_LENGTH = 8000;

// The prompt, with a name and a version, so we can see which prompt made which answer
const SUMMARY_PROMPT = {
  name: 'summary',
  version: 1,
  system: `You help a support agent with a ticket.
Reply with only JSON in this shape:
{"summary": "...", "problem": "...", "sentiment": "...", "draftReply": "..."}
summary: what happened in the ticket, in 3 sentences or fewer.
problem: the customer's main problem, in one sentence.
sentiment: the customer's mood, one of: ${SENTIMENTS.join(', ')}
draftReply: a short, polite reply from the agent to the customer.`,
};

// Check the AI answer. Returns null if something is missing or wrong.
function readAnswer(text: string) {
  const answer = readJson(text);

  if (!answer) {
    return null;
  }
  if (typeof answer.summary !== 'string' || answer.summary === '') {
    return null;
  }
  if (typeof answer.problem !== 'string' || answer.problem === '') {
    return null;
  }
  if (!SENTIMENTS.includes(answer.sentiment)) {
    return null;
  }
  if (typeof answer.draftReply !== 'string' || answer.draftReply === '') {
    return null;
  }

  return {
    summary: answer.summary,
    problem: answer.problem,
    sentiment: answer.sentiment,
    draftReply: answer.draftReply,
  };
}

// Make (or reuse) the summary of a ticket.
export async function summarizeTicket(ticket: { id: string; title: string; description: string }, userId: string) {
  // 1. Already made and no new comment since then: reuse it, so the AI is not paid again
  const saved = await TicketSummary.findByPk(ticket.id);
  if (saved) {
    return saved;
  }

  // 2. Only public comments. Internal notes are never sent to the AI,
  //    because the draft reply goes to the customer.
  const comments = await Comment.findAll({
    where: { ticketId: ticket.id, visibility: 'public' },
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'author', attributes: ['name', 'role'] }],
  });

  let thread = comments
    .map((comment) => {
      const data = comment.toJSON();
      return `${data.author.name} (${data.author.role}): ${data.body}`;
    })
    .join('\n');

  // 3. Too long: keep only the newest part of the thread
  if (thread.length > MAX_THREAD_LENGTH) {
    thread = '(older messages were cut)\n' + thread.slice(-MAX_THREAD_LENGTH);
  }

  const prompt = `Title: ${ticket.title}
Description: ${ticket.description.slice(0, 2000)}
Comments:
${thread || '(no comments yet)'}`;

  // 4. Ask the AI and check the answer
  const result = await askAi(SUMMARY_PROMPT.name, { system: SUMMARY_PROMPT.system, prompt }, userId);
  const answer = readAnswer(result.text);

  if (!answer) {
    throw new Error('The AI answer was not valid');
  }

  // 5. Save it for next time.
  // "upsert" = add the row, or replace it if two clicks came at the same time
  const [summary] = await TicketSummary.upsert({ ticketId: ticket.id, ...answer });
  return summary;
}
