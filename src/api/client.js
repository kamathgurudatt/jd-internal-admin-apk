import EncryptedStorage from 'react-native-encrypted-storage';

// Default URL — used only on first install. User can change in Settings.
const DEFAULT_URL = 'https://neon-solid-qualifications-armed.trycloudflare.com';

const KEYS = {
  BASE_URL: 'jd_base_url',
  TOKEN:    'jd_bearer_token',
  PIN:      'jd_pin_hash',
};

let _baseUrl = null;
let _token   = null;

// ── Credentials ───────────────────────────────────────────────────────────────
export async function loadCredentials() {
  _baseUrl = (await EncryptedStorage.getItem(KEYS.BASE_URL)) || DEFAULT_URL;
  _token   = await EncryptedStorage.getItem(KEYS.TOKEN);
  return !!_token;
}

export async function saveCredentials(url, token) {
  const clean = url.replace(/\/$/, '');
  await EncryptedStorage.setItem(KEYS.BASE_URL, clean);
  await EncryptedStorage.setItem(KEYS.TOKEN, token.trim());
  _baseUrl = clean;
  _token   = token.trim();
}

// Update URL only (without changing token)
export async function saveBaseUrl(url) {
  const clean = url.replace(/\/$/, '');
  await EncryptedStorage.setItem(KEYS.BASE_URL, clean);
  _baseUrl = clean;
}

// Update token only (without changing URL)
export async function saveToken(token) {
  await EncryptedStorage.setItem(KEYS.TOKEN, token.trim());
  _token = token.trim();
}

export async function savePin(pin) {
  await EncryptedStorage.setItem(KEYS.PIN, pin);
}

export async function verifyPin(pin) {
  const stored = await EncryptedStorage.getItem(KEYS.PIN);
  return stored === pin;
}

export async function hasPinSet() {
  return !!(await EncryptedStorage.getItem(KEYS.PIN));
}

export async function clearAll() {
  await EncryptedStorage.removeItem(KEYS.TOKEN);
  await EncryptedStorage.removeItem(KEYS.PIN);
  _token = null;
}

export function getBaseUrl() { return _baseUrl || DEFAULT_URL; }
export function getToken()   { return _token; }

// ── Core fetch ────────────────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  if (!_token) {
    throw Object.assign(new Error('Not configured'), { code: 'NOT_CONFIGURED' });
  }

  let resp;
  try {
    resp = await fetch(`${_baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (e) {
    throw Object.assign(new Error('Network error'), { code: 'NETWORK' });
  }

  if (resp.status === 401) {
    await EncryptedStorage.removeItem(KEYS.TOKEN);
    _token = null;
    throw Object.assign(new Error('Unauthorized'), { code: 'AUTH_FAILED' });
  }
  if (!resp.ok) {
    throw Object.assign(new Error(`HTTP ${resp.status}`), { code: 'HTTP_ERROR', status: resp.status });
  }
  return resp.json();
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const api = {
  get:    path         => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  delete: path         => apiFetch(path, { method: 'DELETE' }),
};
