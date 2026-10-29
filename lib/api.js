const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const TOKEN_KEY = 'fleetcall_token';

// ── Auth token (admin login) ────────────────────────────────

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export function logout() {
  setToken('');
  if (typeof window !== 'undefined') window.location.href = '/login';
}

function headers(extra = {}) {
  const t = getToken();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

// fetch wrapper: sends the token, and on 401 drops it and goes to /login.
async function call(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store', ...opts, headers: headers(opts.headers) });
  if (r.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    logout();
    throw new Error('login required');
  }
  return r;
}

async function json(path, opts, fallbackError) {
  const r = await call(path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || fallbackError);
  return data;
}

const send = (method, body) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, send('POST', { email, password }));
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'login failed');
  setToken(data.token);
  return data.user;
}

export async function me() {
  return (await json('/api/auth/me', {}, 'not logged in')).user;
}

// ── Campaigns ───────────────────────────────────────────────

export async function health() {
  const r = await fetch(`${BASE}/api/health`);
  if (!r.ok) throw new Error('backend unreachable');
  return r.json();
}

export async function listCampaigns() {
  return (await json('/api/campaigns', {}, 'failed to list campaigns')).campaigns;
}

export async function getCampaign(id) {
  return (await json(`/api/campaigns/${id}`, {}, 'campaign not found')).campaign;
}

export async function getRecords(id) {
  return (await json(`/api/campaigns/${id}/records`, {}, 'failed to load records')).records;
}

// Lines an offer campaign can call from: [{ pbx: 1, number }, { pbx: 2, number }?]
export async function getLines() {
  return (await json('/api/campaigns/lines', {}, 'failed to load lines')).lines;
}

export async function createCampaign({ type, name, file, offerText, pbx }) {
  const fd = new FormData();
  fd.append('type', type);
  if (name) fd.append('name', name);
  if (offerText) fd.append('offer_text', offerText);
  if (pbx) fd.append('pbx', pbx);
  fd.append('file', file);
  // don't set content-type; browser sets multipart boundary
  return json('/api/campaigns', { method: 'POST', body: fd }, 'upload failed');
}

// Speak the offer text via ElevenLabs on the server; resolves with the mp3 Blob.
export async function previewOffer(text) {
  const r = await call('/api/campaigns/offer-preview', send('POST', { text }));
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || 'preview failed');
  }
  return r.blob();
}

export async function cancelCampaign(id) {
  return json(`/api/campaigns/${id}/cancel`, { method: 'POST' }, 'cancel failed');
}

export async function pauseCampaign(id) {
  return json(`/api/campaigns/${id}/pause`, { method: 'POST' }, 'pause failed');
}

export async function resumeCampaign(id) {
  return json(`/api/campaigns/${id}/resume`, { method: 'POST' }, 'resume failed');
}

export async function deleteCampaign(id) {
  return json(`/api/campaigns/${id}`, { method: 'DELETE' }, 'delete failed');
}

export async function downloadResults(id, type) {
  const r = await call(`/api/campaigns/${id}/download`);
  if (!r.ok) throw new Error('download failed');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_${id}_results.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── PBX: extensions, ring groups, inbound route ────────────
// `base` picks the PBX: '/api/pbx' (main trunk) or '/api/pbx2' (PBX-2 trunk).

export async function getPbx(base = '/api/pbx') {
  return json(base, {}, 'failed to load PBX');
}

export const createExtension = (base, body) => json(`${base}/extensions`, send('POST', body), 'create failed');
export const updateExtension = (base, id, body) => json(`${base}/extensions/${id}`, send('PUT', body), 'update failed');
export const deleteExtension = (base, id) => json(`${base}/extensions/${id}`, { method: 'DELETE' }, 'delete failed');

export const createRingGroup = (base, body) => json(`${base}/ring-groups`, send('POST', body), 'create failed');
export const updateRingGroup = (base, id, body) => json(`${base}/ring-groups/${id}`, send('PUT', body), 'update failed');
export const deleteRingGroup = (base, id) => json(`${base}/ring-groups/${id}`, { method: 'DELETE' }, 'delete failed');

export const setInbound = (base, body) => json(`${base}/inbound`, send('PUT', body), 'save failed');
