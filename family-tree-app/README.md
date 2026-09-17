# Family Tree App

A private, self-hosted family tree app: add people, connect them as parents/children/spouses, attach photos, and see the tree lay itself out automatically by generation.

No external dependencies — just Node.js. No account, no cloud, no tracking. Your data lives in one JSON file plus a folder of photos, both on your own machine.

## Running it

Requires Node.js (v18+; tested on v22).

```
cd server
node index.js
```

Then open **http://localhost:4173** in your browser.

To use a different port:

```
PORT=5000 node index.js
```

## Where your data lives

- `server/data/db.json` — all people and relationships (plain JSON, human-readable, easy to back up)
- `server/uploads/` — the photos you attach to people

Back up those two things and you have your whole tree. To reset everything, stop the server and delete `server/data/db.json` (it will be recreated empty).

## How to use it

1. Click **+ Add person** and add yourself first.
2. Open your card, then use **+ Add parent**, **+ Add spouse**, **+ Add child** to branch outward — each lets you either create a new person or link someone already in the tree (so you don't end up with duplicates).
3. Click **+ Add photo** on a person's detail panel to attach pictures.
4. The tree above rearranges itself automatically — generations stack top to bottom, couples are shown side by side with a dashed line, and parent-child links are drawn as elbow connectors.

## What's next (not built yet)

This is the foundation — manual entry, relationships, and photos. Two things from the original wishlist aren't in this version yet, and are natural next steps once this is in daily use:

- **Automatic extraction** of names/dates from uploaded documents or photos (e.g. old certificates, letters).
- **Register/archive cross-referencing** (e.g. FamilySearch API integration) to suggest matches against external genealogy records.

Both can be added on top of this without changing the data model.
