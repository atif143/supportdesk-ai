import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from './config';
import { findTicketForUser } from './utils/findTicketForUser';

// Real-time updates with WebSockets (Socket.IO).
//
// The browser keeps one connection open. When it opens a ticket, it joins that ticket's "room".
// When something changes on the ticket, the server sends a small message to the room,
// and the page loads the ticket again through the normal API.
//
// The message only says WHAT changed, never the data itself. The data always comes from
// the normal API, which checks the user's role. So a customer can never get an internal note
// or the AI fields through the socket.

export const io = new Server();

type LoginData = { userId: string; role: string };

// Every ticket has two rooms:
//   ticket:<id>        everyone allowed to see the ticket (its customer and all staff)
//   ticket:<id>:staff  agents and admins only (for internal notes and AI changes)
function ticketRoom(ticketId: string) {
  return `ticket:${ticketId}`;
}
function staffRoom(ticketId: string) {
  return `ticket:${ticketId}:staff`;
}

// 1. Only logged-in users can connect. The browser sends its login token when it connects.
io.use((socket, next) => {
  try {
    const user = jwt.verify(socket.handshake.auth.token, env.JWT_SECRET) as LoginData;
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Please log in first'));
  }
});

io.on('connection', (socket) => {
  const user: LoginData = socket.data.user;

  // For the ticket list: staff hear about every ticket, a customer only about their own
  if (user.role === 'customer') {
    socket.join(`user:${user.userId}`);
  } else {
    socket.join('staff');
  }

  // 2. The page asks to follow a ticket. We use the same check as the API,
  //    so a customer can only follow their own tickets.
  // "answer" (optional) tells the page if it worked.
  socket.on('ticket:join', async (ticketId: string, answer?: (ok: boolean) => void) => {
    try {
      const ticket = await findTicketForUser(ticketId, user.userId, user.role);
      if (!ticket) {
        answer?.(false);
        return;
      }

      socket.join(ticketRoom(ticketId));
      if (user.role !== 'customer') {
        socket.join(staffRoom(ticketId));
      }
      answer?.(true);
    } catch (error) {
      answer?.(false); // for example a broken ticket id
    }
  });

  // 3. The page stops following a ticket (the user left the page)
  socket.on('ticket:leave', (ticketId: string) => {
    socket.leave(ticketRoom(ticketId));
    socket.leave(staffRoom(ticketId));
  });
});

// Start the WebSocket server on the same port as the API
export function startRealtime(httpServer: HttpServer) {
  io.attach(httpServer);
}

// --- Messages the routes send when something changes ---

// The ticket's fields changed (status, priority, assignee, ...). Everyone on the ticket reloads it.
export function sendTicketChanged(ticketId: string) {
  io.to(ticketRoom(ticketId)).emit('ticket:changed', { ticketId });
}

// Only staff see this change (for example the AI suggestion). Only staff reload.
export function sendTicketChangedForStaff(ticketId: string) {
  io.to(staffRoom(ticketId)).emit('ticket:changed', { ticketId });
}

// A comment was added. Internal notes are only announced to staff.
export function sendCommentAdded(ticketId: string, visibility: string) {
  const room = visibility === 'internal' ? staffRoom(ticketId) : ticketRoom(ticketId);
  io.to(room).emit('comment:added', { ticketId });
}

// A ticket was created or its fields changed, so ticket lists are out of date.
// All staff reload their list, and so does the customer who owns the ticket.
export function sendTicketListChanged(requesterId: string) {
  io.to('staff').to(`user:${requesterId}`).emit('tickets:changed');
}

// A change only staff can see in the list (the AI "Needs review" badge)
export function sendTicketListChangedForStaff() {
  io.to('staff').emit('tickets:changed');
}
