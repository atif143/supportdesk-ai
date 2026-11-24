import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { api, getLoginToken } from './api';

// One real-time (WebSocket) connection for the whole website.
// autoConnect: false -> App.tsx connects after login and disconnects on logout.
// auth is a function, so every new connection sends the newest login token.
export const socket = io({
  autoConnect: false,
  auth: (sendAuth) => sendAuth({ token: getLoginToken() }),
});

// The login token lasts 15 minutes. If the connection drops and comes back later,
// the old token may be expired and the server says no. A normal API call gets a
// new token (api() does that by itself), then we try to connect again.
socket.on('connect_error', () => {
  setTimeout(async () => {
    try {
      await api('/auth/me');
      socket.connect();
    } catch {
      // The user is not logged in any more. Nothing to do.
    }
  }, 2000);
});

// Use this on the ticket page: when someone else changes the ticket or adds a comment,
// load it again, so the change shows without a page refresh.
export function useTicketUpdates(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) {
      return;
    }

    // Follow this ticket. After a reconnect the server forgets it, so follow it again.
    function follow() {
      socket.emit('ticket:join', ticketId);
    }
    function reloadTicket() {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    }
    function reloadComments() {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] });
    }

    follow();
    socket.on('connect', follow);
    socket.on('ticket:changed', reloadTicket);
    socket.on('comment:added', reloadComments);

    // When the user leaves the page: stop following and stop listening
    return () => {
      socket.emit('ticket:leave', ticketId);
      socket.off('connect', follow);
      socket.off('ticket:changed', reloadTicket);
      socket.off('comment:added', reloadComments);
    };
  }, [ticketId, queryClient]);
}

// Use this on the ticket list: when a ticket is created or changed, load the list again
export function useTicketListUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function reloadList() {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    }

    socket.on('tickets:changed', reloadList);
    return () => {
      socket.off('tickets:changed', reloadList);
    };
  }, [queryClient]);
}
