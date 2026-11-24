import { Ticket } from '../models/ticket';
import { CATEGORIES, PRIORITIES } from '../utils/ticketOptions';
import { askAi } from './askAi';
import { readJson } from './readJson';
import { sendTicketChangedForStaff, sendTicketListChangedForStaff } from '../realtime';

// The prompt, with a name and a version, so we can see which prompt made which answer
const CLASSIFY_PROMPT = {
  name: 'classify',
  version: 1,
  system: `You sort support tickets.
Reply with only JSON in this shape:
{"category": "...", "priority": "...", "reason": "..."}
category must be one of: ${CATEGORIES.join(', ')}
priority must be one of: ${PRIORITIES.join(', ')}
reason is one short sentence.`,
};

// Turn the AI text into { category, priority, reason }, or null if the answer is not valid
function readAnswer(text: string) {
  const answer = readJson(text);

  if (!answer) {
    return null;
  }
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
}

// Ask the AI for a suggestion. Try 2 times. Returns null if both tries fail.
async function askForSuggestion(prompt: string, userId: string) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await askAi(CLASSIFY_PROMPT.name, { system: CLASSIFY_PROMPT.system, prompt }, userId);
      const answer = readAnswer(result.text);
      if (answer) {
        return answer;
      }
    } catch (error) {
      // The AI is down or gave an error. askAi already saved it in ai_logs. Try again.
    }
  }
  return null;
}

// Ask the AI for a category and priority, and save its suggestion on the ticket.
// If the AI could not decide, save "other / medium" and mark the ticket for review.
export async function classifyTicket(ticketId: string) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    return;
  }

  const prompt = `Title: ${ticket.get('title')}\nDescription: ${ticket.get('description')}`;
  const answer = await askForSuggestion(prompt, ticket.get('requesterId') as string);

  if (answer) {
    ticket.set({
      aiCategory: answer.category,
      aiPriority: answer.priority,
      aiReason: answer.reason,
      needsReview: false,
    });
  } else {
    ticket.set({
      aiCategory: 'other',
      aiPriority: 'medium',
      aiReason: 'The AI could not decide. Please check this ticket.',
      needsReview: true,
    });
  }
  await ticket.save();

  // The AI suggestion is only for staff
  sendTicketChangedForStaff(ticketId);
  sendTicketListChangedForStaff();
}
