import { useMemo } from "react";
import type { AdaptiveLevel, ItemsPack, NormsPack, Session } from "../types";
import { useLang, useT, t as tt } from "../i18n";
import { ageLabel, computeReport } from "../engine/scoring";

interface Props {
  session: Session;
  pack: ItemsPack;
  norms: NormsPack | null;
}

const LEVEL_KEY: Record<AdaptiveLevel, Parameters<ReturnType<typeof useT>>[0]> = {
  high: "lvl_high",
  moderatelyHigh: "lvl_moderatelyHigh",
  adequate: "lvl_adequate",
  moderatelyLow: "lvl_moderatelyLow",
  low: "lvl_low",
  unknown: "lvl_unknown",
};

export function Results({ session, pack, norms }: Props) {
  const tr = useT();
  const lang = useLang();
  const report = useMemo(() => computeReport(session, pack, norms), [session, pack, norms]);

  const subName = (id: string) => {
    const s = pack.subdomains.find((x) => x.id === id)!;
    return `${s.nameVi} / ${s.nameEn}`;
  };
  const domName = (id: string) => {
    const d = pack.domains.find((x) => x.id === id);
    return d ? `${d.nameVi} / ${d.nameEn}` : id;
  };
  const lvl = (l: AdaptiveLevel) => tt(LEVEL_KEY[l], lang);

  return (
    <div className="panel">
      <section className="card">
        <div className="resHeader">
          <div>
            <div className="muted">{tr("examinee")}</div>
            <strong>{session.examinee.name || "—"}</strong>
          </div>
          <div>
            <div className="muted">{tr("age")}</div>
            <strong>{report.ageLabel}</strong>
          </div>
          <div>
            <div className="muted">{tr("edition")}</div>
            <strong>Vineland-II</strong>
          </div>
        </div>
        {report.warnings.includes("normsMissing") && (
          <div className="banner warn">{tr("normsMissing")}</div>
        )}
        {report.warnings.includes("normsUnverified") && (
          <div className="banner warn">{tr("normsUnverified")}</div>
        )}
      </section>

      {report.domains.map((d) => {
        const subs = report.subdomains.filter((s) => pack.domains.find((x) => x.id === d.domain)!.subdomains.includes(s.subdomain));
        return (
          <section key={d.domain} className="card">
            <div className="domainResHead">
              <h3>{domName(d.domain)}</h3>
              <div className="domainScores">
                <Metric label={tr("standard")} value={d.standardScore ?? "—"} />
                <Metric label={tr("percentile")} value={d.percentile != null ? `${d.percentile}%` : "—"} />
                <Metric label={tr("adaptiveLevel")} value={lvl(d.adaptiveLevel)} />
              </div>
            </div>
            <table className="scoreTable">
              <thead>
                <tr>
                  <th>{lang === "vi" ? "Tiểu lĩnh vực" : "Subdomain"}</th>
                  <th>{tr("rawScore")}</th>
                  <th>{tr("basal")}/{tr("ceiling")}</th>
                  <th>{tr("vScale")}</th>
                  <th>{tr("adaptiveLevel")}</th>
                  <th>{tr("ageEquiv")}</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.subdomain} className={!s.scorable ? "rowUnscorable" : ""}>
                    <td>{subName(s.subdomain)}</td>
                    <td className="num">{s.rawScore}</td>
                    <td className="num">
                      {s.basalItemNum ?? "—"} / {s.ceilingItemNum ?? "—"}
                    </td>
                    <td className="num">{s.vScale ?? "—"}</td>
                    <td>{lvl(s.adaptiveLevel)}</td>
                    <td className="num">{s.ageEquivalentMonths != null ? ageLabel(s.ageEquivalentMonths) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subs.some((s) => !s.scorable) && <div className="note">{tr("notScorable")}</div>}
          </section>
        );
      })}

      <section className="card composite">
        <h3>{tr("composite")}</h3>
        <div className="domainScores">
          <Metric label={tr("standard")} value={report.composite.standardScore ?? "—"} big />
          <Metric label={tr("percentile")} value={report.composite.percentile != null ? `${report.composite.percentile}%` : "—"} big />
          <Metric label={tr("adaptiveLevel")} value={lvl(report.composite.adaptiveLevel)} big />
        </div>
        <div className="muted small">
          {lang === "vi" ? "Gồm các lĩnh vực: " : "From domains: "}
          {report.composite.contributingDomains.map((d) => pack.domains.find((x) => x.id === d)?.nameEn).join(", ")}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, big }: { label: string; value: string | number; big?: boolean }) {
  return (
    <div className={big ? "metric big" : "metric"}>
      <div className="metricLabel">{label}</div>
      <div className="metricValue">{value}</div>
    </div>
  );
}
