import type { SQLiteDatabase } from 'expo-sqlite';
import type { Person, PersonInput, Relationship, RelationshipType } from '../types/person';

export const DATABASE_NAME = 'stammbaum.db';

/**
 * Runs once when the SQLiteProvider opens the database (see app/_layout.tsx).
 * Uses PRAGMA user_version to make schema setup idempotent across app restarts.
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;
  if (currentVersion >= 1) {
    return;
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vorname TEXT NOT NULL,
      nachname TEXT NOT NULL,
      geburtsdatum TEXT,
      sterbedatum TEXT,
      geburtsort TEXT,
      notizen TEXT,
      foto_uri TEXT
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      related_person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      beziehungstyp TEXT NOT NULL CHECK (beziehungstyp IN ('eltern', 'kind', 'ehepartner', 'geschwister'))
    );

    CREATE INDEX IF NOT EXISTS idx_relationships_person_id ON relationships(person_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_related_person_id ON relationships(related_person_id);
  `);

  await db.execAsync('PRAGMA user_version = 1');
}

export async function getAllPersons(db: SQLiteDatabase): Promise<Person[]> {
  return db.getAllAsync<Person>(
    'SELECT * FROM persons ORDER BY nachname COLLATE NOCASE, vorname COLLATE NOCASE'
  );
}

export async function getPersonById(db: SQLiteDatabase, id: number): Promise<Person | null> {
  const person = await db.getFirstAsync<Person>('SELECT * FROM persons WHERE id = ?', [id]);
  return person ?? null;
}

export async function createPerson(db: SQLiteDatabase, input: PersonInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO persons (vorname, nachname, geburtsdatum, sterbedatum, geburtsort, notizen, foto_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.vorname,
      input.nachname,
      input.geburtsdatum,
      input.sterbedatum,
      input.geburtsort,
      input.notizen,
      input.foto_uri,
    ]
  );
  return result.lastInsertRowId;
}

export async function updatePerson(
  db: SQLiteDatabase,
  id: number,
  input: PersonInput
): Promise<void> {
  await db.runAsync(
    `UPDATE persons
     SET vorname = ?, nachname = ?, geburtsdatum = ?, sterbedatum = ?, geburtsort = ?, notizen = ?, foto_uri = ?
     WHERE id = ?`,
    [
      input.vorname,
      input.nachname,
      input.geburtsdatum,
      input.sterbedatum,
      input.geburtsort,
      input.notizen,
      input.foto_uri,
      id,
    ]
  );
}

export async function deletePerson(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM persons WHERE id = ?', [id]);
}

export async function getAllRelationships(db: SQLiteDatabase): Promise<Relationship[]> {
  return db.getAllAsync<Relationship>('SELECT * FROM relationships');
}

export async function getRelationshipsForPerson(
  db: SQLiteDatabase,
  personId: number
): Promise<(Relationship & { related_person: Person })[]> {
  return db.getAllAsync<Relationship & { related_person: Person }>(
    `SELECT r.id, r.person_id, r.related_person_id, r.beziehungstyp,
            p.id AS related_person_id_check,
            p.vorname AS related_person_vorname,
            p.nachname AS related_person_nachname,
            p.geburtsdatum AS related_person_geburtsdatum,
            p.sterbedatum AS related_person_sterbedatum,
            p.geburtsort AS related_person_geburtsort,
            p.notizen AS related_person_notizen,
            p.foto_uri AS related_person_foto_uri
     FROM relationships r
     JOIN persons p ON p.id = r.related_person_id
     WHERE r.person_id = ?`,
    [personId]
  ).then((rows: any[]) =>
    rows.map((row) => ({
      id: row.id,
      person_id: row.person_id,
      related_person_id: row.related_person_id,
      beziehungstyp: row.beziehungstyp,
      related_person: {
        id: row.related_person_id,
        vorname: row.related_person_vorname,
        nachname: row.related_person_nachname,
        geburtsdatum: row.related_person_geburtsdatum,
        sterbedatum: row.related_person_sterbedatum,
        geburtsort: row.related_person_geburtsort,
        notizen: row.related_person_notizen,
        foto_uri: row.related_person_foto_uri,
      },
    }))
  );
}

const INVERSE_RELATIONSHIP: Record<RelationshipType, RelationshipType> = {
  eltern: 'kind',
  kind: 'eltern',
  ehepartner: 'ehepartner',
  geschwister: 'geschwister',
};

/**
 * Creates the relationship in both directions so it shows up on both persons'
 * detail screens (e.g. A->eltern->B implies B->kind->A).
 */
export async function createRelationship(
  db: SQLiteDatabase,
  personId: number,
  relatedPersonId: number,
  beziehungstyp: RelationshipType
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO relationships (person_id, related_person_id, beziehungstyp) VALUES (?, ?, ?)`,
      [personId, relatedPersonId, beziehungstyp]
    );
    await db.runAsync(
      `INSERT INTO relationships (person_id, related_person_id, beziehungstyp) VALUES (?, ?, ?)`,
      [relatedPersonId, personId, INVERSE_RELATIONSHIP[beziehungstyp]]
    );
  });
}

export async function deleteRelationship(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM relationships WHERE id = ?', [id]);
}
