import { useMemo, useState } from "react";
import type { ItemScore, ItemsPack, Session, SubdomainDef } from "../types";
import { useLang, useT } from "../i18n";
import { SUBDOMAIN_EXPECTED } from "../data/vineland2.pack";
import { ageInMonths, answeredCount } from "../engine/scoring";

interface Props {
  session: Session;
  pack: ItemsPack;
  onChange: (s: Session) => void;
  onResults: () => void;
}

const SCORES: { value: ItemScore; key: "score2" | "score1" | "score0" | "scoreDK" }[] = [
  { value: 2, key: "score2" },
  { value: 1, key: "score1" },
  { value: 0, key: "score0" },
  { value: "DK", key: "scoreDK" },
];

export function Interview({ session, pack, onChange, onResults }: Props) {
  const tr = useT();
  const lang = useLang();
  const ageYears = Math.floor(ageInMonths(session.examinee.birthDate, session.examinee.testDate) / 12);
  const [activeDomainId, setActiveDomainId] = useState<string>(pack.domains[0]?.id || "");

  const setScore = (itemId: string, value: ItemScore) => {
    const cur = session.responses[itemId];
    const responses = { ...session.responses };
    responses[itemId] = cur === value ? null : value; // toggle off if re-clicked
    onChange({ ...session, responses });
  };

  const domainsWithSubs = useMemo(
    () =>
      pack.domains.map((d) => ({
        domain: d,
        subs: pack.subdomains.filter((s) => d.subdomains.includes(s.id)),
      })),
    [pack],
  );

  return (
    <div className="panel">
      <div className="interviewHeader">
        <div className="interviewHint">
          {lang === "vi"
            ? "Chấm điểm từng mục. Mục xuất phát theo tuổi được đánh dấu. Bấm lại để bỏ chọn."
            : "Score each item. The age start point is marked. Click again to clear."}
        </div>
        <div className="scoreLegend">
          {SCORES.map((s) => {
            const parts = tr(s.key).split(" · ");
            return (
              <span key={String(s.value)}>
                <strong>{parts[0]}</strong> {parts[1]}
              </span>
            );
          })}
        </div>
      </div>

      <nav className="steps domainTabs">
        {pack.domains.map((d) => (
          <button
            key={d.id}
            className={activeDomainId === d.id ? "stepTab on" : "stepTab"}
            onClick={() => setActiveDomainId(d.id)}
          >
            {lang === "vi" ? d.nameVi : d.nameEn}
          </button>
        ))}
      </nav>

      {domainsWithSubs.map(({ domain, subs }) => (
        <section 
          key={domain.id} 
          className={domain.id === activeDomainId ? "domainBlock active" : "domainBlock"}
        >
          <h2 className="domainHead">
            {domain.nameVi} <span className="muted">/ {domain.nameEn}</span>
          </h2>
          {subs.map((sub) => (
            <SubdomainSection
              key={sub.id}
              sub={sub}
              ageYears={ageYears}
              responses={session.responses}
              onScore={setScore}
            />
          ))}
        </section>
      ))}

      <div className="actions">
        <button className="primary" onClick={onResults}>
          {tr("viewResults")} →
        </button>
      </div>
    </div>
  );
}

function SubdomainSection({
  sub,
  ageYears,
  responses,
  onScore,
}: {
  sub: SubdomainDef;
  ageYears: number;
  responses: Session["responses"];
  onScore: (id: string, v: ItemScore) => void;
}) {
  const tr = useT();
  const expected = SUBDOMAIN_EXPECTED[sub.id] ?? sub.items.length;
  const done = answeredCount(sub.items, responses);

  // Which item is the age start point? The highest startFor item whose age <= ageYears.
  const startId = useMemo(() => {
    let best: { id: string; age: number } | null = null;
    for (const it of sub.items) {
      if (it.startFor) {
        for (const a of it.startFor) {
          if (a <= ageYears && (!best || a > best.age)) best = { id: it.id, age: a };
        }
      }
    }
    return best?.id ?? null;
  }, [sub.items, ageYears]);

  return (
    <details className="subBlock" open>
      <summary>
        <span className="subName">
          {sub.nameVi} <span className="muted">/ {sub.nameEn}</span>
          {sub.verified ? (
            <span className="badge verified">✓ {tr("verifiedBadge")}</span>
          ) : (
            <span className="badge draft">✎ {tr("draftBadge")}</span>
          )}
        </span>
        <span className="progress">
          {done}/{sub.items.length || expected} {tr("answered")}
        </span>
      </summary>

      {(
        <ol className="itemList">
          {sub.items.map((it) => {
            const val = responses[it.id] ?? null;
            const isStart = it.id === startId;
            return (
              <li key={it.id} className={isStart ? "item startItem" : "item"}>
                <div className="itemHead">
                  {isStart && <span className="startTag">{"<"}{ageYears}{"->"}</span>}
                  <span className="itemNum">{it.num}</span>
                </div>
                <div className="itemTextMain">
                  <div className="itemText">{it.textVi}</div>
                  {it.guideVi && <div className="itemGuide">{it.guideVi}</div>}
                </div>
                <div className="scoreRow">
                  {SCORES.map((s) => (
                    <button
                      key={String(s.value)}
                      className={val === s.value ? "scoreBtn on" : "scoreBtn"}
                      onClick={() => onScore(it.id, s.value)}
                      title={tr(s.key)}
                    >
                      {tr(s.key).split(" · ")[0]}
                    </button>
                  ))}
                  {it.allowNO && (
                    <button
                      className={val === "NO" ? "scoreBtn on" : "scoreBtn"}
                      onClick={() => onScore(it.id, "NO")}
                      title={tr("scoreNO")}
                    >
                      {tr("scoreNO").split(" · ")[0]}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}
