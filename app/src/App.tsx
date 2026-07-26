import { useEffect, useState } from "react";
import type { Edition, Session } from "./types";
import { LangContext, type Lang, t } from "./i18n";
import { APP_VERSION } from "./config";
import { autosaveLocal, loadLocal, newSession, touch } from "./session";
import { vineland2Pack, allSubdomainsVerified } from "./data/vineland2.pack";
import { loadNorms, saveNorms } from "./data/normsStore";
import { buildSyntheticNorms } from "./data/norms.synthetic";
import type { NormsPack } from "./types";
import { Setup } from "./components/Setup";
import { Interview } from "./components/Interview";
import { Results } from "./components/Results";
import { DriveBar } from "./components/DriveBar";
import { NormsBar } from "./components/NormsBar";
import { NormsEditor } from "./components/NormsEditor";
import { DummyDataBar } from "./components/DummyDataBar";

type Step = "setup" | "interview" | "results";

export default function App() {
  const [lang, setLang] = useState<Lang>("vi");
  const [edition, setEdition] = useState<Edition>("vineland2");
  const [step, setStep] = useState<Step>("setup");
  const [session, setSession] = useState<Session>(() => loadLocal() ?? newSession("vineland2"));
  const [norms, setNorms] = useState<NormsPack | null>(() => loadNorms("vineland2"));

  // Autosave to localStorage on every change.
  useEffect(() => autosaveLocal(session), [session]);
  // Reload norms when the edition changes.
  useEffect(() => setNorms(loadNorms(edition)), [edition]);

  const update = (s: Session) => setSession(touch(s));

  const pack = vineland2Pack; // only Vineland-II items exist so far
  const tr = (k: Parameters<typeof t>[0]) => t(k, lang);

  const changeEdition = (e: Edition) => {
    setEdition(e);
    if (e !== session.edition) update({ ...session, edition: e });
  };

  return (
    <LangContext.Provider value={lang}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="logo">🧭</span>
            <span>{tr("appTitle")}</span>
          </div>
          <div className="topControls">
            <label className="inline">
              {tr("edition")}
              <select value={edition} onChange={(e) => changeEdition(e.target.value as Edition)}>
                <option value="vineland2">Vineland-II</option>
                <option value="vineland3">Vineland-3</option>
              </select>
            </label>
            <div className="langToggle">
              <button className={lang === "vi" ? "on" : ""} onClick={() => setLang("vi")}>VI</button>
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
          </div>
        </header>

        {edition === "vineland3" && (
          <div className="banner warn">
            {lang === "vi"
              ? "Vineland-3: chưa nạp bộ mục & bảng chuẩn. Khung ứng dụng đã sẵn sàng để bổ sung dữ liệu."
              : "Vineland-3: items & norms not loaded yet. The app framework is ready to receive that data."}
          </div>
        )}
        {edition === "vineland2" && !allSubdomainsVerified && (
          <div className="banner info">{tr("draftData")}</div>
        )}

        <nav className="steps">
          {(["setup", "interview", "results"] as Step[]).map((s) => (
            <button
              key={s}
              className={step === s ? "stepTab on" : "stepTab"}
              onClick={() => setStep(s)}
            >
              {tr(s === "setup" ? "stepSetup" : s === "interview" ? "stepInterview" : "stepResults")}
            </button>
          ))}
        </nav>

        <DummyDataBar
          pack={pack}
          onLoad={(s) => { setSession(s); setEdition(s.edition); }}
          onLoadDemoNorms={() => {
            const demo = buildSyntheticNorms(pack);
            saveNorms(edition, demo);
            setNorms(demo);
          }}
        />

        <DriveBar
          session={session}
          onLoad={(s) => { setSession(s); setEdition(s.edition); }}
          setDriveFileId={(id) => setSession((cur) => ({ ...cur, driveFileId: id }))}
        />

        {step === "results" && (
          <>
            <NormsBar edition={edition} onChange={setNorms} />
            <NormsEditor edition={edition} onChange={setNorms} />
          </>
        )}

        <main>
          {step === "setup" && (
            <Setup session={session} onChange={update} onStart={() => setStep("interview")} />
          )}
          {step === "interview" && (
            <Interview session={session} pack={pack} onChange={update} onResults={() => setStep("results")} />
          )}
          {step === "results" && <Results session={session} pack={pack} norms={norms} />}
        </main>

        <footer className="foot">
          <span className="muted small">{tr("disclaimer")}</span>
          <span className="muted small">v{APP_VERSION} · {tr("autosaved")}</span>
        </footer>
      </div>
    </LangContext.Provider>
  );
}
