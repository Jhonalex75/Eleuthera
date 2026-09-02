# AFRY_APP — Eleuthera Solar Field QA/QC

Live mechanical QA/QC dashboard for the Eleuthera solar field. Every figure is
recomputed in the browser from the 572 individual string-table records in the
Owner's Engineer register — nothing is transcribed by hand.

## Running it

```powershell
cd "c:\Users\EAE_ENGINEER4\OneDrive - GIH\Belgeler\AFRY_PC\AFRY_APP"
npm.cmd run dev
```

Then open <http://localhost:3000>. Stop with `Ctrl+C`.

> `npm.cmd`, not `npm` — this machine's PowerShell execution policy is `Restricted`,
> which blocks the `npm.ps1` wrapper. To use plain `npm` everywhere, run once:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

### If it fails with "Cannot find native binding"

```powershell
npm.cmd run fix:native
```

The project lives inside OneDrive, which strips the native `.node` binaries out of
`node_modules` as npm extracts them. See [Repairing native bindings](#repairing-native-bindings)
below. The durable fix is to move the project out of OneDrive, e.g. to `C:\dev\AFRY_APP`.

## Architecture

```
Excel register  ──seed──►  Firestore  ──onSnapshot──►  Next.js  ──►  browser
ELE-QAQC-SLR-CRV-001       sites/eleuthera-solar       AFRY_APP
```

| Layer | File | Responsibility |
|---|---|---|
| Data | `src/data/eleuthera-solar.json` | The register exported from the workbook. Ships in the bundle as a fallback |
| Seed | `scripts/seed-firestore.mjs` | Uploads the register. Checks the payload size before writing |
| Connection | `src/lib/firebase.ts` | App + Firestore handles. Config from env vars, current values as defaults |
| Subscription | `src/lib/useSiteData.ts` | `onSnapshot` — a republished register updates every open screen |
| Engine | `src/lib/progress.ts` | Stages, snapshot at any date, S-curve, rate, row and inverter aggregates |
| View | `src/components/` | Map, charts, panels. They render; they do not calculate |

**One document, not a collection.** The 572 records are 132 KB against Firestore's
1 MiB document limit, so a page load costs **one read instead of 572**. If field
engineers later need to edit individual tables from a phone, split it into a
`tables` subcollection — the engine takes the same shape either way.

**Dates are ISO strings throughout.** `"2026-09-01" <= "2026-09-06"` compares
correctly as text, so there are no `Date` objects and no timezone drift between
the site in the Bahamas and the office.

**The engine is free of React and Firebase.** `progress.ts` takes data and returns
numbers, so the same code can drive the weekly Word report or a Cloud Function.

**It degrades gracefully.** If Firestore is unreachable or the document has not
been seeded, the page serves the bundled register and says so in the header. It
never renders empty in front of a client.

## Deploying — the viewing link

The Firebase project `studio-6587601373-5651d` already hosts another site on its
default domain, so this dashboard is published to a **second hosting site** in
the same project. The two do not collide:

| Site | URL | Contents |
|---|---|---|
| default | `studio-6587601373-5651d.web.app` | CyberEngineer Nexus — untouched |
| `eleuthera-qaqc` | `https://eleuthera-qaqc.web.app` | this dashboard |

### First time

1. Open a terminal in this folder and sign in — type this line by itself:

   ```powershell
   firebase login
   ```

   A browser opens; pick the Google account that owns the Firebase project.

2. **Double-click `PUBLISH.cmd`** in the AFRY_APP folder. It creates the hosting
   site, uploads the register to Firestore, builds, deploys, and prints the link.

> **Why not `npm run setup`?** On this machine npm cannot spawn `powershell.exe`:
> the child process dies with `ACCESS_DENIED` (0xC0000022) and prints nothing, so
> the command appears to do nothing at all. Launched from `PUBLISH.cmd` the same
> script runs normally. `npm run publish` and `npm run deploy` are unaffected —
> they invoke node and the firebase CLI directly.

If `site:create` reports the name is taken, pick another (`eleuthera-oe`,
`afry-eleuthera`) and update it in **both** `.firebaserc` and
`package.json`'s `site:create` script.

### Why static Hosting and not App Hosting

App Hosting requires the Blaze pay-as-you-go plan. Plain Hosting runs on the
free Spark plan and serves this dashboard just as well: the page is a client
component that reads Firestore in the browser, so there is no server rendering
to lose. `apphosting.yaml` is kept in the repo, so switching later is a
one-command change with no code edits.

### Updating afterwards

- **Data changed** → `npm run publish`. Open screens update themselves through
  `onSnapshot`; no redeploy needed, because the site reads Firestore live.
- **Code changed** → `npm run deploy`.

## Publishing the data (public read)

The register lives at `sites/eleuthera-solar` in project
`studio-6587601373-5651d`. It is **world-readable**: anyone with the app URL can
see project progress. Nothing can be written from a browser.

Rules are version-controlled here rather than clicked into the console:

| File | State | Read | Write |
|---|---|---|---|
| `firestore.rules` | normal | public | denied |
| `firestore.seed.rules` | during upload only | public | **open** |

### First time

```powershell
firebase login          # opens a browser — one time only
npm run publish
```

`npm run publish` runs three steps in order: opens the write rule, uploads the
register, closes the write rule again. If it fails part-way, run
`npm run rules:lock` immediately — the seed rules leave the document writable by
anyone.

The steps individually, if you prefer to watch each one:

```powershell
npm run rules:open      # deploy firestore.seed.rules
npm run seed            # upload src/data/eleuthera-solar.json
npm run rules:lock      # deploy firestore.rules  <-- never skip
```

### Hardening later

The open-then-lock dance exists because the web SDK obeys rules. The clean
alternative is the Admin SDK, which bypasses rules entirely: download a service
account key from the Firebase console, and seeding never requires opening writes
at all. Worth doing once the register is updated regularly.

To stop the data being public, put the app behind Firebase Auth and change the
read rule to `allow read: if request.auth != null`.

## Refreshing the data

When the workbook is updated:

1. Regenerate `src/data/eleuthera-solar.json` from the workbook's TABLES and
   S_CURVE sheets.
2. `npm run publish`

Open browsers pick up the change without a reload — the page subscribes with
`onSnapshot`.

## Repairing native bindings

```powershell
npm run fix:native
```

Run this after **any** `npm install` in this folder. OneDrive strips the native
`.node` binaries out of `node_modules` as npm extracts them, and the app then
fails with `Cannot find native binding`. The script re-fetches each binary
outside OneDrive and copies it into place. See the script header for the details.

## Known data issues in the source workbook

These are surfaced on the dashboard itself and are worth fixing at the source:

- **`PARAMETERS C30` is stale.** It holds 31-Jul-2026 while records run to
  01-Sep-2026. The workbook's DASHBOARD sheet computes at that date, which is why
  it reports 0.6 % rate compliance and a forecast completion in 2070. This app
  ignores `C30` and computes at the last record date.
- **The theoretical diagonal in `CRITERIA` describes a different rectangle.** It
  derives 15,208 mm from L = 14,700 (the span between pile axes, 6 × 2,450) and
  B = 3,900. Field readings of 16,670–16,680 mm match a 16,212 × 3,900 rectangle —
  the frame is measured corner to corner over the purlins, which overhang about
  756 mm past each end pile. No verdict changes, because acceptance uses the
  *difference* between the diagonals, but the two figures should be reconciled.
