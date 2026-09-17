// Given the full graph of people/relationships, finds everyone reachable
// from a starting person by following any relationship edge (parent-child
// or spouse, in either direction). This is a person's "family island" —
// their whole tree, but not other unrelated families stored in the same
// install.
function familyComponent(relationships, startPersonId) {
  const adjacency = new Map();
  const addEdge = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };
  relationships.forEach((r) => {
    addEdge(r.fromId, r.toId);
    addEdge(r.toId, r.fromId);
  });

  const visited = new Set([startPersonId]);
  const queue = [startPersonId];
  while (queue.length) {
    const current = queue.shift();
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;
    neighbors.forEach((n) => {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    });
  }
  return visited;
}

module.exports = { familyComponent };
