# Vineland ABS — Web App

A client-side (browser-only) web app for administering and scoring the **Vineland
Adaptive Behavior Scales** Survey Interview Form, bilingual **Vietnamese / English**.

- **Item-by-item interview** with automatic **basal/ceiling → raw → v-scale →
  domain standard → Adaptive Behavior Composite** scoring.
- **Two editions** (Vineland-II active; Vineland-3 slot ready for data).
- **Google Drive save / re-open** of session `.json` files (plus local download/upload).
- **No backend** — all clinical data stays in the browser; nothing is sent to a server
  we control. Drive uses least-privilege `drive.file` scope (app-created files only).

> ⚠️ **Assistive tool only.** Administration, scoring, and interpretation must be done
> by a qualified professional using the official manual and norms. See *Data status* below.

## Run

```bash
cd app
npm install
npm run dev       # http://localhost:5177
npm test          # engine unit tests
npm run build     # type-check + production build to dist/
```

## Architecture

```
src/
  types.ts                 Domain model (items packs, norms packs, session, results)
  engine/scoring.ts        Pure scoring engine (basal/ceiling, raw, lookups)  ← unit-tested
  engine/scoring.test.ts   12 tests
  data/vineland2.pack.ts   Vineland-II items (Vietnamese)  ← SAMPLE (see below)
  data/norms.ts            Norms loader (returns null until verified tables added)
  session.ts               New/save/load, localStorage autosave, JSON import/export
  drive/googleDrive.ts     Google Identity Services + Drive REST (drive.file scope)
  i18n.ts                  VI/EN string table
  components/              Setup, Interview, Results, DriveBar
```

The app is **edition-pluggable**: each edition = an **items pack** + a **norms pack**.
Adding Vineland-3 (or completing Vineland-II) means supplying those two data files —
no engine changes.

## Data status (what still needs to be filled)

| Data | Status |
|------|--------|
| Vineland-II items — **structure** | **✅ Verified.** All **433 items** across 15 subdomains: correct subdomains, numbering, age start-points, the 2 blank-score items (interpersonal #20, gross #30), and K/P flags — extracted by a coordinate-based parse of the form and count-validated. |
| Vineland-II items — **text** | `receptive` (20) is **hand-verified**. The other subdomains carry **machine-extracted draft** Vietnamese text (readable, but with some layout artifacts like leading cluster-labels or a leaked item number). Flagged `draft` and badged in the UI; **proofread against the paper form** before clinical use. Best done subdomain-by-subdomain (see `data/vineland2.items.json`). |
| Vineland-II norms (Tables B.1–C.5) | **Not shipped (copyright).** The app does not include Pearson's norm tables. Instead, **import them yourself**: on the Results step use **"Import norms (.json)"**. Prepare the file from your licensed manual using [`docs/norms.template.json`](docs/norms.template.json) as the format guide. The app **validates** (coverage, min≤max, monotonic ranges) and stores it locally in your browser — nothing is uploaded. Start with just the age band(s) you need (e.g. 48–59 months). |
| Vineland-3 items + norms | **Not loaded.** Framework ready (edition-pluggable). |

The engine already handles missing norms and empty subdomains gracefully (raw scores
compute; standard scores show "—"; a banner explains why).

## Google Drive setup (optional)

Drive features are hidden until you provide an OAuth Client ID:

1. In [Google Cloud Console](https://console.cloud.google.com/): create a project →
   enable the **Google Drive API** → configure the OAuth consent screen.
2. Create an **OAuth 2.0 Client ID** of type **Web application**; add your app origin
   (e.g. `http://localhost:5177`) to **Authorized JavaScript origins**.
3. Create `app/.env.local`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
4. Restart `npm run dev`. Sign-in, **Save to Drive**, and **Open from Drive** appear.

Scope is `drive.file`, so the app can only see files it created. Session files are
tagged (`appProperties.vinelandApp`) so **Open from Drive** lists only this app's saves.

## Session file format

Sessions serialize to JSON (`schemaVersion` + `appVersion` for forward-compat), holding
examinee/interviewer info and every item response. The same file is what Save/Open uses,
whether local or on Drive.
