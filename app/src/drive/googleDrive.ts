// ---------------------------------------------------------------------------
// Google Drive integration (client-side, no backend).
//
// Uses Google Identity Services (GIS) for OAuth token flow and the Drive REST
// API v3. Scope is `drive.file`, so the app can only read/write files it has
// itself created — it never gets access to the rest of the user's Drive.
//
// Requires a Google OAuth Client ID (VITE_GOOGLE_CLIENT_ID). When absent, the
// UI hides Drive actions and uses local .json download/upload instead.
// ---------------------------------------------------------------------------

import { DRIVE_SCOPE, GOOGLE_CLIENT_ID } from "../config";
import type { Session } from "../types";
import { migrate, sessionFileName, toBlob } from "../session";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

// Marker so we can find only this app's files within the drive.file scope.
const APP_TAG = "vinelandApp";

export interface DriveFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
}

let accessToken: string | null = null;
let tokenExpiry = 0;

// --- GIS script + token client ---------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google?: any;
  }
}

let gisReady: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisReady;
}

export function isDriveConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

export function isSignedIn(): boolean {
  return accessToken !== null && Date.now() < tokenExpiry;
}

/** Interactive sign-in (must be called from a user gesture). */
export async function signIn(): Promise<void> {
  if (!isDriveConfigured()) throw new Error("Google Client ID not configured");
  await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
        if (resp.error || !resp.access_token) return reject(new Error(resp.error || "no token"));
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000 - 60_000;
        resolve();
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export function signOut(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiry = 0;
}

async function ensureToken(): Promise<string> {
  if (!isSignedIn()) await signIn();
  if (!accessToken) throw new Error("not signed in");
  return accessToken;
}

// --- File operations --------------------------------------------------------

/**
 * Create or update the session as a JSON file in the user's Drive.
 * Returns the Drive file id (also stored on the session).
 */
export async function saveToDrive(session: Session): Promise<string> {
  const token = await ensureToken();
  const name = sessionFileName(session);
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/json",
    appProperties: { [APP_TAG]: "1", edition: session.edition },
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", toBlob(session));

  const existingId = session.driveFileId;
  const url = existingId
    ? `${DRIVE_UPLOAD}/${existingId}?uploadType=multipart&fields=id`
    : `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`;
  const method = existingId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive save failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** List the session files this app has created, newest first. */
export async function listDriveSessions(): Promise<DriveFileMeta[]> {
  const token = await ensureToken();
  const q = encodeURIComponent(`appProperties has { key='${APP_TAG}' and value='1' } and trashed=false`);
  const url = `${DRIVE_FILES}?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)&pageSize=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = (await res.json()) as { files: DriveFileMeta[] };
  return data.files ?? [];
}

/** Download and parse a session file by id. */
export async function loadFromDrive(fileId: string): Promise<Session> {
  const token = await ensureToken();
  const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive load failed: ${res.status}`);
  const session = migrate(await res.json());
  session.driveFileId = fileId;
  return session;
}
