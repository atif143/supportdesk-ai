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

// Calls our backend for a streamed answer. Returns the response itself,
// so the caller can read it piece by piece with response.body.getReader().
export async function apiStream(path: string, options: RequestInit = {}) {
  const response = await sendWithLogin(path, options);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong');
  }

  return response;
}
