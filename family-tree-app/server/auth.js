// Password hashing (scrypt, Node built-in) and cookie session management.
const crypto = require('crypto');

const SESSION_COOKIE = 'ft_session';
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year — stay signed in on this device
const RESET_CODE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESET_CODE_MAX_ATTEMPTS = 5;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 6-digit code an admin reads out to a family member to let them reset their own password.
function createResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function setSessionCookie(res, token) {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  RESET_CODE_TTL_MS,
  RESET_CODE_MAX_ATTEMPTS,
  hashPassword,
  verifyPassword,
  createToken,
  createResetCode,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
};
