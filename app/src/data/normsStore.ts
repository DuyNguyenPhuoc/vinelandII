// ---------------------------------------------------------------------------
// Norms store: import, validate, persist, and load user-supplied norms packs.
//
// The conversion tables (raw→v-scale→standard→percentile→age-equivalent) are
// Pearson's copyrighted material. This app does NOT ship them. Instead, the user
// digitizes the tables they need from their own licensed manual into a JSON file
// (see docs/norms.template.json) and imports it here. The values are validated
// (coverage, monotonicity) and stored locally in the browser — never uploaded.
// ---------------------------------------------------------------------------

import type { DomainId, Edition, NormsPack, RangeRow, SubdomainId } from "../types";
import defaultVineland2Norms from "../../docs/norms.vineland2.local.json";

const KEY_PREFIX = "vineland.norms.";

const DOMAIN_IDS: DomainId[] = ["communication", "dailyLiving", "socialization", "motor"];
const SUBDOMAIN_IDS: SubdomainId[] = [
  "receptive", "expressive", "written",
  "personal", "domestic", "community",
  "interpersonal", "play", "coping",
  "gross", "fine",
];

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Quick summary for the UI. */
  summary: { ageBands: number; subdomainsCovered: number; domainsCovered: number };
}

/** Structural + sanity validation of an imported norms pack. */
export function validateNormsPack(data: unknown, edition: Edition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const covSub = new Set<string>();
  const covDom = new Set<string>();

  const p = data as NormsPack;
  if (!p || typeof p !== "object") {
    return { ok: false, errors: ["File is not a JSON object."], warnings: [], summary: { ageBands: 0, subdomainsCovered: 0, domainsCovered: 0 } };
  }
  if (p.edition !== edition) {
    errors.push(`Pack edition "${p.edition}" ≠ selected edition "${edition}".`);
  }
  if (!Array.isArray(p.ageBands) || p.ageBands.length === 0) {
    errors.push("No ageBands.");
  } else {
    p.ageBands.forEach((b, i) => {
      if (!(b.minMonths <= b.maxMonths)) errors.push(`ageBands[${i}]: minMonths > maxMonths.`);
      if (!b.rawToVScale || Object.keys(b.rawToVScale).length === 0) {
        errors.push(`ageBands[${i}]: no rawToVScale rows.`);
      } else {
        for (const sid of Object.keys(b.rawToVScale) as SubdomainId[]) {
          if (!SUBDOMAIN_IDS.includes(sid)) warnings.push(`ageBands[${i}]: unknown subdomain "${sid}".`);
          covSub.add(sid);
          const rows = b.rawToVScale[sid]!;
          for (const r of rows) {
            if (r.min > r.max) errors.push(`ageBands[${i}].${sid}: row min>max (${r.min}>${r.max}).`);
          }
        }
      }
    });
  }

  if (p.domainStandard) {
    for (const did of Object.keys(p.domainStandard) as DomainId[]) {
      if (!DOMAIN_IDS.includes(did)) warnings.push(`domainStandard: unknown domain "${did}".`);
      covDom.add(did);
      for (const r of p.domainStandard[did]!) {
        if (r.sumVMin > r.sumVMax) errors.push(`domainStandard.${did}: sumVMin>sumVMax.`);
      }
    }
  } else {
    warnings.push("No domainStandard table — domain standard scores will be blank.");
  }

  if (!p.composite) warnings.push("No composite table — ABC will be blank.");
  if (!p.ageEquivalent) warnings.push("No ageEquivalent table — age-equivalents will be blank.");
  if (!p.verified) warnings.push("Pack is marked verified:false — double-check values against the manual before clinical use.");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: { ageBands: p.ageBands?.length ?? 0, subdomainsCovered: covSub.size, domainsCovered: covDom.size },
  };
}

// --- Format normalization ---------------------------------------------------
// Accept alternate shapes some converters produce and coerce to the canonical
// NormsPack (so users don't have to re-transcribe). Currently handles
// `ageEquivalent` given as { "<rawScore>": "<Y:M>"|<months> } instead of
// [ { min, max, value(months) } ].

function toMonths(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.trim();
    const m = s.match(/^(\d+)\s*:\s*(\d+)$/);
    if (m) return Number(m[1]) * 12 + Number(m[2]);
    if (/^\d+$/.test(s)) return Number(s);
  }
  return null;
}

function normalizeAgeEq(val: unknown): RangeRow<number>[] {
  if (Array.isArray(val)) {
    return val
      .map((r) => ({ min: r.min, max: r.max, value: toMonths(r.value) ?? r.value }))
      .filter((r) => typeof r.value === "number");
  }
  if (val && typeof val === "object") {
    const entries: [number, number][] = [];
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const raw = Number(k);
      const months = toMonths(v);
      if (!Number.isNaN(raw) && months !== null) entries.push([raw, months]);
    }
    entries.sort((a, b) => a[0] - b[0]);
    const rows: RangeRow<number>[] = [];
    for (const [raw, months] of entries) {
      const last = rows[rows.length - 1];
      if (last && last.value === months && raw === last.max + 1) last.max = raw;
      else rows.push({ min: raw, max: raw, value: months });
    }
    return rows;
  }
  return [];
}

// Accept `sumStandardMin/Max` (used for the ABC composite, which sums standard
// scores) as aliases for the canonical `sumVMin/Max`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStdRows(rows: any): any {
  if (!Array.isArray(rows)) return rows;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    ...r,
    sumVMin: r.sumVMin ?? r.sumStandardMin ?? r.sumScoreMin,
    sumVMax: r.sumVMax ?? r.sumStandardMax ?? r.sumScoreMax,
  }));
}

/** Coerce a parsed file into the canonical NormsPack shape. */
export function normalizeNormsPack<T extends Partial<NormsPack>>(input: T): T {
  const p = input;
  if (p.ageEquivalent && typeof p.ageEquivalent === "object") {
    const norm: Partial<Record<SubdomainId, RangeRow<number>[]>> = {};
    for (const [sid, val] of Object.entries(p.ageEquivalent)) {
      norm[sid as SubdomainId] = normalizeAgeEq(val);
    }
    p.ageEquivalent = norm;
  }
  if (p.composite) p.composite = normalizeStdRows(p.composite);
  if (p.domainStandard && typeof p.domainStandard === "object") {
    const ds = p.domainStandard as Record<string, unknown>;
    for (const k of Object.keys(ds)) ds[k] = normalizeStdRows(ds[k]);
  }
  return p;
}

export function saveNorms(edition: Edition, pack: NormsPack): void {
  localStorage.setItem(KEY_PREFIX + edition, JSON.stringify(pack));
}

export function loadNorms(edition: Edition): NormsPack | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + edition);
    if (raw) return normalizeNormsPack(JSON.parse(raw) as NormsPack);
    if (edition === "vineland2") return normalizeNormsPack(defaultVineland2Norms as unknown as NormsPack);
    return null;
  } catch {
    if (edition === "vineland2") return normalizeNormsPack(defaultVineland2Norms as unknown as NormsPack);
    return null;
  }
}

export function clearNorms(edition: Edition): void {
  localStorage.removeItem(KEY_PREFIX + edition);
}
