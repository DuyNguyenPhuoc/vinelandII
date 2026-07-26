import { useState } from "react";
import type { Edition, NormsPack } from "../types";
import { useLang } from "../i18n";
import { clearNorms, loadNorms, normalizeNormsPack, saveNorms, validateNormsPack, type ValidationResult } from "../data/normsStore";

interface Props {
  edition: Edition;
  onChange: (pack: NormsPack | null) => void;
}

export function NormsBar({ edition, onChange }: Props) {
  const lang = useLang();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const loaded = loadNorms(edition);

  const T = (vi: string, en: string) => (lang === "vi" ? vi : en);

  const onFile = async (file: File) => {
    setResult(null);
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setResult({ ok: false, errors: [T("File JSON không hợp lệ.", "Invalid JSON file.")], warnings: [], summary: { ageBands: 0, subdomainsCovered: 0, domainsCovered: 0 } });
      return;
    }
    const pack = normalizeNormsPack(data as NormsPack);
    const res = validateNormsPack(pack, edition);
    setResult(res);
    if (res.ok) {
      saveNorms(edition, pack);
      onChange(pack);
    }
  };

  return (
    <div className="normsBar">
      <div className="normsRow">
        <span className="normsLabel">
          {T("Bảng chuẩn", "Norms")} ({edition === "vineland2" ? "Vineland-II" : "Vineland-3"}):
          {loaded ? (
            <strong className="ok"> {T("đã nạp", "loaded")}{loaded.verified ? " ✓" : " (unverified)"}</strong>
          ) : (
            <strong className="none"> {T("chưa nạp", "not loaded")}</strong>
          )}
        </span>
        <label className="fileOpen small">
          {T("Nạp bảng chuẩn (.json)", "Import norms (.json)")}
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {loaded && (
          <button className="ghost" onClick={() => { clearNorms(edition); onChange(null); setResult(null); }}>
            {T("Xoá", "Clear")}
          </button>
        )}
      </div>

      {result && (
        <div className={result.ok ? "banner info" : "banner error"}>
          {result.ok
            ? T(
                `Đã nạp: ${result.summary.ageBands} dải tuổi, ${result.summary.subdomainsCovered} tiểu lĩnh vực.`,
                `Loaded: ${result.summary.ageBands} age band(s), ${result.summary.subdomainsCovered} subdomain(s).`,
              )
            : result.errors.join(" ")}
          {result.warnings.length > 0 && (
            <div className="small" style={{ marginTop: ".3rem" }}>
              ⚠ {result.warnings.slice(0, 4).join(" ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
