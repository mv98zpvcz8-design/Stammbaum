// Tiny JSON-file "database". Fine for a single-user personal app.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function emptyDb() {
  return { people: [], relationships: [], users: [], sessions: [] };
}

function loadRaw() {
  if (!fs.existsSync(DB_PATH)) {
    return emptyDb();
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    if (!raw.trim()) return emptyDb();
    const parsed = JSON.parse(raw);
    return { ...emptyDb(), ...parsed };
  } catch (err) {
    console.error('Failed to read db.json, starting fresh backup kept at db.json.bak:', err.message);
    try { fs.copyFileSync(DB_PATH, DB_PATH + '.bak'); } catch (_) {}
    return emptyDb();
  }
}

let cache = loadRaw();
let writeQueued = false;

function persist() {
  if (writeQueued) return;
  writeQueued = true;
  setImmediate(() => {
    writeQueued = false;
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, DB_PATH);
  });
}

module.exports = {
  getAll() {
    return cache;
  },
  getPeople() {
    return cache.people;
  },
  getRelationships() {
    return cache.relationships;
  },
  addPerson(person) {
    cache.people.push(person);
    persist();
    return person;
  },
  updatePerson(id, updates) {
    const idx = cache.people.findIndex(p => p.id === id);
    if (idx === -1) return null;
    cache.people[idx] = { ...cache.people[idx], ...updates, id };
    persist();
    return cache.people[idx];
  },
  deletePerson(id) {
    const before = cache.people.length;
    cache.people = cache.people.filter(p => p.id !== id);
    cache.relationships = cache.relationships.filter(
      r => r.fromId !== id && r.toId !== id
    );
    persist();
    return cache.people.length !== before;
  },
  addRelationship(rel) {
    cache.relationships.push(rel);
    persist();
    return rel;
  },
  deleteRelationship(id) {
    const before = cache.relationships.length;
    cache.relationships = cache.relationships.filter(r => r.id !== id);
    persist();
    return cache.relationships.length !== before;
  },

  // ---- Users ----
  getUsers() {
    return cache.users;
  },
  findUserByUsername(username) {
    const lower = (username || '').trim().toLowerCase();
    return cache.users.find((u) => u.username.toLowerCase() === lower) || null;
  },
  findUserById(id) {
    return cache.users.find((u) => u.id === id) || null;
  },
  findUserByPersonId(personId) {
    return cache.users.find((u) => u.personId === personId) || null;
  },
  addUser(user) {
    cache.users.push(user);
    persist();
    return user;
  },

  // ---- Sessions ----
  addSession(session) {
    cache.sessions.push(session);
    persist();
    return session;
  },
  findSession(token) {
    const session = cache.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return session;
  },
  deleteSession(token) {
    const before = cache.sessions.length;
    cache.sessions = cache.sessions.filter((s) => s.token !== token);
    persist();
    return cache.sessions.length !== before;
  },
};
