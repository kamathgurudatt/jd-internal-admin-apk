import EncryptedStorage from 'react-native-encrypted-storage';

// ── Baked-in server URL — change this before building the APK ─────────────────
// TODO: Replace with your actual public endpoint before building
// e.g. 'https://abc123.trycloudflare.com' or 'https://jd-admin.yourdomain.com'
// ⚠️  172.29.137.139 is an intranet IP — only reachable inside the office network.
// For outside access, expose this via Cloudflare Tunnel or ngrok and replace with the public URL.
export const BASE_URL = 'http://172.29.137.139:8080';

const KEYS = {
  TOKEN: 'jd_bearer_token',
  PIN:   'jd_pin_hash',
};

let _token = null;

export async function loadCredentials() {
  _token = await EncryptedStorage.getItem(KEYS.TOKEN);
  return !!_token;
}

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
  const p = await EncryptedStorage.getItem(KEYS.PIN);
  return !!p;
}

export async function clearAll() {
  await EncryptedStorage.removeItem(KEYS.TOKEN);
  await EncryptedStorage.removeItem(KEYS.PIN);
  _token = null;
}

export function getBaseUrl() { return BASE_URL; }
export function getToken()   { return _token; }

// ── Core fetch ────────────────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  if (!_token) {
    throw Object.assign(new Error('Not configured'), {code: 'NOT_CONFIGURED'});
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
    throw Object.assign(new Error('Network error'), {code: 'NETWORK'});
  }

  if (resp.status === 401) {
    await EncryptedStorage.removeItem(KEYS.TOKEN);
    _token = null;

    throw Object.assign(new Error('Unauthorized'), {code: 'AUTH_FAILED'});
  }
  if (!resp.ok) {
    throw Object.assign(new Error(`HTTP ${resp.status}`), {code: 'HTTP_ERROR', status: resp.status});
  }
  return resp.json();
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const api = {
  get:    path          => apiFetch(path),
  post:   (path, body)  => apiFetch(path, {method: 'POST',   body: JSON.stringify(body)}),
  delete: path          => apiFetch(path, {method: 'DELETE'}),
};
