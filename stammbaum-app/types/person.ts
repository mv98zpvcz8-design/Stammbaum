export interface Person {
  id: number;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  sterbedatum: string | null;
  geburtsort: string | null;
  notizen: string | null;
  foto_uri: string | null;
}

export type PersonInput = Omit<Person, 'id'>;

export type RelationshipType = 'eltern' | 'kind' | 'ehepartner' | 'geschwister';

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'eltern',
  'kind',
  'ehepartner',
  'geschwister',
];

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  eltern: 'Elternteil',
  kind: 'Kind',
  ehepartner: 'Ehepartner:in',
  geschwister: 'Geschwister',
};

export interface Relationship {
  id: number;
  person_id: number;
  related_person_id: number;
  beziehungstyp: RelationshipType;
}

export interface RelationshipWithPerson extends Relationship {
  related_person: Person;
}
