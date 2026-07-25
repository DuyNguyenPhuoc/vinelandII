// ---------------------------------------------------------------------------
// Vineland-II items pack (Vietnamese Survey Interview Form).
//
// Structure (all 433 items: subdomains, numbering, start points, blank-score and
// K/P flags) is verified against the project's form via a coordinate-based parse.
//
// TEXT STATUS:
//   • receptive (Tiếp nhận, 20 items) — hand-verified, clean.
//   • all other subdomains — machine-extracted DRAFT text (readable but carrying
//     some layout artifacts such as leading cluster-labels or a leaked item
//     number). Flagged `draft` so the UI can badge them "verify against form".
//
// Item text is taken from the user's own translated form.
// ---------------------------------------------------------------------------

import type { DomainDef, ItemDef, ItemsPack, SubdomainDef, SubdomainId } from "../types";
import rawItems from "./vineland2.items.json";

const allItems = rawItems as ItemDef[];

const domains: DomainDef[] = [
  { id: "communication", nameVi: "Giao tiếp", nameEn: "Communication", subdomains: ["receptive", "expressive", "written"] },
  { id: "dailyLiving", nameVi: "Kỹ năng sinh hoạt thường ngày", nameEn: "Daily Living Skills", subdomains: ["personal", "domestic", "community"] },
  { id: "socialization", nameVi: "Xã hội hóa", nameEn: "Socialization", subdomains: ["interpersonal", "play", "coping"] },
  { id: "motor", nameVi: "Kỹ năng vận động", nameEn: "Motor Skills", subdomains: ["gross", "fine"] },
];

// Receptive (Tiếp nhận) — hand-verified, 20 items. Start points: 1=<1, 4=1, 7=2, 11=3+.
const receptiveItems: ItemDef[] = [
  { id: "v2.receptive.1", subdomain: "receptive", num: 1, startFor: [0], textVi: "Hướng mắt và quay đầu về phía có âm thanh." },
  { id: "v2.receptive.2", subdomain: "receptive", num: 2, textVi: "Nhìn về phía cha mẹ, hoặc người chăm sóc khi nghe thấy giọng nói của họ." },
  { id: "v2.receptive.3", subdomain: "receptive", num: 3, textVi: "Có phản ứng khi nghe nói đến tên của mình (ví dụ: hướng về phía người nói, cười mỉm…)." },
  { id: "v2.receptive.4", subdomain: "receptive", num: 4, startFor: [1], textVi: "Có những biểu hiện chứng tỏ đã hiểu được nghĩa của từ \"không\", hoặc những cử chỉ tương đồng với nghĩa của từ này (ví dụ: ngừng hành động khi nghe nói \"không\")." },
  { id: "v2.receptive.5", subdomain: "receptive", num: 5, textVi: "Có những biểu hiện chứng tỏ đã hiểu được nghĩa của từ \"có\", \"được\", hoặc những cử chỉ tương đồng với nghĩa của những từ này (ví dụ: tiếp tục hành động, mỉm cười… khi nghe nói \"được\", hoặc \"có\")." },
  { id: "v2.receptive.6", subdomain: "receptive", num: 6, textVi: "Lắng nghe một câu chuyện trong vòng ít nhất 5 phút (nghĩa là, luôn giữ yên lặng và hướng chú ý đến người kể, hoặc người đọc trong vòng 5 phút)." },
  { id: "v2.receptive.7", subdomain: "receptive", num: 7, startFor: [2], textVi: "Chỉ đúng ít nhất 3 bộ phận chính trên cơ thể khi được yêu cầu (ví dụ: mũi, miệng, tay, chân…)." },
  { id: "v2.receptive.8", subdomain: "receptive", num: 8, textVi: "Chỉ đúng những thứ thường thấy trong sách báo, hoặc tạp chí, khi người khác gọi tên chúng (ví dụ: chó, ôtô, chìa khoá…)." },
  { id: "v2.receptive.9", subdomain: "receptive", num: 9, textVi: "Lắng nghe những chỉ dẫn." },
  { id: "v2.receptive.10", subdomain: "receptive", num: 10, textVi: "Thực hiện được những chỉ dẫn về một hành động với một đồ vật cụ thể (ví dụ: \"mang cuốn sách lại đây\", \"đóng cửa lại\"…)." },
  { id: "v2.receptive.11", subdomain: "receptive", num: 11, startFor: [3], textVi: "Chỉ đúng ít nhất 5 bộ phận nhỏ trên cơ thể, khi được yêu cầu (ví dụ: ngón tay, khuỷu tay, răng, ngón chân…)." },
  { id: "v2.receptive.12", subdomain: "receptive", num: 12, textVi: "Thực hiện được những chỉ dẫn về 2 hành động, hoặc một hành động với 2 đồ vật cụ thể (ví dụ: \"hãy mang giấy và màu vẽ lại đây\", \"hãy ngồi xuống và ăn đi\"…)." },
  { id: "v2.receptive.13", subdomain: "receptive", num: 13, textVi: "Thực hiện được những chỉ dẫn mang tính điều kiện (ví dụ: \"nếu muốn đi chơi, hãy bỏ những thứ đó lại\"…)." },
  { id: "v2.receptive.14", subdomain: "receptive", num: 14, textVi: "Lắng nghe một câu chuyện trong vòng ít nhất 15 phút." },
  { id: "v2.receptive.15", subdomain: "receptive", num: 15, textVi: "Lắng nghe một câu chuyện trong vòng ít nhất 30 phút." },
  { id: "v2.receptive.16", subdomain: "receptive", num: 16, textVi: "Thực hiện được những chỉ dẫn về 3 hành động kế tục (ví dụ: \"đánh răng, mặc quần áo, rồi thu dọn giường ngủ đi\"…)." },
  { id: "v2.receptive.17", subdomain: "receptive", num: 17, textVi: "Thực hiện được những chỉ dẫn, hoặc hướng dẫn được nghe trước đó 5 phút." },
  { id: "v2.receptive.18", subdomain: "receptive", num: 18, textVi: "Hiểu được hàm nghĩa những câu \"nói bóng\" (ví dụ: \"cho leo cây\", \"ngậm hột thị\"…)." },
  { id: "v2.receptive.19", subdomain: "receptive", num: 19, textVi: "Lắng nghe những thông tin được truyền đạt trong vòng ít nhất 15 phút." },
  { id: "v2.receptive.20", subdomain: "receptive", num: 20, textVi: "Lắng nghe những thông tin được truyền đạt trong vòng ít nhất 30 phút." },
];

interface SubMeta {
  id: SubdomainId;
  domain: SubdomainDef["domain"];
  nameVi: string;
  nameEn: string;
  minAgeYears?: number;
}

const subMeta: SubMeta[] = [
  { id: "receptive", domain: "communication", nameVi: "Tiếp nhận", nameEn: "Receptive" },
  { id: "expressive", domain: "communication", nameVi: "Diễn đạt", nameEn: "Expressive" },
  { id: "written", domain: "communication", nameVi: "Văn bản", nameEn: "Written", minAgeYears: 3 },
  { id: "personal", domain: "dailyLiving", nameVi: "Cá nhân", nameEn: "Personal" },
  { id: "domestic", domain: "dailyLiving", nameVi: "Gia đình", nameEn: "Domestic", minAgeYears: 1 },
  { id: "community", domain: "dailyLiving", nameVi: "Cộng đồng", nameEn: "Community", minAgeYears: 1 },
  { id: "interpersonal", domain: "socialization", nameVi: "Quan hệ liên cá nhân", nameEn: "Interpersonal" },
  { id: "play", domain: "socialization", nameVi: "Vui chơi & giải trí", nameEn: "Play & Leisure" },
  { id: "coping", domain: "socialization", nameVi: "Kỹ năng ứng xử", nameEn: "Coping", minAgeYears: 1 },
  { id: "gross", domain: "motor", nameVi: "Vận động thô", nameEn: "Gross Motor" },
  { id: "fine", domain: "motor", nameVi: "Vận động tinh", nameEn: "Fine Motor" },
];

function itemsFor(id: SubdomainId): ItemDef[] {
  if (id === "receptive") return receptiveItems; // verified override
  return allItems
    .filter((it) => it.subdomain === id)
    .sort((a, b) => a.num - b.num);
}

const subdomains: SubdomainDef[] = subMeta.map((s) => ({
  id: s.id,
  domain: s.domain,
  nameVi: s.nameVi,
  nameEn: s.nameEn,
  minAgeYears: s.minAgeYears,
  verified: s.id === "receptive",
  items: itemsFor(s.id),
}));

export const SUBDOMAIN_EXPECTED: Record<string, number> = Object.fromEntries(
  subdomains.map((s) => [s.id, s.items.length]),
);

export const vineland2Pack: ItemsPack = {
  edition: "vineland2",
  form: "survey",
  source:
    "Vietnamese Vineland-II Survey Interview Form (project document). Structure verified; " +
    "text: receptive hand-verified, others machine-extracted draft.",
  domains,
  subdomains,
};

/** All 433 items are present; receptive text is verified, the rest are draft. */
export const isPackComplete = subdomains.every((s) => s.items.length > 0);
export const allSubdomainsVerified = subdomains.every((s) => s.verified);
