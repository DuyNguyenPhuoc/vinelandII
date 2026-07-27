// Minimal bilingual (VI/EN) string table + language context.
import { createContext, useContext } from "react";

export type Lang = "vi" | "en";

type Dict = Record<string, { vi: string; en: string }>;

export const STRINGS: Dict = {
  appTitle: { vi: "Vineland ABS — Thang đo hành vi thích ứng", en: "Vineland ABS — Adaptive Behavior Scales" },
  edition: { vi: "Phiên bản", en: "Edition" },
  form: { vi: "Mẫu", en: "Form" },
  surveyForm: { vi: "Mẫu khảo sát phỏng vấn", en: "Survey Interview Form" },
  language: { vi: "Ngôn ngữ", en: "Language" },
  // steps
  stepSetup: { vi: "Thông tin", en: "Setup" },
  stepInterview: { vi: "Phỏng vấn", en: "Interview" },
  stepResults: { vi: "Kết quả", en: "Results" },
  // examinee
  examinee: { vi: "Người được đánh giá", en: "Examinee" },
  interviewer: { vi: "Người phỏng vấn", en: "Interviewer" },
  fullName: { vi: "Họ và tên", en: "Full name" },
  sex: { vi: "Giới tính", en: "Sex" },
  male: { vi: "Nam", en: "Male" },
  female: { vi: "Nữ", en: "Female" },
  birthDate: { vi: "Ngày sinh", en: "Date of birth" },
  testDate: { vi: "Ngày phỏng vấn", en: "Interview date" },
  idNumber: { vi: "Số căn cước", en: "ID number" },
  diagnosis: { vi: "Chẩn đoán hiện tại", en: "Current diagnosis" },
  respondentName: { vi: "Người trả lời", en: "Respondent" },
  respondentRelation: { vi: "Quan hệ với trẻ", en: "Relation to examinee" },
  role: { vi: "Chức vụ", en: "Role" },
  age: { vi: "Tuổi", en: "Age" },
  start: { vi: "Bắt đầu phỏng vấn", en: "Start interview" },
  // scoring
  score2: { vi: "2 · Thường xuyên", en: "2 · Usually" },
  score1: { vi: "1 · Đôi khi", en: "1 · Sometimes" },
  score0: { vi: "0 · Không bao giờ", en: "0 · Never" },
  scoreDK: { vi: "KB · Không biết", en: "DK · Don't know" },
  scoreNO: { vi: "K/P · Không phù hợp", en: "NO · No opportunity" },
  startPoint: { vi: "Điểm xuất phát theo tuổi", en: "Age start point" },
  guide: { vi: "Hướng dẫn chấm điểm", en: "Scoring guide" },
  // interview nav
  prev: { vi: "Trước", en: "Prev" },
  next: { vi: "Tiếp", en: "Next" },
  answered: { vi: "đã trả lời", en: "answered" },
  viewResults: { vi: "Xem kết quả", en: "View results" },
  // results
  rawScore: { vi: "Điểm thô", en: "Raw" },
  vScale: { vi: "Điểm v", en: "v-scale" },
  standard: { vi: "Điểm chuẩn", en: "Standard" },
  percentile: { vi: "Bách phân vị", en: "%ile" },
  adaptiveLevel: { vi: "Mức độ thích nghi", en: "Adaptive level" },
  ageEquiv: { vi: "Tuổi tương ứng", en: "Age equiv." },
  basal: { vi: "Sàn", en: "Basal" },
  ceiling: { vi: "Trần", en: "Ceiling" },
  composite: { vi: "Tổng hợp hành vi thích ứng (ABC)", en: "Adaptive Behavior Composite" },
  howCalculated: { vi: "Cách tính?", en: "How calculated?" },
  sourceRawCeiling: {
    vi: "Quy tắc sàn/trần/điểm thô: sổ tay Vineland-II, Mẫu khảo sát phỏng vấn (Survey Interview Form)",
    en: "Basal/ceiling/raw rules: Vineland-II manual, Survey Interview Form administration rules",
  },
  sourceB1: {
    vi: "Bảng B.1 — Điểm v theo điểm thô & Khoảng tin cậy 90%, theo dải tuổi (Vineland-II scoring.pdf, Phụ lục B)",
    en: "Table B.1 — Subdomain v-Scale Scores & 90% Conf. Int., by age band (Vineland-II scoring.pdf, Appendix B)",
  },
  sourceB2Domain: {
    vi: "Bảng B.2 — Điểm chuẩn lĩnh vực theo tổng điểm v & Khoảng tin cậy 95%, theo dải tuổi (Vineland-II scoring.pdf, Phụ lục B)",
    en: "Table B.2 — Domain Standard Scores & 95% Conf. Int., by age band (Vineland-II scoring.pdf, Appendix B)",
  },
  sourceB2Composite: {
    vi: "Bảng B.2 — Điểm ABC theo tổng điểm chuẩn lĩnh vực, theo dải tuổi (Vineland-II scoring.pdf, Phụ lục B)",
    en: "Table B.2 — ABC Composite from sum of domain standards, by age band (Vineland-II scoring.pdf, Appendix B)",
  },
  notScorable: { vi: "Không tính điểm (quá 2 mục KB/bỏ trống)", en: "Not scorable (>2 DK/blank)" },
  normsMissing: { vi: "Chưa nạp bảng chuẩn — chỉ hiển thị điểm thô", en: "Norms not loaded — raw scores only" },
  normsUnverified: { vi: "Bảng chuẩn CHƯA được kiểm định", en: "Norms NOT verified" },
  // levels
  lvl_high: { vi: "Cao", en: "High" },
  lvl_moderatelyHigh: { vi: "Trung bình cao", en: "Moderately High" },
  lvl_adequate: { vi: "Trung bình", en: "Adequate" },
  lvl_moderatelyLow: { vi: "Trung bình thấp", en: "Moderately Low" },
  lvl_low: { vi: "Thấp", en: "Low" },
  lvl_unknown: { vi: "—", en: "—" },
  // drive / session
  save: { vi: "Lưu", en: "Save" },
  saveDrive: { vi: "Lưu vào Google Drive", en: "Save to Google Drive" },
  openDrive: { vi: "Mở từ Google Drive", en: "Open from Google Drive" },
  saveFile: { vi: "Tải file .json", en: "Download .json" },
  openFile: { vi: "Mở file .json", en: "Open .json file" },
  signIn: { vi: "Đăng nhập Google", en: "Sign in to Google" },
  signOut: { vi: "Đăng xuất", en: "Sign out" },
  driveNotConfigured: {
    vi: "Chưa cấu hình Google Client ID (xem README).",
    en: "Google Client ID not configured (see README).",
  },
  autosaved: { vi: "Đã tự lưu tạm trên máy", en: "Auto-saved locally" },
  incompletePack: {
    vi: "Bộ dữ liệu mục đang ở bản mẫu (chỉ 1 tiểu lĩnh vực). Cần bổ sung đủ mục & bảng chuẩn.",
    en: "Item data is a sample (1 subdomain). Full items & norms still needed.",
  },
  draftData: {
    vi: "Cấu trúc 433 mục đã được kiểm định. Nội dung mục (trừ Tiếp nhận) là bản trích tự động — hãy đối chiếu với phiếu giấy. Bảng chuẩn chưa nạp.",
    en: "All 433 items verified structurally. Item text (except Receptive) is machine-extracted — verify against the paper form. Norms not loaded.",
  },
  draftBadge: { vi: "bản nháp", en: "draft" },
  verifiedBadge: { vi: "đã kiểm định", en: "verified" },
  disclaimer: {
    vi: "Công cụ hỗ trợ; chấm điểm/diễn giải phải do chuyên gia đủ điều kiện thực hiện theo sổ tay gốc.",
    en: "Assistive tool; scoring/interpretation must be done by a qualified professional using the official manual.",
  },
};

export function t(key: keyof typeof STRINGS, lang: Lang): string {
  const e = STRINGS[key];
  return e ? e[lang] : String(key);
}

export const LangContext = createContext<Lang>("vi");
export const useLang = () => useContext(LangContext);
export const useT = () => {
  const lang = useLang();
  return (key: keyof typeof STRINGS) => t(key, lang);
};
