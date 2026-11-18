import { Ticket } from '../models/ticket';

// Finds a ticket, but only if this user is allowed to see it.
// Customers can only see their own tickets.
// Returns null if the ticket does not exist or the user may not see it.
export async function findTicketForUser(ticketId: string, userId: string, role: string) {
  const ticket = await Ticket.findByPk(ticketId);

  if (!ticket) {
    return null;
  }
  if (role === 'customer' && ticket.get('requesterId') !== userId) {
    return null;
  }
  return ticket;
}
