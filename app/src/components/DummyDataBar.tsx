import { useState } from "react";
import type { ItemsPack, Session } from "../types";
import { useLang } from "../i18n";
import { FIXTURES, buildFixtureSession } from "../data/fixtures";

interface Props {
  pack: ItemsPack;
  onLoad: (s: Session) => void;
  onLoadDemoNorms: () => void;
}

/** A collapsible picker for loading synthetic test sessions. */
export function DummyDataBar({ pack, onLoad, onLoadDemoNorms }: Props) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const T = (vi: string, en: string) => (lang === "vi" ? vi : en);

  return (
    <div className="dummyBar">
      <button className="dummyToggle" onClick={() => setOpen((o) => !o)}>
        🧪 {T("Dữ liệu thử nghiệm", "Test data")} {open ? "▲" : "▼"}
      </button>
      {open && (
        <>
          <div className="dummyHint">
            {T(
              "Chọn một hồ sơ mẫu để nạp nhanh (dữ liệu giả, chỉ để kiểm thử).",
              "Pick a sample profile to load instantly (fictitious data, testing only).",
            )}
          </div>
          <div className="demoNormsRow">
            <button className="ghost small" onClick={onLoadDemoNorms}>
              🔧 {T("Nạp bảng chuẩn DEMO (số giả)", "Load DEMO norms (fake numbers)")}
            </button>
            <span className="dummyDesc">
              {T(
                "Chỉ để xem toàn bộ cột kết quả hoạt động — KHÔNG phải chuẩn thật.",
                "Just to see every result column work — NOT real norms.",
              )}
            </span>
          </div>
          <div className="dummyGrid">
            {FIXTURES.map((f) => (
              <button
                key={f.id}
                className="dummyCard"
                onClick={() => onLoad(buildFixtureSession(f, pack))}
                title={lang === "vi" ? f.descVi : f.descEn}
              >
                <span className="dummyLabel">{lang === "vi" ? f.labelVi : f.labelEn}</span>
                <span className="dummyDesc">{lang === "vi" ? f.descVi : f.descEn}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
