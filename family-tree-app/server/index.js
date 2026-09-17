const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

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
function route(method, pattern, handler) {
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
  routes.push({ method, regex, keys, handler });
}

async function handleApi(req, res, pathname) {
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.regex.exec(pathname);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    try {
      await r.handler(req, res, params);
    } catch (err) {
      console.error(err);
      sendJson(res, 400, { error: err.message || 'Bad request' });
    }
    return true;
  }
  return false;
}

// ---- Routes ----

route('GET', '/api/state', async (req, res) => {
  sendJson(res, 200, db.getAll());
});

route('POST', '/api/people', async (req, res) => {
  const body = await readJsonBody(req);
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
  db.addPerson(person);
  sendJson(res, 201, person);
});

route('PUT', '/api/people/:id', async (req, res, { id }) => {
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
