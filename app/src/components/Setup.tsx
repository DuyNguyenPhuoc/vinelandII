import type { Session } from "../types";
import { useLang, useT } from "../i18n";
import { ageInMonths, ageLabel } from "../engine/scoring";

interface Props {
  session: Session;
  onChange: (s: Session) => void;
  onStart: () => void;
}

export function Setup({ session, onChange, onStart }: Props) {
  const tr = useT();
  const lang = useLang();
  const ex = session.examinee;
  const iv = session.interviewer;
  const months = ageInMonths(ex.birthDate, ex.testDate);

  const setEx = (patch: Partial<Session["examinee"]>) =>
    onChange({ ...session, examinee: { ...ex, ...patch } });
  const setIv = (patch: Partial<Session["interviewer"]>) =>
    onChange({ ...session, interviewer: { ...iv, ...patch } });

  const canStart = ex.name.trim() && ex.birthDate && ex.testDate && !isNaN(months);

  return (
    <div className="panel">
      <section className="card">
        <h2>{tr("examinee")}</h2>
        <div className="grid2">
          <label>
            {tr("fullName")}
            <input value={ex.name} onChange={(e) => setEx({ name: e.target.value })} />
          </label>
          <label>
            {tr("sex")}
            <select value={ex.sex} onChange={(e) => setEx({ sex: e.target.value as typeof ex.sex })}>
              <option value=""></option>
              <option value="male">{tr("male")}</option>
              <option value="female">{tr("female")}</option>
            </select>
          </label>
          <label>
            {tr("birthDate")}
            <input type="date" value={ex.birthDate} onChange={(e) => setEx({ birthDate: e.target.value })} />
          </label>
          <label>
            {tr("testDate")}
            <input type="date" value={ex.testDate} onChange={(e) => setEx({ testDate: e.target.value })} />
          </label>
          <label>
            {tr("idNumber")}
            <input value={ex.idNumber ?? ""} onChange={(e) => setEx({ idNumber: e.target.value })} />
          </label>
          <label>
            {tr("diagnosis")}
            <input value={ex.diagnosis ?? ""} onChange={(e) => setEx({ diagnosis: e.target.value })} />
          </label>
        </div>
        <div className="ageBadge">
          {tr("age")}: <strong>{isNaN(months) ? "—" : `${ageLabel(months)} (${months} ${lang === "vi" ? "tháng" : "months"})`}</strong>
        </div>
      </section>

      <section className="card">
        <h2>{tr("interviewer")}</h2>
        <div className="grid2">
          <label>
            {tr("fullName")}
            <input value={iv.name} onChange={(e) => setIv({ name: e.target.value })} />
          </label>
          <label>
            {tr("role")}
            <input value={iv.role ?? ""} onChange={(e) => setIv({ role: e.target.value })} />
          </label>
          <label>
            {tr("respondentName")}
            <input value={iv.respondentName ?? ""} onChange={(e) => setIv({ respondentName: e.target.value })} />
          </label>
          <label>
            {tr("respondentRelation")}
            <input value={iv.respondentRelation ?? ""} onChange={(e) => setIv({ respondentRelation: e.target.value })} />
          </label>
        </div>
      </section>

      <div className="actions">
        <button className="primary" disabled={!canStart} onClick={onStart}>
          {tr("start")} →
        </button>
      </div>
    </div>
  );
}
