import { useEffect, useState } from "react";
import type { Session } from "../types";
import { useLang, useT } from "../i18n";
import {
  downloadSession,
  readSessionFile,
} from "../session";
import {
  isDriveConfigured,
  isSignedIn,
  listDriveSessions,
  loadFromDrive,
  saveToDrive,
  signIn,
  signOut,
  type DriveFileMeta,
} from "../drive/googleDrive";

interface Props {
  session: Session;
  onLoad: (s: Session) => void;
  setDriveFileId: (id: string) => void;
}

export function DriveBar({ session, onLoad, setDriveFileId }: Props) {
  const tr = useT();
  const lang = useLang();
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const [busy, setBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileMeta[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const configured = isDriveConfigured();

  useEffect(() => setSignedIn(isSignedIn()), [busy]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setErr(null);
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="driveBar">
      {/* Local file fallback — always available */}
      <button onClick={() => downloadSession(session)}>{tr("saveFile")}</button>
      <label className="fileOpen">
        {tr("openFile")}
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              try {
                onLoad(await readSessionFile(f));
              } catch (er) {
                setErr(er instanceof Error ? er.message : String(er));
              }
            }
            e.target.value = "";
          }}
        />
      </label>

      <span className="sep" />

      {!configured ? (
        <span className="muted small">{tr("driveNotConfigured")}</span>
      ) : !signedIn ? (
        <button onClick={() => run("signin", signIn)}>{tr("signIn")}</button>
      ) : (
        <>
          <button
            className="primary"
            disabled={busy !== null}
            onClick={() =>
              run("save", async () => {
                const id = await saveToDrive(session);
                setDriveFileId(id);
              })
            }
          >
            {busy === "save" ? "…" : tr("saveDrive")}
          </button>
          <button
            disabled={busy !== null}
            onClick={() => run("list", async () => setFiles(await listDriveSessions()))}
          >
            {tr("openDrive")}
          </button>
          <button className="ghost" onClick={() => { signOut(); setSignedIn(false); }}>
            {tr("signOut")}
          </button>
        </>
      )}

      {err && <div className="banner error">{err}</div>}

      {files && (
        <div className="driveList">
          <div className="driveListHead">
            {lang === "vi" ? "Chọn phiên đã lưu:" : "Pick a saved session:"}
            <button className="ghost" onClick={() => setFiles(null)}>✕</button>
          </div>
          {files.length === 0 && <div className="muted small">{lang === "vi" ? "Chưa có file." : "No files."}</div>}
          {files.map((f) => (
            <button
              key={f.id}
              className="driveFile"
              onClick={() =>
                run("open", async () => {
                  onLoad(await loadFromDrive(f.id));
                  setFiles(null);
                })
              }
            >
              <span>{f.name}</span>
              <span className="muted small">{new Date(f.modifiedTime).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
