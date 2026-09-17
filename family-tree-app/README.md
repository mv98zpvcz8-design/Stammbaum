# Family Tree App

A private, self-hosted family tree app: add people, connect them as parents/children/spouses, attach photos, and see the tree lay itself out automatically by generation.

No external dependencies — just Node.js. No cloud, no tracking. Your data lives in one JSON file plus a folder of photos, both on your own machine.

Everyone who uses it has their own account, logged in as a specific person in the tree — so each person sees their own family front and center, and separate families sharing the same server never see each other's data.

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

## Accounts and perspective

There's no admin setup step — the first thing anyone does is register:

- **"Ich bin neu hier"** ("I'm new here") — create your own person in the tree plus a username/password, in one step.
- **"Schon im Baum"** ("Already in the tree") — if someone already added you (e.g. a parent added you as their child), search for your name, claim that person, and set a password for it.

After that, logging in shows the tree from that person's point of view: their card is marked **"Du"** ("You"), and by default they see everyone connected to them by any parent/child/spouse link — their whole family, however distant, but not an unrelated family that happens to be stored on the same server. Adding a new relative (parent, spouse, child) automatically brings that person into your view; editing or deleting someone requires them to already be part of your family.

## Where your data lives

- `server/data/db.json` — people, relationships, accounts and sessions (plain JSON, human-readable, easy to back up)
- `server/uploads/` — the photos you attach to people

Back up those two things and you have everything. To reset everything, stop the server and delete `server/data/db.json` (it will be recreated empty on next start).

## How to use it

1. Register (see above), then open your own card and use **+ Elternteil**, **+ Partner:in**, **+ Kind** to branch outward — each lets you either create a new person or link someone already in the tree (so you don't end up with duplicates).
2. Click **+ Foto hinzufügen** on a person's detail panel to attach pictures.
3. The tree rearranges itself automatically — generations stack top to bottom, couples are shown side by side with a dashed line, and parent-child links are drawn as elbow connectors.
4. Share the server's address with family members so they can register their own account and add themselves in.

## What's next (not built yet)

This is the foundation — accounts, relationships, and photos. Two things from the original wishlist aren't in this version yet, and are natural next steps once this is in daily use:

- **Automatic extraction** of names/dates from uploaded documents or photos (e.g. old certificates, letters).
- **Register/archive cross-referencing** (e.g. FamilySearch API integration) to suggest matches against external genealogy records.

Both can be added on top of this without changing the data model.
