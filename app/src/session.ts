// Session creation, local autosave, and file (JSON) import/export helpers.
import { APP_VERSION } from "./config";
import type { Edition, Session } from "./types";
import { SESSION_SCHEMA_VERSION } from "./types";

const LOCAL_KEY = "vineland.session.autosave";

export function newSession(edition: Edition): Session {
  const now = new Date().toISOString();
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    edition,
    form: "survey",
    examinee: { name: "", sex: "", birthDate: "", testDate: now.slice(0, 10) },
    interviewer: { name: "" },
    responses: {},
    criticalSeverity: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function touch(s: Session): Session {
  return { ...s, updatedAt: new Date().toISOString() };
}

export function autosaveLocal(s: Session): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function loadLocal(): Session | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Forward-compatible loader: validate + upgrade older schema versions. */
export function migrate(data: unknown): Session {
  const s = data as Session;
  if (!s || typeof s !== "object") throw new Error("invalid session");
  if (s.schemaVersion == null) throw new Error("not a Vineland session file");
  // (future migrations keyed on s.schemaVersion go here)
  return {
    ...s,
    responses: s.responses ?? {},
    criticalSeverity: s.criticalSeverity ?? {},
  };
}

export function sessionFileName(s: Session): string {
  const name = (s.examinee.name || "vineland").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const date = s.examinee.testDate || new Date().toISOString().slice(0, 10);
  return `vineland-${s.edition}-${name}-${date}.json`;
}

export function toBlob(s: Session): Blob {
  return new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
}

export function downloadSession(s: Session): void {
  const url = URL.createObjectURL(toBlob(s));
  const a = document.createElement("a");
  a.href = url;
  a.download = sessionFileName(s);
  a.click();
  URL.revokeObjectURL(url);
}

export async function readSessionFile(file: File): Promise<Session> {
  const text = await file.text();
  return migrate(JSON.parse(text));
}
