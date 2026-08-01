import { useEffect, useState } from "react";
// @ts-ignore
import html2pdf from "html2pdf.js";
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
import { NormsCoverage } from "./components/NormsCoverage";
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

  const handleNewSession = () => {
    if (confirm(tr("confirmNew") || "Are you sure you want to clear all data and start a new session?")) {
      const s = newSession(edition);
      setSession(s);
      setStep("setup");
    }
  };

  const handleSavePdf = () => {
    const element = document.querySelector('.mainContent');
    if (!element) return;
    
    element.classList.add('pdf-export');
    
    const opt = {
      margin:       10,
      filename:     `Vineland_${session.examinee.name || 'Report'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      element.classList.remove('pdf-export');
    });
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
            <button className="ghost" onClick={handleNewSession}>
              {tr("newSession") || "New Session"}
            </button>
            <button className="ghost printBtn" onClick={handleSavePdf}>
              {tr("savePdf") || "Save PDF"}
            </button>
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
          <div className="no-print">
            <NormsBar edition={edition} onChange={setNorms} />
            <NormsCoverage norms={norms} />
            <NormsEditor edition={edition} value={norms} onChange={setNorms} />
          </div>
        )}

        <main className="mainContent">
          <div className={step === "setup" ? "step-screen active" : "step-screen"}>
            <Setup session={session} onChange={update} onStart={() => setStep("interview")} />
          </div>
          <div className={step === "interview" ? "step-screen active" : "step-screen"}>
            <Interview session={session} pack={pack} onChange={update} onResults={() => setStep("results")} />
          </div>
          <div className={step === "results" ? "step-screen active" : "step-screen"}>
            <Results session={session} pack={pack} norms={norms} />
          </div>
        </main>

        <footer className="foot">
          <span className="muted small">{tr("disclaimer")}</span>
          <span className="muted small">v{APP_VERSION} · {tr("autosaved")}</span>
        </footer>
      </div>
    </LangContext.Provider>
  );
}
