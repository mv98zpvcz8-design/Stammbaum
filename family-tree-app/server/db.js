// Tiny JSON-file "database". Fine for a single-user personal app.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function loadRaw() {
  if (!fs.existsSync(DB_PATH)) {
    return { people: [], relationships: [] };
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    if (!raw.trim()) return { people: [], relationships: [] };
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read db.json, starting fresh backup kept at db.json.bak:', err.message);
    try { fs.copyFileSync(DB_PATH, DB_PATH + '.bak'); } catch (_) {}
    return { people: [], relationships: [] };
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
};
