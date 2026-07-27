// Shows the step-by-step formula/trace from raw item responses to each score,
// so a reviewer can see exactly which norms row produced a given number
// (raw → v-scale → domain standard → ABC), including the 90%/95% CI bands
// when the loaded norms carry them.
import type { DomainDef, ItemsPack, NormsPack, Session, SubdomainDef } from "../types";
import { useLang, useT } from "../i18n";
import {
  compositeRows,
  computeRaw,
  domainStandardRows,
  findAgeBand,
  lookupRangeRow,
  lookupStandardRow,
} from "../engine/scoring";
import type { ScoreReport } from "../types";

interface SubProps {
  session: Session;
  norms: NormsPack | null;
  report: ScoreReport;
  sd: SubdomainDef;
}

export function SubdomainFlow({ session, norms, report, sd }: SubProps) {
  const tr = useT();
  const lang = useLang();
  const raw = computeRaw(sd.items, session.responses);
  const band = findAgeBand(norms, report.ageMonths);
  const vRow = band ? lookupRangeRow(band.rawToVScale[sd.id], raw.rawScore) : null;
  const ci90 = band?.confidenceInterval90?.[sd.id];
  const creditedBelow = raw.basalIndex * 2;
  const sumInRange = raw.rawScore - creditedBelow;

  return (
    <div className="calcFlow">
      <ol className="calcSteps">
        <li>
          <span className="calcTag">{tr("basal")}/{tr("ceiling")}</span>
          {raw.basalItemNum != null ? (
            <span>
              {lang === "vi" ? "mục " : "item "}#{raw.basalItemNum}
              {lang === "vi" ? " (4 mục liên tiếp = 2)" : " (4 consecutive scores of 2)"}
            </span>
          ) : (
            <span>{lang === "vi" ? "không có sàn — bắt đầu từ mục 1" : "no basal — starts at item 1"}</span>
          )}
          <span className="sep" />
          {raw.ceilingItemNum != null ? (
            <span>
              {lang === "vi" ? "mục " : "item "}#{raw.ceilingItemNum}
              {lang === "vi" ? " (4 mục liên tiếp = 0)" : " (4 consecutive scores of 0)"}
            </span>
          ) : (
            <span>{lang === "vi" ? "không có trần — đến mục cuối" : "no ceiling — runs to last item"}</span>
          )}
        </li>
        <li>
          <span className="calcTag">{tr("rawScore")}</span>
          <span className="calcFormula">
            {creditedBelow > 0 && (
              <>
                ({raw.basalIndex} {lang === "vi" ? "mục dưới sàn" : "items below basal"} × 2 = {creditedBelow}) +{" "}
              </>
            )}
            {lang === "vi" ? "tổng điểm trong khoảng" : "sum within range"} ({sumInRange})
            {" = "}
            <strong>{raw.rawScore}</strong>
          </span>
          {(raw.dkCount > 0 || raw.noCount > 0 || raw.unansweredInRange > 0) && (
            <span className="muted small">
              {" "}
              (DK {raw.dkCount}, NO {raw.noCount}, {lang === "vi" ? "bỏ trống" : "blank"} {raw.unansweredInRange})
            </span>
          )}
          {!raw.scorable && <div className="note">{tr("notScorable")}</div>}
        </li>
        <li>
          <span className="calcTag">{tr("vScale")}</span>
          {vRow ? (
            <span className="calcFormula">
              {raw.rawScore} ∈ [{vRow.min}–{vRow.max}] → <strong>{vRow.value}</strong>
              {ci90 != null && (
                <span className="muted">
                  {" "}
                  · {lang === "vi" ? "KTC 90%" : "90% CI"}: {vRow.value - ci90}–{vRow.value + ci90}
                </span>
              )}
            </span>
          ) : (
            <span className="muted">
              {band
                ? lang === "vi"
                  ? "không có hàng phù hợp trong Bảng B.1"
                  : "no matching row in Table B.1"
                : lang === "vi"
                  ? "chưa nạp bảng chuẩn cho độ tuổi này"
                  : "norms not loaded for this age"}
            </span>
          )}
        </li>
      </ol>
      <div className="calcSource">
        {tr("sourceRawCeiling")}
        <br />
        {tr("sourceB1")}
      </div>
    </div>
  );
}

interface DomainProps {
  norms: NormsPack | null;
  report: ScoreReport;
  dom: DomainDef;
}

export function DomainFlow({ norms, report, dom }: DomainProps) {
  const lang = useLang();
  const tr = useT();
  const subs = report.subdomains.filter((s) => dom.subdomains.includes(s.subdomain));
  const rows = domainStandardRows(norms, report.ageMonths, dom.id);
  const domRes = report.domains.find((d) => d.domain === dom.id);
  const row = rows && domRes?.sumVScale != null ? lookupStandardRow(rows, domRes.sumVScale) : null;

  const terms = subs
    .filter((s) => s.vScale != null)
    .map((s) => s.vScale)
    .join(" + ");

  return (
    <div className="calcFlow">
      <ol className="calcSteps">
        <li>
          <span className="calcTag">{lang === "vi" ? "Tổng điểm v" : "Sum of v-scales"}</span>
          <span className="calcFormula">
            {terms || "—"} = <strong>{domRes?.sumVScale ?? "—"}</strong>
          </span>
        </li>
        <li>
          <span className="calcTag">{tr("standard")}</span>
          {row ? (
            <span className="calcFormula">
              {domRes?.sumVScale} ∈ [{row.sumVMin}–{row.sumVMax}] → <strong>{row.standard}</strong>
              {" · "}
              {tr("percentile")} {row.percentile}%
              {row.ci95 && (
                <span className="muted">
                  {" "}
                  · {lang === "vi" ? "KTC 95%" : "95% CI"}: {row.ci95[0]}–{row.ci95[1]}
                </span>
              )}
            </span>
          ) : (
            <span className="muted">
              {lang === "vi" ? "không tìm thấy hàng phù hợp trong Bảng B.2" : "no matching row in Table B.2"}
            </span>
          )}
        </li>
      </ol>
      <div className="calcSource">{tr("sourceB2Domain")}</div>
    </div>
  );
}

export function CompositeFlow({ pack, norms, report }: { pack: ItemsPack; norms: NormsPack | null; report: ScoreReport }) {
  const lang = useLang();
  const tr = useT();
  const contrib = report.composite.contributingDomains;
  const rows = compositeRows(norms, report.ageMonths);
  const standards = contrib.map((id) => report.domains.find((d) => d.domain === id)?.standardScore ?? null);
  const sum = standards.every((s) => s != null) ? (standards as number[]).reduce((a, b) => a + b, 0) : null;
  const row = sum != null && rows ? lookupStandardRow(rows, sum) : null;
  const terms = contrib
    .map((id) => `${pack.domains.find((d) => d.id === id)?.nameEn ?? id} (${report.domains.find((d) => d.domain === id)?.standardScore ?? "—"})`)
    .join(" + ");

  return (
    <div className="calcFlow">
      <ol className="calcSteps">
        <li>
          <span className="calcTag">{lang === "vi" ? "Tổng điểm chuẩn" : "Sum of standards"}</span>
          <span className="calcFormula">
            {terms} = <strong>{sum ?? "—"}</strong>
          </span>
        </li>
        <li>
          <span className="calcTag">ABC</span>
          {row ? (
            <span className="calcFormula">
              {sum} ∈ [{row.sumVMin}–{row.sumVMax}] → <strong>{row.standard}</strong>
              {" · "}
              {tr("percentile")} {row.percentile}%
            </span>
          ) : (
            <span className="muted">
              {lang === "vi" ? "không tìm thấy hàng phù hợp" : "no matching row"}
            </span>
          )}
        </li>
      </ol>
      <div className="calcSource">{tr("sourceB2Composite")}</div>
    </div>
  );
}
