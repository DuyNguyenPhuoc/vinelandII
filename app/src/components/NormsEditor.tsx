import { useEffect, useMemo, useRef, useState } from "react";
import type { DomainId, DomainStandardRow, Edition, NormsPack, SubdomainId } from "../types";
import { useLang } from "../i18n";
import { loadNorms, normalizeNormsPack, saveNorms, validateNormsPack } from "../data/normsStore";

// ---------------------------------------------------------------------------
// Norms table viewer/editor, laid out like the manual's Table B.1:
//   columns = subdomains grouped under their domain
//   rows    = v-scale scores (24 → 1)
//   cell    = the raw-score range for that (subdomain, v-scale)
//
// - Navigate age bands (compare each against the matching manual page).
// - Suspicious cells are highlighted (min>max, or non-increasing ranges) so
//   OCR errors are easy to spot against the PDF.
// - Open / save the file directly (File System Access API) — edits persist to
//   norms.vineland2.local.json; download fallback where the API is unavailable.
// ---------------------------------------------------------------------------

const GROUPS: { domain: DomainId; label: string; subs: { id: SubdomainId; label: string }[] }[] = [
  { domain: "communication", label: "Giao tiếp / Communication", subs: [
    { id: "receptive", label: "Tiếp nhận" }, { id: "expressive", label: "Diễn đạt" }, { id: "written", label: "Văn bản" },
  ] },
  { domain: "dailyLiving", label: "Sinh hoạt / Daily Living", subs: [
    { id: "personal", label: "Cá nhân" }, { id: "domestic", label: "Gia đình" }, { id: "community", label: "Cộng đồng" },
  ] },
  { domain: "socialization", label: "Xã hội hóa / Socialization", subs: [
    { id: "interpersonal", label: "Liên cá nhân" }, { id: "play", label: "Vui chơi" }, { id: "coping", label: "Ứng xử" },
  ] },
  { domain: "motor", label: "Vận động / Motor", subs: [
    { id: "gross", label: "VĐ thô" }, { id: "fine", label: "VĐ tinh" },
  ] },
];
const ALL_SUBS = GROUPS.flatMap((g) => g.subs);
const VSCALES = Array.from({ length: 24 }, (_, i) => 24 - i); // 24 → 1

type StdRow = { sumVMin: string; sumVMax: string; standard: string; percentile: string };

function parseRange(s: string): [number, number] | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (m) return [Number(m[1]), Number(m[2])];
  if (/^\d+$/.test(t)) return [Number(t), Number(t)];
  return null;
}

function monthsLabel(m: number): string {
  return `${Math.floor(m / 12)}:${m % 12}`;
}

async function saveToHandle(handle: FileSystemFileHandle, data: unknown): Promise<void> {
  const w = await handle.createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}
function downloadJson(data: unknown, name: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  edition: Edition;
  /** The app's current norms (from import, demo, or file) — the editor syncs to this. */
  value: NormsPack | null;
  onChange: (pack: NormsPack | null) => void;
}

export function NormsEditor({ edition, value, onChange }: Props) {
  const lang = useLang();
  const T = (vi: string, en: string) => (lang === "vi" ? vi : en);

  const [pack, setPack] = useState<NormsPack | null>(value ?? loadNorms(edition));
  const [bandIndex, setBandIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [domRows, setDomRows] = useState<Partial<Record<DomainId, StdRow[]>>>({});
  const [compRows, setCompRows] = useState<StdRow[]>([]);
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const fsApi = typeof window !== "undefined" && "showOpenFilePicker" in window;

  const loadStdEditorsFrom = (p: NormsPack | null) => {
    setDomRows({
      communication: stdRowsFrom(p?.domainStandard?.communication),
      dailyLiving: stdRowsFrom(p?.domainStandard?.dailyLiving),
      socialization: stdRowsFrom(p?.domainStandard?.socialization),
      motor: stdRowsFrom(p?.domainStandard?.motor),
    });
    setCompRows(stdRowsFrom(p?.composite));
  };

  // Sync to the app's current norms whenever it changes (unless there are unsaved edits).
  useEffect(() => {
    if (dirty) return;
    setPack(value ?? null);
    loadStdEditorsFrom(value ?? null);
    setBandIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const bands = pack?.ageBands ?? [];
  const band = bands[Math.min(bandIndex, Math.max(0, bands.length - 1))];

  const cellText = (sid: SubdomainId, v: number): string => {
    const r = band?.rawToVScale?.[sid]?.find((x) => x.value === v);
    if (!r) return "";
    return r.min === r.max ? `${r.min}` : `${r.min}-${r.max}`;
  };

  const setCell = (sid: SubdomainId, v: number, text: string) => {
    if (!pack || !band) return;
    const range = parseRange(text);
    const nextBands = [...pack.ageBands];
    const nextBand = { ...band, rawToVScale: { ...band.rawToVScale } };
    let rows = [...(nextBand.rawToVScale[sid] ?? [])].filter((r) => r.value !== v);
    if (range || text.trim() === "") {
      if (range) rows.push({ min: range[0], max: range[1], value: v });
    } else {
      // unparseable but non-empty → keep a marker row so it shows as bad
      rows.push({ min: NaN, max: NaN, value: v });
    }
    rows.sort((a, b) => a.value - b.value);
    nextBand.rawToVScale[sid] = rows;
    nextBands[bandIndex] = nextBand;
    setPack({ ...pack, ageBands: nextBands });
    setDirty(true);
  };

  // Flag suspicious cells for the current band.
  const flags = useMemo(() => {
    const m: Record<string, "bad" | "warn"> = {};
    if (!band) return m;
    for (const s of ALL_SUBS) {
      const rows = [...(band.rawToVScale[s.id] ?? [])].sort((a, b) => a.value - b.value);
      let prevMax = -1;
      for (const r of rows) {
        if (Number.isNaN(r.min) || Number.isNaN(r.max) || r.min > r.max) m[`${s.id}:${r.value}`] = "bad";
        else if (r.min <= prevMax) m[`${s.id}:${r.value}`] = "warn";
        if (!Number.isNaN(r.max)) prevMax = Math.max(prevMax, r.max);
      }
    }
    return m;
  }, [band]);

  // A band is "pdfVerified" only when every cell was individually cross-checked
  // against the manual's PDF page. Passing structural validation (no gaps,
  // overlaps, or non-monotonic values — that's what `flags` below catches)
  // does NOT mean the values are correct: a wrong-but-plausible number still
  // passes those checks. Unverified bands are highlighted red so they can be
  // checked by hand against the manual.
  const bandUnverified = !!band && !band.pdfVerified;

  const stats = useMemo(() => {
    let filled = 0, bad = 0, warn = 0;
    if (band) for (const s of ALL_SUBS) {
      for (const r of band.rawToVScale[s.id] ?? []) {
        filled++;
        const f = flags[`${s.id}:${r.value}`];
        if (f === "bad") bad++; else if (f === "warn") warn++;
      }
    }
    return { filled, bad, warn };
  }, [band, flags]);

  const openFile = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [h] = await (window as any).showOpenFilePicker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      const data = normalizeNormsPack(JSON.parse(await (await h.getFile()).text()) as NormsPack);
      const res = validateNormsPack(data, edition);
      if (!res.ok) { setMsg({ ok: false, text: res.errors.join(" ") }); return; }
      handleRef.current = h;
      setPack(data); setBandIndex(0); loadStdEditorsFrom(data);
      saveNorms(edition, data); onChange(data); setDirty(false);
      setMsg({ ok: true, text: T(`Đã mở ${h.name}: ${data.ageBands.length} dải tuổi.`, `Opened ${h.name}: ${data.ageBands.length} bands.`) });
    } catch { /* user cancelled */ }
  };

  const buildOutPack = (): NormsPack | null => {
    if (!pack) return null;
    const domainStandard: Partial<Record<DomainId, DomainStandardRow[]>> = {};
    for (const g of GROUPS) {
      const rows = buildStdRows(domRows[g.domain] ?? []);
      if (rows.length) domainStandard[g.domain] = rows;
    }
    const composite = buildStdRows(compRows);
    return {
      ...pack,
      domainStandard: Object.keys(domainStandard).length ? domainStandard : pack.domainStandard,
      composite: composite.length ? composite : pack.composite,
    };
  };

  const toggleVerified = async () => {
    if (!pack) return;
    const out = { ...pack, verified: !pack.verified };
    setPack(out);
    saveNorms(edition, out);
    onChange(out);
    if (handleRef.current) {
      try { await saveToHandle(handleRef.current, out); } catch { /* ignore */ }
    }
    setMsg({ ok: true, text: out.verified
      ? T("Đã đánh dấu ĐÃ KIỂM ĐỊNH.", "Marked as VERIFIED.")
      : T("Đã bỏ đánh dấu kiểm định.", "Marked as unverified.") });
  };

  const save = async () => {
    const out = buildOutPack();
    if (!out) return;
    saveNorms(edition, out); onChange(out); setPack(out);
    if (handleRef.current) {
      try { await saveToHandle(handleRef.current, out); setDirty(false); setMsg({ ok: true, text: T("Đã lưu vào file.", "Saved to file.") }); }
      catch (e) { setMsg({ ok: false, text: String(e) }); }
    } else {
      downloadJson(out, "norms.vineland2.local.json");
      setDirty(false);
      setMsg({ ok: true, text: T("Đã tải xuống. Dùng 'Mở file' để ghi trực tiếp lần sau.", "Downloaded. Use 'Open file' to write in place next time.") });
    }
  };

  if (!pack) {
    return (
      <div className="normsEditor">
        <div className="editorNote">
          {T("Chưa có bảng chuẩn. Bấm 'Mở file' để nạp norms.vineland2.local.json, hoặc dùng 'Nạp bảng chuẩn' ở trên.",
             "No norms yet. Click 'Open file' to load norms.vineland2.local.json, or use 'Import norms' above.")}
        </div>
        {fsApi && <button className="primary" onClick={openFile}>{T("📂 Mở file", "📂 Open file")}</button>}
      </div>
    );
  }

  return (
    <div className="normsEditor">
      <div className="normsToolbar">
        <div className="tbLeft">
          {fsApi && <button className="ghost small" onClick={openFile}>📂 {T("Mở file", "Open file")}</button>}
          <button className="primary small" onClick={save}>💾 {handleRef.current ? T("Lưu vào file", "Save to file") : T("Tải xuống", "Download")}{dirty ? " *" : ""}</button>
          <button className={pack.verified ? "verifyBtn on" : "verifyBtn"} onClick={toggleVerified}>
            {pack.verified ? `✓ ${T("Đã kiểm định", "Verified")}` : `☐ ${T("Chưa kiểm định", "Unverified")}`}
          </button>
          {handleRef.current && <span className="fileTag">{handleRef.current.name}</span>}
        </div>
        <div className="tbRight">
          <button className="ghost small" disabled={bandIndex === 0} onClick={() => setBandIndex((i) => Math.max(0, i - 1))}>◀</button>
          <select value={bandIndex} onChange={(e) => setBandIndex(Number(e.target.value))}>
            {bands.map((b, i) => (
              <option key={i} value={i}>
                {b.pdfVerified ? "✓" : "🔴"} {monthsLabel(b.minMonths)}–{monthsLabel(b.maxMonths)} ({b.minMonths}-{b.maxMonths} mo)
              </option>
            ))}
          </select>
          <button className="ghost small" disabled={bandIndex >= bands.length - 1} onClick={() => setBandIndex((i) => Math.min(bands.length - 1, i + 1))}>▶</button>
          <span className="bandInfo">{bandIndex + 1}/{bands.length}</span>
        </div>
      </div>

      <div className="bandHeader">
        {T("Bảng B.1 · Điểm v theo điểm thô", "Table B.1 · v-scale by raw score")} —
        <strong> {T("Tuổi", "Ages")} {monthsLabel(band.minMonths)}–{monthsLabel(band.maxMonths)}</strong>
        <span className="statPill">{stats.filled} {T("ô", "cells")}</span>
        {stats.bad > 0 && <span className="statPill bad">⛔ {stats.bad} {T("lỗi", "errors")}</span>}
        {stats.warn > 0 && <span className="statPill warn">⚠ {stats.warn} {T("nghi ngờ", "suspect")}</span>}
        {bandUnverified
          ? <span className="statPill unverified">🔴 {T("chưa đối chiếu với sách hướng dẫn", "not cross-checked against manual")}</span>
          : <span className="statPill ok">✓ {T("đã đối chiếu với PDF", "cross-checked against PDF")}</span>}
        <span className="legend">
          <span className="sw warn" /> {T("không tăng dần", "not increasing")}
          <span className="sw bad" /> {"min > max"}
          <span className="sw unverified" /> {T("chưa kiểm tra — vui lòng đối chiếu", "unchecked — please verify")}
        </span>
      </div>
      {bandUnverified && (
        <div className="banner warn" style={{ marginBottom: ".5rem" }}>
          {T(
            "⚠ Các giá trị trong dải tuổi này chưa được đối chiếu từng ô với bản PDF gốc — chỉ mới qua kiểm tra tính nhất quán (không trùng, không giảm). Vui lòng so sánh các ô màu đỏ bên dưới với sách hướng dẫn.",
            "⚠ The values in this age band have not been individually cross-checked against the source PDF — only checked for internal consistency (no gaps/overlaps/non-monotonic). Please compare the red cells below against the manual."
          )}
        </div>
      )}

      <div className="gridScroll">
        <table className="pdfGrid">
          <thead>
            <tr>
              <th className="vcol" rowSpan={2}>v</th>
              {GROUPS.map((g) => <th key={g.domain} className="groupHead" colSpan={g.subs.length}>{g.label}</th>)}
            </tr>
            <tr>
              {ALL_SUBS.map((s) => <th key={s.id} className="subHead">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {VSCALES.map((v) => (
              <tr key={v}>
                <th className="vcol">{v}</th>
                {ALL_SUBS.map((s) => {
                  const f = flags[`${s.id}:${v}`];
                  const val = cellText(s.id, v);
                  const cls = f
                    ? `cell ${f}`
                    : val
                      ? bandUnverified ? "cell unverified" : "cell filled"
                      : "cell";
                  return (
                    <td key={s.id} className={cls} title={!f && val && bandUnverified ? T("Chưa đối chiếu với PDF", "Not cross-checked against PDF") : undefined}>
                      <input className="cellInput" value={val} onChange={(e) => setCell(s.id, v, e.target.value)} placeholder="·" />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && <div className={msg.ok ? "banner info" : "banner error"} style={{ marginTop: ".6rem" }}>{msg.text}</div>}

      <details className="stdSection">
        <summary>{T("Bảng B.2 (điểm chuẩn) & ABC — không theo tuổi", "Table B.2 (standard scores) & ABC — age-independent")}</summary>
        {GROUPS.map((g) => (
          <StdRowsEditor key={g.domain} title={g.label} rows={domRows[g.domain] ?? []}
            setRows={(rows) => { setDomRows((s) => ({ ...s, [g.domain]: rows })); setDirty(true); }}
            T={T} sumLabel={T("Tổng điểm v", "Sum of v")} />
        ))}
        <StdRowsEditor title="ABC" rows={compRows} setRows={(r) => { setCompRows(r); setDirty(true); }} T={T} sumLabel={T("Tổng điểm chuẩn", "Sum of standards")} />
      </details>
    </div>
  );
}

// --- helpers ---------------------------------------------------------------

function stdRowsFrom(rows: DomainStandardRow[] | undefined): StdRow[] {
  return (rows ?? []).map((r) => ({ sumVMin: String(r.sumVMin), sumVMax: String(r.sumVMax), standard: String(r.standard), percentile: String(r.percentile) }));
}
function buildStdRows(rows: StdRow[]): DomainStandardRow[] {
  return rows.filter((r) => r.sumVMin && r.sumVMax && r.standard).map((r) => ({
    sumVMin: Number(r.sumVMin), sumVMax: Number(r.sumVMax), standard: Number(r.standard), percentile: Number(r.percentile || 0),
  }));
}
function StdRowsEditor({ title, rows, setRows, T, sumLabel }: {
  title: string; rows: StdRow[]; setRows: (r: StdRow[]) => void;
  T: (vi: string, en: string) => string; sumLabel: string;
}) {
  const add = () => setRows([...rows, { sumVMin: "", sumVMax: "", standard: "", percentile: "" }]);
  const upd = (i: number, patch: Partial<StdRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const del = (i: number) => setRows(rows.filter((_, j) => j !== i));
  return (
    <div className="stdBlock">
      <div className="stdHead"><strong>{title}</strong><button className="ghost small" onClick={add}>+ {T("dòng", "row")}</button></div>
      {rows.length > 0 && (
        <table className="stdTable">
          <thead><tr><th>{sumLabel} {T("từ", "min")}</th><th>{T("đến", "max")}</th><th>{T("Điểm chuẩn", "Standard")}</th><th>%ile</th><th></th></tr></thead>
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
