import { Ticket } from '../models/ticket';
import { CATEGORIES, PRIORITIES } from '../utils/ticketOptions';
import { askAi } from './askAi';

const SYSTEM = `You sort support tickets.
Reply with only JSON in this shape:
{"category": "...", "priority": "...", "reason": "..."}
category must be one of: ${CATEGORIES.join(', ')}
priority must be one of: ${PRIORITIES.join(', ')}
reason is one short sentence.`;

// Turn the AI text into { category, priority, reason }, or null if the answer is not valid
function readAnswer(text: string) {
  // The AI sometimes adds extra text around the JSON, so keep only the part between { and }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    return null;
  }

  try {
    const answer = JSON.parse(text.slice(start, end + 1));

    if (!CATEGORIES.includes(answer.category)) {
      return null;
    }
    if (!PRIORITIES.includes(answer.priority)) {
      return null;
    }
    if (typeof answer.reason !== 'string' || answer.reason === '') {
      return null;
    }

    return { category: answer.category, priority: answer.priority, reason: answer.reason };
  } catch (error) {
    return null; // the text was not JSON
  }
}

// Ask the AI for a category and priority, and save its suggestion on the ticket.
// Try 2 times. If both fail, save "other / medium" and mark the ticket for review.
export async function classifyTicket(ticketId: string) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    return;
  }

  const prompt = `Title: ${ticket.get('title')}\nDescription: ${ticket.get('description')}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await askAi('classify', { system: SYSTEM, prompt }, ticket.get('requesterId') as string);
      const answer = readAnswer(result.text);

      if (answer) {
        ticket.set({
          aiCategory: answer.category,
          aiPriority: answer.priority,
          aiReason: answer.reason,
          needsReview: false,
        });
        await ticket.save();
        return;
      }
    } catch (error) {
      // The AI is down or gave an error. askAi already saved it in ai_logs. Try again.
    }
  }

  // Both tries failed
  ticket.set({
    aiCategory: 'other',
    aiPriority: 'medium',
    aiReason: 'The AI could not decide. Please check this ticket.',
    needsReview: true,
  });
  await ticket.save();
}
