import { useMemo, useState } from "react";
import type { AgeBand, DomainId, DomainStandardRow, Edition, NormsPack, RangeRow, SubdomainId } from "../types";
import { useLang } from "../i18n";
import { loadNorms, saveNorms, validateNormsPack } from "../data/normsStore";

// ---------------------------------------------------------------------------
// Manual norms entry, laid out like the manual's tables (Table B.1 = a grid of
// v-scale rows × subdomain columns; B.2 / Composite = range rows). The user
// types the values from their OWN licensed manual; the app validates and saves
// them locally (browser storage) — no copyrighted data is bundled or committed.
// ---------------------------------------------------------------------------

const SUBS: { id: SubdomainId; label: string }[] = [
  { id: "receptive", label: "Tiếp nhận" },
  { id: "expressive", label: "Diễn đạt" },
  { id: "written", label: "Văn bản" },
  { id: "personal", label: "Cá nhân" },
  { id: "domestic", label: "Gia đình" },
  { id: "community", label: "Cộng đồng" },
  { id: "interpersonal", label: "Liên cá nhân" },
  { id: "play", label: "Vui chơi" },
  { id: "coping", label: "Ứng xử" },
  { id: "gross", label: "VĐ thô" },
  { id: "fine", label: "VĐ tinh" },
];
const DOMAINS: { id: DomainId; label: string }[] = [
  { id: "communication", label: "Giao tiếp" },
  { id: "dailyLiving", label: "Sinh hoạt" },
  { id: "socialization", label: "Xã hội hóa" },
  { id: "motor", label: "Vận động" },
];
const VSCALES = Array.from({ length: 24 }, (_, i) => 24 - i); // 24 → 1

/** Parse "13-40" or "13" into [min,max]; empty/invalid → null. */
function parseRange(s: string): [number, number] | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (m) return [Number(m[1]), Number(m[2])];
  if (/^\d+$/.test(t)) return [Number(t), Number(t)];
  return null;
}

interface Props {
  edition: Edition;
  onChange: (pack: NormsPack | null) => void;
}

type StdRow = { sumVMin: string; sumVMax: string; standard: string; percentile: string };

// --- Convert a saved pack back into editor state (so it can be VIEWED/edited) ---

function cellsFromBand(band: AgeBand | undefined): Record<string, string> {
  const c: Record<string, string> = {};
  if (!band) return c;
  for (const sid of Object.keys(band.rawToVScale) as SubdomainId[]) {
    for (const row of band.rawToVScale[sid]!) {
      c[`${sid}:${row.value}`] = row.min === row.max ? `${row.min}` : `${row.min}-${row.max}`;
    }
  }
  return c;
}

function stdRowsFrom(rows: DomainStandardRow[] | undefined): StdRow[] {
  return (rows ?? []).map((r) => ({
    sumVMin: String(r.sumVMin), sumVMax: String(r.sumVMax),
    standard: String(r.standard), percentile: String(r.percentile),
  }));
}

function initialFrom(pack: NormsPack | null) {
  const band = pack?.ageBands?.[0];
  return {
    minM: band ? String(band.minMonths) : "48",
    maxM: band ? String(band.maxMonths) : "59",
    cells: cellsFromBand(band),
    domRows: {
      communication: stdRowsFrom(pack?.domainStandard?.communication),
      dailyLiving: stdRowsFrom(pack?.domainStandard?.dailyLiving),
      socialization: stdRowsFrom(pack?.domainStandard?.socialization),
      motor: stdRowsFrom(pack?.domainStandard?.motor),
    } as Partial<Record<DomainId, StdRow[]>>,
    compRows: stdRowsFrom(pack?.composite),
    bandCount: pack?.ageBands?.length ?? 0,
  };
}

export function NormsEditor({ edition, onChange }: Props) {
  const lang = useLang();
  const T = (vi: string, en: string) => (lang === "vi" ? vi : en);

  const init = useMemo(() => initialFrom(loadNorms(edition)), [edition]);
  const [minM, setMinM] = useState(init.minM);
  const [maxM, setMaxM] = useState(init.maxM);
  const [cells, setCells] = useState<Record<string, string>>(init.cells);
  const [domRows, setDomRows] = useState<Partial<Record<DomainId, StdRow[]>>>(init.domRows);
  const [compRows, setCompRows] = useState<StdRow[]>(init.compRows);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /** Reload the saved band matching the current "from" months (or the first band). */
  const reloadSaved = () => {
    const pack = loadNorms(edition);
    if (!pack) { setMsg({ ok: false, text: T("Chưa có bảng chuẩn đã lưu.", "No saved norms yet.") }); return; }
    const band = pack.ageBands.find((b) => b.minMonths === Number(minM)) ?? pack.ageBands[0];
    setMinM(String(band.minMonths));
    setMaxM(String(band.maxMonths));
    setCells(cellsFromBand(band));
    setDomRows({
      communication: stdRowsFrom(pack.domainStandard?.communication),
      dailyLiving: stdRowsFrom(pack.domainStandard?.dailyLiving),
      socialization: stdRowsFrom(pack.domainStandard?.socialization),
      motor: stdRowsFrom(pack.domainStandard?.motor),
    });
    setCompRows(stdRowsFrom(pack.composite));
    setMsg({ ok: true, text: T("Đã tải dữ liệu đã lưu.", "Loaded saved data.") });
  };

  const cellKey = (sid: SubdomainId, v: number) => `${sid}:${v}`;
  const setCell = (sid: SubdomainId, v: number, val: string) =>
    setCells((c) => ({ ...c, [cellKey(sid, v)]: val }));

  const buildStdRows = (rows: StdRow[]): DomainStandardRow[] =>
    rows
      .filter((r) => r.sumVMin && r.sumVMax && r.standard)
      .map((r) => ({
        sumVMin: Number(r.sumVMin), sumVMax: Number(r.sumVMax),
        standard: Number(r.standard), percentile: Number(r.percentile || 0),
      }));

  const save = () => {
    const rawToVScale: Partial<Record<SubdomainId, RangeRow<number>[]>> = {};
    for (const s of SUBS) {
      const rows: RangeRow<number>[] = [];
      for (const v of VSCALES) {
        const r = parseRange(cells[cellKey(s.id, v)] ?? "");
        if (r) rows.push({ min: r[0], max: r[1], value: v });
      }
      if (rows.length) rawToVScale[s.id] = rows.sort((a, b) => a.min - b.min);
    }

    const domainStandard: Partial<Record<DomainId, DomainStandardRow[]>> = {};
    for (const d of DOMAINS) {
      const rows = buildStdRows(domRows[d.id] ?? []);
      if (rows.length) domainStandard[d.id] = rows;
    }
    const composite = buildStdRows(compRows);

    // Merge with any previously saved pack (keep other age bands / tables).
    const existing = loadNorms(edition);
    const bands = (existing?.ageBands ?? []).filter((b) => b.minMonths !== Number(minM));
    const pack: NormsPack = {
      edition,
      source: "Nhập tay từ sổ tay có bản quyền (dữ liệu cục bộ) / Entered from licensed manual (local)",
      verified: false,
      ageBands: [...bands, { minMonths: Number(minM), maxMonths: Number(maxM), rawToVScale }],
      domainStandard: Object.keys(domainStandard).length ? domainStandard : (existing?.domainStandard ?? {}),
      composite: composite.length ? composite : existing?.composite,
      ageEquivalent: existing?.ageEquivalent,
    };

    const res = validateNormsPack(pack, edition);
    if (!res.ok) {
      setMsg({ ok: false, text: res.errors.join(" ") });
      return;
    }
    saveNorms(edition, pack);
    onChange(pack);
    setMsg({
      ok: true,
      text: T(
        `Đã lưu cục bộ: dải ${minM}-${maxM} tháng, ${Object.keys(rawToVScale).length} tiểu lĩnh vực.`,
        `Saved locally: ${minM}-${maxM} months, ${Object.keys(rawToVScale).length} subdomains.`,
      ),
    });
  };

  return (
    <details className="normsEditor" open={init.bandCount > 0}>
      <summary>
        ✍️ {T("Xem / nhập bảng chuẩn (bố cục như sổ tay)", "View / enter norms (manual-style layout)")}
        {init.bandCount > 0 && (
          <span className="badge verified"> {T(`${init.bandCount} dải đã lưu`, `${init.bandCount} band(s) saved`)}</span>
        )}
      </summary>

      <p className="editorNote">
        {T(
          "Nhập giá trị từ SỔ TAY CÓ BẢN QUYỀN của bạn. Mỗi ô là khoảng điểm thô ứng với điểm v (ví dụ \"13-40\" hoặc \"21\"). Dữ liệu chỉ lưu cục bộ trên máy bạn.",
          "Type values from YOUR licensed manual. Each cell is the raw-score range for that v-scale (e.g. \"13-40\" or \"21\"). Data is stored only locally on your machine.",
        )}
      </p>

      <div className="bandRow">
        <label>{T("Tuổi từ (tháng)", "Age from (months)")}
          <input value={minM} onChange={(e) => setMinM(e.target.value)} style={{ width: 70 }} />
        </label>
        <label>{T("đến (tháng)", "to (months)")}
          <input value={maxM} onChange={(e) => setMaxM(e.target.value)} style={{ width: 70 }} />
        </label>
        <button className="ghost small" onClick={reloadSaved} style={{ alignSelf: "flex-end" }}>
          ↻ {T("Tải lại dữ liệu đã lưu", "Reload saved data")}
        </button>
      </div>

      {/* Table B.1 — v-scale × subdomain grid */}
      <div className="gridScroll">
        <table className="normGrid">
          <thead>
            <tr>
              <th className="vcol">{T("Điểm v", "v")}</th>
              {SUBS.map((s) => <th key={s.id}>{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {VSCALES.map((v) => (
              <tr key={v}>
                <th className="vcol">{v}</th>
                {SUBS.map((s) => (
                  <td key={s.id}>
                    <input
                      className="cellInput"
                      value={cells[cellKey(s.id, v)] ?? ""}
                      onChange={(e) => setCell(s.id, v, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table B.2 — domain standard scores */}
      <h4>{T("Điểm chuẩn lĩnh vực (Bảng B.2) + Bách phân vị (C.3)", "Domain standard scores (B.2) + %ile (C.3)")}</h4>
      {DOMAINS.map((d) => (
        <StdRowsEditor
          key={d.id}
          title={d.label}
          rows={domRows[d.id] ?? []}
          setRows={(rows) => setDomRows((s) => ({ ...s, [d.id]: rows }))}
          T={T}
          sumLabel={T("Tổng điểm v", "Sum of v")}
        />
      ))}

      {/* Composite */}
      <h4>{T("Tổng hợp (ABC)", "Composite (ABC)")}</h4>
      <StdRowsEditor title="ABC" rows={compRows} setRows={setCompRows} T={T} sumLabel={T("Tổng điểm chuẩn", "Sum of standards")} />

      <div className="editorActions">
        <button className="primary" onClick={save}>{T("Lưu cục bộ", "Save locally")}</button>
        {msg && <span className={msg.ok ? "okMsg" : "errMsg"}>{msg.text}</span>}
      </div>
    </details>
  );
}

function StdRowsEditor({
  title, rows, setRows, T, sumLabel,
}: {
  title: string;
  rows: StdRow[];
  setRows: (r: StdRow[]) => void;
  T: (vi: string, en: string) => string;
  sumLabel: string;
}) {
  const add = () => setRows([...rows, { sumVMin: "", sumVMax: "", standard: "", percentile: "" }]);
  const upd = (i: number, patch: Partial<StdRow>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const del = (i: number) => setRows(rows.filter((_, j) => j !== i));

  return (
    <div className="stdBlock">
      <div className="stdHead">
        <strong>{title}</strong>
        <button className="ghost small" onClick={add}>+ {T("thêm dòng", "add row")}</button>
      </div>
      {rows.length > 0 && (
        <table className="stdTable">
          <thead>
            <tr>
              <th>{sumLabel} {T("từ", "min")}</th>
              <th>{T("đến", "max")}</th>
              <th>{T("Điểm chuẩn", "Standard")}</th>
              <th>%ile</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><input className="numIn" value={r.sumVMin} onChange={(e) => upd(i, { sumVMin: e.target.value })} /></td>
                <td><input className="numIn" value={r.sumVMax} onChange={(e) => upd(i, { sumVMax: e.target.value })} /></td>
                <td><input className="numIn" value={r.standard} onChange={(e) => upd(i, { standard: e.target.value })} /></td>
                <td><input className="numIn" value={r.percentile} onChange={(e) => upd(i, { percentile: e.target.value })} /></td>
                <td><button className="ghost small" onClick={() => del(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
