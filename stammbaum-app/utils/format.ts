import type { Person } from '../types/person';

export function fullName(person: Pick<Person, 'vorname' | 'nachname'>): string {
  return `${person.vorname} ${person.nachname}`.trim();
}

export function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function lifespan(person: Pick<Person, 'geburtsdatum' | 'sterbedatum'>): string {
  const born = person.geburtsdatum ? `* ${formatDate(person.geburtsdatum)}` : '';
  const died = person.sterbedatum ? `† ${formatDate(person.sterbedatum)}` : '';
  return [born, died].filter(Boolean).join('  ') || 'Keine Lebensdaten';
}
