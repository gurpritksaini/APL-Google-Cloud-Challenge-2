/**
 * HTTP client for the Grasp backend API.
 *
 * All functions throw an Error on failure — callers in useLearningSession.js
 * catch and map these to user-visible error messages.
 * Sentinel error strings ('INVALID_API_KEY', 'QUOTA_EXCEEDED') are used instead
 * of status codes so callers can handle them without inspecting HTTP details.
 */

const BASE = '/api';

/** Build standard JSON request headers, including the user-supplied Gemini API key. */
function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    // The backend reads this header to forward calls to the Gemini API.
    'X-API-Key': apiKey,
  };
}

/** Ping the backend health endpoint — used on app startup to confirm the server is reachable. */
export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

/** Create a new learning session for `topic` and return { session_id, topic }. */
export async function startSession(topic, apiKey) {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to start session (${res.status})`);
  }
  return res.json();
}

/** Fetch a session's metadata and conversation history by ID (used when resuming). */
export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to load session (${res.status})`);
  }
  return res.json();
}

/**
 * Send a user message to the tutor and return { reply, meta, session_id }.
 *
 * Throws sentinel strings for auth/quota errors so useLearningSession can
 * handle them with specific UI flows (redirect to setup, show quota message).
 */
export async function sendMessage(sessionId, topic, message, history, apiKey) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ session_id: sessionId, topic, message, history }),
  });

  // Use sentinel strings instead of status codes so callers stay decoupled from HTTP.
  if (res.status === 401) throw new Error('INVALID_API_KEY');
  if (res.status === 429) throw new Error('QUOTA_EXCEEDED');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Chat request failed (${res.status})`);
  }
  return res.json();
}
