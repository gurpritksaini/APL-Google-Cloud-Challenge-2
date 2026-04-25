const BASE = '/api';

function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

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

export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to load session (${res.status})`);
  }
  return res.json();
}

export async function sendMessage(sessionId, topic, message, history, apiKey) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ session_id: sessionId, topic, message, history }),
  });

  if (res.status === 401) throw new Error('INVALID_API_KEY');
  if (res.status === 429) throw new Error('QUOTA_EXCEEDED');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Chat request failed (${res.status})`);
  }
  return res.json();
}
