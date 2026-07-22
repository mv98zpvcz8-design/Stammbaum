import type { Person, Relationship } from '../types/person';

export interface TreeRow {
  person: Person;
  depth: number;
  spouses: Person[];
}

/**
 * Flattens the family graph into a simple indented forest: every person without
 * a recorded parent becomes a root, and their "kind" relationships are walked
 * depth-first. Spouses are attached to the row instead of becoming their own tree.
 * People reached through more than one parent are only rendered once.
 */
export function buildForest(persons: Person[], relationships: Relationship[]): TreeRow[] {
  const personsById = new Map(persons.map((p) => [p.id, p]));

  const childrenOf = new Map<number, number[]>();
  const hasParent = new Set<number>();
  const spousesOf = new Map<number, number[]>();

  for (const rel of relationships) {
    if (rel.beziehungstyp === 'kind') {
      const list = childrenOf.get(rel.person_id) ?? [];
      list.push(rel.related_person_id);
      childrenOf.set(rel.person_id, list);
    }
    if (rel.beziehungstyp === 'eltern') {
      hasParent.add(rel.person_id);
    }
    if (rel.beziehungstyp === 'ehepartner') {
      const list = spousesOf.get(rel.person_id) ?? [];
      list.push(rel.related_person_id);
      spousesOf.set(rel.person_id, list);
    }
  }

  const roots = persons.filter((p) => !hasParent.has(p.id));
  const visited = new Set<number>();
  const rows: TreeRow[] = [];

  function visit(personId: number, depth: number) {
    if (visited.has(personId)) return;
    const person = personsById.get(personId);
    if (!person) return;
    visited.add(personId);

    const spouses = (spousesOf.get(personId) ?? [])
      .map((id) => personsById.get(id))
      .filter((p): p is Person => p != null);

    rows.push({ person, depth, spouses });

    for (const childId of childrenOf.get(personId) ?? []) {
      visit(childId, depth + 1);
    }
  }

  for (const root of roots) {
    visit(root.id, 0);
  }
  // Anyone left over (e.g. only connected via a spouse/sibling cycle) still gets shown.
  for (const person of persons) {
    visit(person.id, 0);
  }

  return rows;
}
