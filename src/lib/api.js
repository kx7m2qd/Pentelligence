const runtimeConfig = window.__PENTELLIGENCE_CONFIG__ || {};
const API_BASE = (runtimeConfig.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const WORKSPACE_KEY = 'pentelligence.workspace-token';
const ACCESS_KEY = 'pentelligence.access-token';

async function request(path, init = {}) {
  const headers = new Headers(init.headers || {});
  const accessToken = localStorage.getItem(ACCESS_KEY);
  if (accessToken && !headers.has('x-access-token')) headers.set('x-access-token', accessToken);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function getAccessStatus() {
  const response = await request('/auth/status');
  if (!response.ok) {
    if (response.status === 429) throw new Error('Access service is busy. Wait a moment and try again.');
    throw new Error('Unable to verify application access');
  }
  return response.json();
}

export async function login(password) {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.error || 'Sign in failed');
  if (payload.accessToken) localStorage.setItem(ACCESS_KEY, payload.accessToken);
  return payload;
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' });
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
}

export async function ensureWorkspace() {
  let token = localStorage.getItem(WORKSPACE_KEY);
  if (!token) {
    const response = await request('/session', { method: 'POST' });
    const payload = await response.json();
    token = payload.workspaceToken;
    localStorage.setItem(WORKSPACE_KEY, token);
  }
  return token;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});

  const workspaceToken = await ensureWorkspace();
  headers.set('x-workspace-token', workspaceToken);
  const accessToken = localStorage.getItem(ACCESS_KEY);
  if (accessToken) headers.set('x-access-token', accessToken);

  const response = await request(path, {
    ...init,
    headers,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return payload;
}

export function apiGet(path) {
  return apiFetch(path);
}

export function apiPost(path, body) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

export function apiPatch(path, body) {
  return apiFetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function apiStream(path, onEvent, signal) {
  const headers = new Headers({ Accept: 'text/event-stream' });
  headers.set('x-workspace-token', await ensureWorkspace());
  const accessToken = localStorage.getItem(ACCESS_KEY);
  if (accessToken) headers.set('x-access-token', accessToken);
  const response = await request(path, { headers, signal });
  if (!response.ok || !response.body) throw new Error(`Unable to open scan stream (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let data = [];
  const dispatch = () => {
    if (!data.length) return;
    let payload = data.join('\n');
    try { payload = JSON.parse(payload); } catch { /* plain text event */ }
    onEvent({ event: eventName, data: payload });
    eventName = 'message';
    data = [];
  };
  while (!signal?.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) dispatch();
      else if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
  }
}
