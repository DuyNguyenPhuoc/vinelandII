// ---------------------------------------------------------------------------
// Dummy test data.
//
// 10 synthetic examinee profiles spanning ages and clinical patterns, for
// exercising the interview → scoring → results flow (and edge cases like
// "not scorable" and "in progress"). Responses are generated from a per-
// subdomain "reach" (how far up the item ladder the person passes), which
// yields realistic basal (leading 2s) and ceiling (trailing 0s) behaviour.
//
// All data is fictitious — no real people.
// ---------------------------------------------------------------------------

import type {
  DomainId,
  Examinee,
  ItemScore,
  ItemsPack,
  ResponsesMap,
  Session,
  SubdomainId,
} from "../types";
import { APP_VERSION } from "../config";
import { SESSION_SCHEMA_VERSION } from "../types";

const TEST_DATE = "2024-06-15";

/** reach fraction per subdomain (0..1 of its item count); `_default` fills the rest. */
type Reach = Partial<Record<SubdomainId, number>> & { _default: number };

export interface Fixture {
  id: string;
  labelVi: string;
  labelEn: string;
  descVi: string;
  descEn: string;
  examinee: Pick<Examinee, "name" | "sex" | "birthDate"> & Partial<Examinee>;
  reach: Reach;
  /** Subdomains to sprinkle with "DK" (KB) answers to force the not-scorable path. */
  kb?: SubdomainId[];
  /** Restrict answers to these domains (e.g. an in-progress interview). */
  onlyDomains?: DomainId[];
}

function fracFor(reach: Reach, sid: SubdomainId): number {
  return reach[sid] ?? reach._default;
}

function buildResponses(f: Fixture, pack: ItemsPack): ResponsesMap {
  const r: ResponsesMap = {};
  const allowedDomains = f.onlyDomains;
  for (const sd of pack.subdomains) {
    if (allowedDomains && !allowedDomains.includes(sd.domain)) continue;
    const n = sd.items.length;
    if (n === 0) continue;
    const reachN = Math.round(fracFor(f.reach, sd.id) * n);
    const kbSub = f.kb?.includes(sd.id);
    sd.items.forEach((it, i) => {
      const num = i + 1;
      let score: ItemScore;
      if (kbSub && num > reachN && num <= reachN + 3) {
        score = "DK"; // force >2 DK in range → not scorable
      } else if (num <= reachN - 2) {
        score = 2;
      } else if (num <= reachN) {
        score = 1;
      } else {
        score = 0;
      }
      r[it.id] = score;
    });
  }
  return r;
}

export function buildFixtureSession(f: Fixture, pack: ItemsPack): Session {
  const now = new Date().toISOString();
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    edition: "vineland2",
    form: "survey",
    examinee: {
      testDate: TEST_DATE,
      diagnosis: "",
      notes: "Dummy test data — fictitious.",
      ...f.examinee,
    },
    interviewer: { name: "Người phỏng vấn thử", role: "Tester" },
    responses: buildResponses(f, pack),
    criticalSeverity: {},
    createdAt: now,
    updatedAt: now,
  };
}

// --- The 10 profiles --------------------------------------------------------

export const FIXTURES: Fixture[] = [
  {
    id: "typical-4y",
    labelVi: "Phát triển điển hình · 4 tuổi",
    labelEn: "Typical development · 4y",
    descVi: "Trẻ 4 tuổi phát triển bình thường, điểm đồng đều các lĩnh vực.",
    descEn: "Typically-developing 4-year-old, even profile across domains.",
    examinee: { name: "Bé An (điển hình)", sex: "female", birthDate: "2020-06-15" },
    reach: { _default: 0.62 },
  },
  {
    id: "global-delay-4y6m",
    labelVi: "Chậm phát triển toàn diện · 4:6",
    labelEn: "Global delay · 4:6",
    descVi: "Hồ sơ phẳng, thấp toàn diện; có 1 tiểu lĩnh vực nhiều KB (không tính điểm).",
    descEn: "Flat, globally low profile; one subdomain has many DK (not scorable).",
    examinee: { name: "Bé Bảo (chậm toàn diện)", sex: "male", birthDate: "2019-12-15", diagnosis: "Theo dõi chậm phát triển" },
    reach: { _default: 0.4, written: 0.7, receptive: 0.45, expressive: 0.28, interpersonal: 0.2, coping: 0.2 },
    kb: ["community"],
  },
  {
    id: "asd-pattern-5y",
    labelVi: "Mẫu tự kỷ · 5 tuổi",
    labelEn: "ASD pattern · 5y",
    descVi: "Xã hội hoá thấp nhất, kỹ năng viết vượt trội (đảo pha).",
    descEn: "Socialization the weakest; a written-skill spike (splinter).",
    examinee: { name: "Bé Minh (mẫu ASD)", sex: "male", birthDate: "2019-06-15", diagnosis: "ASD (nghi ngờ)" },
    reach: { _default: 0.5, written: 0.92, receptive: 0.55, expressive: 0.4, interpersonal: 0.18, play: 0.3, coping: 0.22 },
  },
  {
    id: "toddler-2y",
    labelVi: "Trẻ mới biết đi · 2 tuổi",
    labelEn: "Toddler · 2y",
    descVi: "Trẻ 2 tuổi điển hình; kiểm tra dải tuổi nhỏ.",
    descEn: "Typical 2-year-old; exercises the young age band.",
    examinee: { name: "Bé Na (2 tuổi)", sex: "female", birthDate: "2022-06-15" },
    reach: { _default: 0.34 },
  },
  {
    id: "typical-8y",
    labelVi: "Phát triển điển hình · 8 tuổi",
    labelEn: "Typical development · 8y",
    descVi: "Trẻ 8 tuổi; kiểm tra hợp thành 3 lĩnh vực (không có Vận động).",
    descEn: "8-year-old; exercises the 3-domain composite (no Motor).",
    examinee: { name: "Bé Khoa (8 tuổi)", sex: "male", birthDate: "2016-06-15" },
    reach: { _default: 0.84 },
  },
  {
    id: "motor-delay-6y",
    labelVi: "Chậm vận động đơn thuần · 6 tuổi",
    labelEn: "Isolated motor delay · 6y",
    descVi: "Các lĩnh vực khác bình thường, riêng vận động thấp.",
    descEn: "Other domains typical, motor skills notably low.",
    examinee: { name: "Bé Linh (chậm vận động)", sex: "female", birthDate: "2018-06-15" },
    reach: { _default: 0.78, gross: 0.35, fine: 0.4 },
  },
  {
    id: "language-gap-3y6m",
    labelVi: "Chênh ngôn ngữ · 3:6",
    labelEn: "Language gap · 3:6",
    descVi: "Diễn đạt ≪ Tiếp nhận (hiểu nhiều hơn nói).",
    descEn: "Expressive ≪ Receptive (understands more than expresses).",
    examinee: { name: "Bé Trí (chênh ngôn ngữ)", sex: "male", birthDate: "2020-12-15" },
    reach: { _default: 0.55, receptive: 0.72, expressive: 0.32, written: 0.25 },
  },
  {
    id: "high-6y",
    labelVi: "Năng lực cao · 6 tuổi",
    labelEn: "High functioning · 6y",
    descVi: "Điểm cao đều; kiểm tra mức trần và điểm chuẩn cao.",
    descEn: "Uniformly high; exercises high ceilings/standard scores.",
    examinee: { name: "Bé Hà (năng lực cao)", sex: "female", birthDate: "2018-06-15" },
    reach: { _default: 0.93 },
  },
  {
    id: "severe-delay-3y",
    labelVi: "Chậm nặng · 3 tuổi",
    labelEn: "Severe delay · 3y",
    descVi: "Điểm rất thấp toàn diện; nhiều mục 0.",
    descEn: "Very low across the board; many 0s.",
    examinee: { name: "Bé Phúc (chậm nặng)", sex: "male", birthDate: "2021-06-15", diagnosis: "Chậm phát triển nặng" },
    reach: { _default: 0.18 },
  },
  {
    id: "in-progress-4y",
    labelVi: "Đang phỏng vấn dở · 4 tuổi",
    labelEn: "In-progress · 4y",
    descVi: "Chỉ mới chấm lĩnh vực Giao tiếp; kiểm tra trạng thái làm dở.",
    descEn: "Only Communication scored so far; tests the partial state.",
    examinee: { name: "Bé Chi (đang làm dở)", sex: "female", birthDate: "2020-06-15" },
    reach: { _default: 0.6 },
    onlyDomains: ["communication"],
  },
];
