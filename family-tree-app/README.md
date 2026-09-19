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

## Running it without your own computer (Render.com, free)

If you don't have a laptop/PC to keep running, you can host it for free on [Render.com](https://render.com) instead — entirely through your browser, no command line needed:

1. Sign up at render.com (free, no credit card required for this).
2. **New** → **Web Service** → connect your GitHub account and pick this repository.
3. Fill in:
   - **Root Directory**: `family-tree-app`
   - **Build Command**: leave empty (no dependencies to install)
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Click **Create Web Service**. After a minute or two you'll get a public address like `https://yourapp.onrender.com` — that's your family tree, reachable from any phone, tablet or computer, no local network needed.

**Important caveat with the free plan**: its disk is not permanent storage — your data survives normal restarts and the service "sleeping" after inactivity (it just takes ~30 seconds to wake up on the next visit), but is wiped whenever you deploy new code. Treat it as a great way to get started and let the family try it out; once it's part of daily use, back up `server/data/db.json` and `server/uploads/` regularly (Render's dashboard lets you open a shell to download them), or move to a plan/host with a persistent disk.

## Accounts and perspective

There's no separate admin setup step — the first thing anyone does is register:

- **"Ich bin neu hier"** ("I'm new here") — create your own person in the tree plus a username/password, in one step. You immediately become the **admin** of that new family tree (see below).
- **"Schon im Baum"** ("Already in the tree") — if someone already added you (e.g. a parent added you as their child), search for your name and set a password for it. This sends a **join request**, not an instant account — see Approvals below.

After logging in, the tree is shown from that person's point of view: their card is marked **"Du"** ("You"), and by default they see everyone connected to them by any parent/child/spouse link — their whole family, however distant, but not an unrelated family that happens to be stored on the same server. Adding a new relative (parent, spouse, child) automatically brings that person into your view; editing or deleting someone requires them to already be part of your family.

### Approvals ("Familie verwalten")

Whoever registers as "Ich bin neu hier" for a family becomes that family's **admin**, marked with a "Verwaltung" tag. Every family can have more than one — anyone who starts a new tree is one for it. Admins get a **"Familie verwalten"** entry in their user menu (with a red badge showing how many requests are waiting) where they can:

- **Approve or deny join requests** — when someone claims a person you already added, they can't log in until an admin approves it. This stops a stranger who happens to know the server's address from grabbing an identity in your tree and seeing private family data.
- **Reset a family member's password** — since the app has no email, there's no "forgot password" link that emails you a reset. Instead, if someone forgets their password, an admin generates a short numeric code for them (valid 30 minutes) in "Familie verwalten" and relays it however you like (in person, phone, chat). The person then enters it on the **"Passwort vergessen?"** link on the login screen, along with a new password.

Once you register or log in, you stay signed in on that device for a year (no repeated logins).

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
