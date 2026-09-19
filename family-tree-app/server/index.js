const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const { familyComponent } = require('./family');

const PORT = process.env.PORT || 4173;
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const DATA_URL_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readJsonBody(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function saveDataUrlToFile(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('Invalid image data');
  const mime = match[1];
  const ext = DATA_URL_EXT[mime];
  if (!ext) throw new Error('Unsupported image type: ' + mime);
  const buffer = Buffer.from(match[2], 'base64');
  const filename = crypto.randomUUID() + ext;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

const routes = [];
function route(method, pattern, handler, opts = {}) {
  // pattern like '/api/people/:id'
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1));
        return '([^/]+)';
      }) +
      '$'
  );
  routes.push({ method, regex, keys, handler, public: !!opts.public });
}

function resolveSession(req) {
  const cookies = auth.parseCookies(req);
  const token = cookies[auth.SESSION_COOKIE];
  if (!token) return { user: null, person: null };
  const session = db.findSession(token);
  if (!session) return { user: null, person: null };
  const user = db.findUserById(session.userId);
  if (!user) return { user: null, person: null };
  const person = db.getPeople().find((p) => p.id === user.personId) || null;
  return { user, person };
}

async function handleApi(req, res, pathname) {
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.regex.exec(pathname);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    const { user, person } = resolveSession(req);
    if (!r.public && !user) {
      sendJson(res, 401, { error: 'Not logged in' });
      return true;
    }
    req.user = user;
    req.person = person;
    try {
      await r.handler(req, res, params);
    } catch (err) {
      console.error(err);
      sendJson(res, err.status || 400, { error: err.message || 'Bad request' });
    }
    return true;
  }
  return false;
}

function requireOwnFamily(req, personId) {
  if (personId === req.person.id) return;
  const component = familyComponent(db.getRelationships(), req.person.id);
  if (!component.has(personId)) {
    throw Object.assign(new Error('That person is not in your family'), { status: 403 });
  }
}

function requireAdmin(req) {
  if (!req.user.isAdmin) {
    throw Object.assign(new Error('Only a family admin can do that'), { status: 403 });
  }
}

function publicUser(user) {
  return { id: user.id, username: user.username, isAdmin: !!user.isAdmin };
}

function makePerson(body) {
  const person = {
    id: crypto.randomUUID(),
    firstName: (body.firstName || '').trim(),
    lastName: (body.lastName || '').trim(),
    maidenName: (body.maidenName || '').trim(),
    gender: body.gender || '',
    birthDate: body.birthDate || '',
    deathDate: body.deathDate || '',
    birthPlace: body.birthPlace || '',
    notes: body.notes || '',
    photos: [],
    createdAt: new Date().toISOString(),
  };
  if (!person.firstName && !person.lastName) {
    throw new Error('A person needs at least a first or last name');
  }
  return person;
}

// ---- Auth routes (public) ----

route('GET', '/api/auth/me', async (req, res) => {
  sendJson(res, 200, { user: req.user && publicUser(req.user), person: req.person });
}, { public: true });

route('GET', '/api/auth/search-unclaimed', async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) return sendJson(res, 200, { people: [] });
  const claimedIds = new Set(db.getUsers().map((u) => u.personId));
  const matches = db.getPeople()
    .filter((p) => !claimedIds.has(p.id))
    .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
    .slice(0, 15)
    .map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate }));
  sendJson(res, 200, { people: matches });
}, { public: true });

function usernameTaken(username) {
  return !!db.findUserByUsername(username) || !!db.findJoinRequestByUsername(username);
}

route('POST', '/api/auth/register', async (req, res) => {
  const body = await readJsonBody(req);
  const username = (body.username || '').trim();
  const password = body.password || '';
  if (username.length < 3) throw new Error('Username must be at least 3 characters');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  if (usernameTaken(username)) throw new Error('That username is already taken');

  if (body.mode === 'claim') {
    const person = db.getPeople().find((p) => p.id === body.personId);
    if (!person) throw new Error('Person not found');
    if (db.findUserByPersonId(person.id)) throw new Error('That person already has an account');

    const request = {
      id: crypto.randomUUID(),
      personId: person.id,
      username,
      passwordHash: auth.hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.addJoinRequest(request);
    sendJson(res, 202, { status: 'pending', person: { firstName: person.firstName, lastName: person.lastName } });
    return;
  }

  const person = makePerson(body.person || {});
  db.addPerson(person);

  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash: auth.hashPassword(password),
    personId: person.id,
    isAdmin: true, // first to register for a new family tree administers it
    createdAt: new Date().toISOString(),
  };
  db.addUser(user);

  const token = auth.createToken();
  db.addSession({ token, userId: user.id, expiresAt: Date.now() + auth.SESSION_TTL_MS });
  auth.setSessionCookie(res, token);
  sendJson(res, 201, { user: publicUser(user), person });
}, { public: true });

route('POST', '/api/auth/login', async (req, res) => {
  const body = await readJsonBody(req);
  const user = db.findUserByUsername(body.username || '');
  if (!user || !auth.verifyPassword(body.password || '', user.passwordHash)) {
    throw Object.assign(new Error('Wrong username or password'), { status: 401 });
  }
  const token = auth.createToken();
  db.addSession({ token, userId: user.id, expiresAt: Date.now() + auth.SESSION_TTL_MS });
  auth.setSessionCookie(res, token);
  const person = db.getPeople().find((p) => p.id === user.personId) || null;
  sendJson(res, 200, { user: publicUser(user), person });
}, { public: true });

route('POST', '/api/auth/reset-password', async (req, res) => {
  const body = await readJsonBody(req);
  const user = db.findUserByUsername(body.username || '');
  const newPassword = body.newPassword || '';
  if (!user || !user.resetCode) {
    throw Object.assign(new Error('Wrong username or code'), { status: 401 });
  }
  if (user.resetCode.expiresAt < Date.now()) {
    db.updateUser(user.id, { resetCode: null });
    throw Object.assign(new Error('That code has expired — ask a family admin for a new one'), { status: 401 });
  }
  if ((body.code || '').trim() !== user.resetCode.code) {
    const attempts = (user.resetCode.attempts || 0) + 1;
    if (attempts >= auth.RESET_CODE_MAX_ATTEMPTS) {
      db.updateUser(user.id, { resetCode: null });
      throw Object.assign(new Error('Too many wrong attempts — ask a family admin for a new code'), { status: 401 });
    }
    db.updateUser(user.id, { resetCode: { ...user.resetCode, attempts } });
    throw Object.assign(new Error('Wrong username or code'), { status: 401 });
  }
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  db.updateUser(user.id, { passwordHash: auth.hashPassword(newPassword), resetCode: null });
  const token = auth.createToken();
  db.addSession({ token, userId: user.id, expiresAt: Date.now() + auth.SESSION_TTL_MS });
  auth.setSessionCookie(res, token);
  const person = db.getPeople().find((p) => p.id === user.personId) || null;
  sendJson(res, 200, { user: publicUser(user), person });
}, { public: true });

route('POST', '/api/auth/logout', async (req, res) => {
  const cookies = auth.parseCookies(req);
  const token = cookies[auth.SESSION_COOKIE];
  if (token) db.deleteSession(token);
  auth.clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}, { public: true });

// ---- Admin routes (require login + isAdmin) ----

route('GET', '/api/admin/family', async (req, res) => {
  requireAdmin(req);
  const component = familyComponent(db.getRelationships(), req.person.id);
  const nameOf = (personId) => {
    const p = db.getPeople().find((pp) => pp.id === personId);
    return p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : '(unbekannt)';
  };

  const pendingRequests = db.getJoinRequests()
    .filter((r) => component.has(r.personId))
    .map((r) => ({ id: r.id, username: r.username, personId: r.personId, personName: nameOf(r.personId), createdAt: r.createdAt }));

  const members = db.getUsers()
    .filter((u) => component.has(u.personId))
    .map((u) => ({ id: u.id, username: u.username, personId: u.personId, personName: nameOf(u.personId), isAdmin: !!u.isAdmin }));

  sendJson(res, 200, { pendingRequests, members });
});

route('POST', '/api/admin/join-requests/:id/approve', async (req, res, { id }) => {
  requireAdmin(req);
  const request = db.findJoinRequestById(id);
  if (!request) return notFound(res);
  requireOwnFamily(req, request.personId);
  if (db.findUserByPersonId(request.personId)) {
    db.deleteJoinRequest(id);
    throw new Error('That person already has an account');
  }
  const user = {
    id: crypto.randomUUID(),
    username: request.username,
    passwordHash: request.passwordHash,
    personId: request.personId,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  db.addUser(user);
  db.deleteJoinRequest(id);
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/admin/join-requests/:id/deny', async (req, res, { id }) => {
  requireAdmin(req);
  const request = db.findJoinRequestById(id);
  if (!request) return notFound(res);
  requireOwnFamily(req, request.personId);
  db.deleteJoinRequest(id);
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/admin/reset-password', async (req, res) => {
  requireAdmin(req);
  const body = await readJsonBody(req);
  const target = db.findUserById(body.userId || '');
  if (!target) return notFound(res);
  requireOwnFamily(req, target.personId);
  const code = auth.createResetCode();
  db.updateUser(target.id, {
    resetCode: { code, expiresAt: Date.now() + auth.RESET_CODE_TTL_MS, attempts: 0 },
  });
  sendJson(res, 200, { code, username: target.username, expiresInMinutes: auth.RESET_CODE_TTL_MS / 60000 });
});

// ---- Family tree routes (require login) ----

route('GET', '/api/state', async (req, res) => {
  const component = familyComponent(db.getRelationships(), req.person.id);
  const people = db.getPeople().filter((p) => component.has(p.id));
  const relationships = db.getRelationships().filter(
    (r) => component.has(r.fromId) && component.has(r.toId)
  );
  sendJson(res, 200, { people, relationships, me: req.person.id });
});

route('POST', '/api/people', async (req, res) => {
  const body = await readJsonBody(req);
  const person = makePerson(body);
  db.addPerson(person);
  sendJson(res, 201, person);
});

route('PUT', '/api/people/:id', async (req, res, { id }) => {
  requireOwnFamily(req, id);
  const body = await readJsonBody(req);
  const allowed = ['firstName', 'lastName', 'maidenName', 'gender', 'birthDate', 'deathDate', 'birthPlace', 'notes'];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  const updated = db.updatePerson(id, updates);
  if (!updated) return notFound(res);
  sendJson(res, 200, updated);
});

route('DELETE', '/api/people/:id', async (req, res, { id }) => {
  requireOwnFamily(req, id);
  const person = db.getPeople().find((p) => p.id === id);
  if (person) {
    for (const photo of person.photos || []) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, photo.filename)); } catch (_) {}
    }
  }
  const ok = db.deletePerson(id);
  if (!ok) return notFound(res);
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/people/:id/photos', async (req, res, { id }) => {
  requireOwnFamily(req, id);
  const body = await readJsonBody(req);
  const person = db.getPeople().find((p) => p.id === id);
  if (!person) return notFound(res);
  const filename = saveDataUrlToFile(body.dataUrl);
  const photo = { id: crypto.randomUUID(), filename, caption: body.caption || '' };
  person.photos = person.photos || [];
  person.photos.push(photo);
  db.updatePerson(id, { photos: person.photos });
  sendJson(res, 201, photo);
});

route('DELETE', '/api/people/:personId/photos/:photoId', async (req, res, { personId, photoId }) => {
  requireOwnFamily(req, personId);
  const person = db.getPeople().find((p) => p.id === personId);
  if (!person) return notFound(res);
  const photo = (person.photos || []).find((ph) => ph.id === photoId);
  if (photo) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, photo.filename)); } catch (_) {}
  }
  person.photos = (person.photos || []).filter((ph) => ph.id !== photoId);
  db.updatePerson(personId, { photos: person.photos });
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/relationships', async (req, res) => {
  const body = await readJsonBody(req);
  const { type, fromId, toId } = body;
  if (!['parent-child', 'spouse'].includes(type)) throw new Error('Invalid relationship type');
  if (!fromId || !toId || fromId === toId) throw new Error('A relationship needs two different people');
  const people = db.getPeople();
  if (!people.find((p) => p.id === fromId) || !people.find((p) => p.id === toId)) {
    throw new Error('Unknown person in relationship');
  }
  const component = familyComponent(db.getRelationships(), req.person.id);
  if (fromId !== req.person.id && toId !== req.person.id && !component.has(fromId) && !component.has(toId)) {
    throw Object.assign(new Error('At least one side must be in your family'), { status: 403 });
  }
  const dup = db.getRelationships().find(
    (r) =>
      r.type === type &&
      ((r.fromId === fromId && r.toId === toId) ||
        (type === 'spouse' && r.fromId === toId && r.toId === fromId))
  );
  if (dup) throw new Error('That relationship already exists');
  const rel = { id: crypto.randomUUID(), type, fromId, toId };
  db.addRelationship(rel);
  sendJson(res, 201, rel);
});

route('DELETE', '/api/relationships/:id', async (req, res, { id }) => {
  const rel = db.getRelationships().find((r) => r.id === id);
  if (rel) {
    requireOwnFamily(req, rel.fromId);
  }
  const ok = db.deleteRelationship(id);
  if (!ok) return notFound(res);
  sendJson(res, 200, { ok: true });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, pathname);
    if (!handled) notFound(res);
    return;
  }

  if (pathname.startsWith('/uploads/')) {
    const filename = path.basename(pathname);
    sendFile(res, path.join(UPLOADS_DIR, filename));
    return;
  }

  // static frontend
  let filePath = path.join(CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(CLIENT_DIR)) {
    return notFound(res);
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      filePath = path.join(CLIENT_DIR, 'index.html');
    }
    sendFile(res, filePath);
  });
});

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

server.listen(PORT, () => {
  console.log(`Family tree app running at http://localhost:${PORT}`);
});
