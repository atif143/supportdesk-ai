// The login token, kept in memory while the website is open
let loginToken = '';

export function setLoginToken(token: string) {
  loginToken = token;
}

// The real-time connection (socket.ts) sends the token when it connects
export function getLoginToken() {
  return loginToken;
}

function send(path: string, options: RequestInit) {
  return fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginToken}`,
    },
  });
}

// Sends a request with the login token.
// If the token has expired, it gets a new one with the refresh cookie and tries once more.
async function sendWithLogin(path: string, options: RequestInit) {
  let response = await send(path, options);

  if (response.status === 401) {
    const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });
    if (refreshResponse.ok) {
      const { token } = await refreshResponse.json();
      setLoginToken(token);
      response = await send(path, options);
    }
  }

  return response;
}

// Calls our backend and returns the JSON answer
export async function api(path: string, options: RequestInit = {}) {
  const response = await sendWithLogin(path, options);

  // If the answer is not JSON (for example the server is down), use an empty object
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Calls our backend for a streamed answer (the AI answer that arrives word by word).
// For every event that arrives, it calls onEvent(name, data), for example ("text", "Hello").
// The server sends each event like this, with an empty line after it:
//   event: text
//   data: "some words"
export async function apiStream(
  path: string,
  options: RequestInit,
  onEvent: (name: string, data: any) => void,
) {
  const response = await sendWithLogin(path, options);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong');
  }

  // Read the answer piece by piece
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || ''; // the last event may not be complete yet

    for (const event of events) {
      const [eventLine, dataLine] = event.split('\n');
      onEvent(eventLine.replace('event: ', ''), JSON.parse(dataLine.replace('data: ', '')));
    }
  }
}
