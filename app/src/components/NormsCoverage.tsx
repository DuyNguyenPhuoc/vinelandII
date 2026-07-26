import { useMemo, useState } from "react";
import type { NormsPack, SubdomainId } from "../types";
import { useLang } from "../i18n";

// ---------------------------------------------------------------------------
// Coverage map: age bands (rows) × subdomains (columns).
//   green = has v-scale rows
//   red   = applicable at this age but empty (a genuine hole to fill)
//   grey  = not applicable at this age (expected empty), green always wins
// Plus a header summary of the age-independent tables (B.2 / composite / ageEq).
// ---------------------------------------------------------------------------

const SUBS: { id: SubdomainId; label: string }[] = [
  { id: "receptive", label: "Rec" }, { id: "expressive", label: "Exp" }, { id: "written", label: "Wri" },
  { id: "personal", label: "Per" }, { id: "domestic", label: "Dom" }, { id: "community", label: "Com" },
  { id: "interpersonal", label: "Int" }, { id: "play", label: "Ply" }, { id: "coping", label: "Cop" },
  { id: "gross", label: "GMo" }, { id: "fine", label: "FMo" },
];

/** Whether a subdomain is expected to have norms at a band's minimum age (months). */
function applicable(sid: SubdomainId, minMonths: number): boolean {
  if (sid === "written") return minMonths >= 36;
  if (sid === "domestic" || sid === "community" || sid === "coping") return minMonths >= 12;
  if (sid === "gross" || sid === "fine") return minMonths < 72;
  return true;
}

function monthsLabel(m: number): string {
  return `${Math.floor(m / 12)}:${m % 12}`;
}

export function NormsCoverage({ norms }: { norms: NormsPack | null }) {
  const lang = useLang();
  const T = (vi: string, en: string) => (lang === "vi" ? vi : en);
  const [open, setOpen] = useState(false);

  const model = useMemo(() => {
    if (!norms) return null;
    const bands = [...(norms.ageBands ?? [])].sort((a, b) => a.minMonths - b.minMonths);
    let redTotal = 0;
    let fullBands = 0;
    const rows = bands.map((b) => {
      const cells = SUBS.map((s) => {
        const has = (b.rawToVScale?.[s.id]?.length ?? 0) > 0;
        if (has) return "ok" as const;
        return applicable(s.id, b.minMonths) ? ("miss" as const) : ("na" as const);
      });
      const red = cells.filter((c) => c === "miss").length;
      redTotal += red;
      if (red === 0) fullBands++;
      return { label: `${monthsLabel(b.minMonths)}–${monthsLabel(b.maxMonths)}`, minMonths: b.minMonths, cells };
    });
    const ds = norms.domainStandard ?? {};
    const dsDomains = (["communication", "dailyLiving", "socialization", "motor"] as const).filter(
      (d) => (ds[d]?.length ?? 0) > 0,
    ).length;
    const aeSubs = Object.values(norms.ageEquivalent ?? {}).filter((v) => Array.isArray(v) && v.length > 0).length;
    return { rows, redTotal, fullBands, bandCount: bands.length, dsDomains, compRows: norms.composite?.length ?? 0, aeSubs };
  }, [norms]);

  if (!model) return null;

  return (
    <div className="coverage">
      <button className="dummyToggle" onClick={() => setOpen((o) => !o)}>
        🗺️ {T("Bản đồ phủ dữ liệu", "Coverage map")} {open ? "▲" : "▼"}
        <span className="covSummary">
          {model.fullBands}/{model.bandCount} {T("dải đủ", "full")} · {model.redTotal} {T("ô thiếu", "gaps")}
        </span>
      </button>
      {open && (
        <>
          <div className="covTables">
            <span className={model.dsDomains === 4 ? "covPill ok" : "covPill miss"}>B.2: {model.dsDomains}/4 {T("lĩnh vực", "domains")}</span>
            <span className={model.compRows > 0 ? "covPill ok" : "covPill miss"}>ABC: {model.compRows} {T("dòng", "rows")}</span>
            <span className={model.aeSubs === 11 ? "covPill ok" : "covPill miss"}>{T("Tuổi TĐ", "AgeEq")}: {model.aeSubs}/11</span>
            <span className="legend">
              <span className="sw ok" />{T("có", "filled")}
              <span className="sw miss" />{T("thiếu", "missing")}
              <span className="sw na" />{T("N/A", "n/a")}
            </span>
          </div>
          <div className="covScroll">
            <table className="covGrid">
              <thead>
                <tr>
                  <th className="covBandHead">{T("Dải tuổi", "Band")}</th>
                  {SUBS.map((s) => <th key={s.id} title={s.id}>{s.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {model.rows.map((r) => (
                  <tr key={r.minMonths}>
                    <th className="covBandHead">{r.label}</th>
                    {r.cells.map((c, i) => <td key={i} className={`cov ${c}`} title={SUBS[i].id} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
