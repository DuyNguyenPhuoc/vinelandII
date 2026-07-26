// ---------------------------------------------------------------------------
// Vineland scoring engine (pure functions, no React, fully unit-testable).
//
// Pipeline per the survey form's rules:
//   item scores (2/1/0/DK/NO)
//     → subdomain basal & ceiling
//     → subdomain RAW score  (below-basal items credited 2; 2s/1s within range)
//     → v-scale  (norms Table B.1)
//     → domain standard score (norms Table B.2, sum of v-scales)
//     → Adaptive Behavior Composite (norms composite table)
//
// The basal/ceiling implementation follows the Vietnamese form's stated rules:
//   • Basal (sàn): the lowest run of 4 consecutive items scored "2"; everything
//     below is credited 2. If none, item 1 is the floor.
//   • Ceiling (trần): the lowest run of 4 consecutive items scored "0" at/above
//     the basal; everything above is credited 0. If none, the last item is the
//     ceiling.
//   • If DK + unanswered items within the basal–ceiling range exceed 2, the
//     subdomain is not scorable.
// These match the manual's common interpretation; the numeric norms tables must
// still be verified against the licensed manual before clinical use.
// ---------------------------------------------------------------------------

import type {
  AdaptiveLevel,
  AgeBand,
  CompositeResult,
  DomainDef,
  DomainId,
  DomainResult,
  ItemDef,
  ItemScore,
  ItemsPack,
  MaladaptiveLevel,
  NormsPack,
  RangeRow,
  ResponsesMap,
  ScoreReport,
  Session,
  SubdomainResult,
} from "../types";

const RUN = 4; // consecutive items needed to set a basal or ceiling

// ---- Age --------------------------------------------------------------------

/** Whole months between two ISO dates (calendar-accurate), floored. */
export function ageInMonths(birthISO: string, testISO: string): number {
  const b = new Date(birthISO + "T00:00:00");
  const t = new Date(testISO + "T00:00:00");
  if (isNaN(b.getTime()) || isNaN(t.getTime())) return NaN;
  let months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  if (t.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

/** "54" months → "4:6" (years:months). */
export function ageLabel(months: number): string {
  if (isNaN(months)) return "—";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y}:${m}`;
}

// ---- Basal / ceiling / raw --------------------------------------------------

function numeric(score: ItemScore): 2 | 1 | 0 | null {
  return score === 2 || score === 1 || score === 0 ? score : null;
}

/** Index of the first item of the lowest run of `RUN` consecutive items all === target. */
function firstRunStart(scores: (2 | 1 | 0 | null)[], target: 2 | 0): number | null {
  let count = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] === target) {
      count++;
      if (count === RUN) return i - RUN + 1;
    } else {
      count = 0;
    }
  }
  return null;
}

export interface RawResult {
  rawScore: number;
  basalIndex: number; // first credited-2-region boundary (start of basal run), or 0
  ceilingIndex: number; // last item counted (end of ceiling run), or last index
  basalItemNum: number | null;
  ceilingItemNum: number | null;
  dkCount: number;
  noCount: number;
  unansweredInRange: number;
  scorable: boolean;
}

/**
 * Compute raw score and basal/ceiling from a subdomain's items + responses.
 * Items are taken in printed order.
 */
export function computeRaw(items: ItemDef[], responses: ResponsesMap): RawResult {
  const scores = items.map((it) => numeric(responses[it.id] ?? null));

  // Basal: lowest run of 4 consecutive 2s → start of that run. Else item 1 (index 0).
  const basalRun = firstRunStart(scores, 2);
  const basalIndex = basalRun ?? 0;

  // Ceiling: lowest run of 4 consecutive 0s at or after the basal. Else last item.
  let ceilingIndex = items.length - 1;
  {
    const sliced = scores.slice(basalIndex);
    const runInSlice = firstRunStart(sliced, 0);
    if (runInSlice !== null) {
      ceilingIndex = basalIndex + runInSlice + (RUN - 1);
    }
  }

  // Raw score: items below basal credited 2; items above ceiling credited 0;
  // within range, use the numeric score (DK/NO/unanswered contribute 0).
  let raw = 0;
  let dkCount = 0;
  let noCount = 0;
  let unansweredInRange = 0;

  for (let i = 0; i < items.length; i++) {
    if (i < basalIndex) {
      raw += 2;
      continue;
    }
    if (i > ceilingIndex) {
      continue; // credited 0
    }
    const s = responses[items[i].id] ?? null;
    if (s === 2 || s === 1) raw += s;
    else if (s === "DK") dkCount++;
    else if (s === "NO") noCount++;
    else if (s === null) unansweredInRange++;
    // s === 0 adds nothing
  }

  const scorable = dkCount + unansweredInRange <= 2;

  return {
    rawScore: raw,
    basalIndex,
    ceilingIndex,
    basalItemNum: basalRun !== null ? items[basalIndex].num : null,
    ceilingItemNum:
      ceilingIndex < items.length && ceilingIndex >= 0 ? items[ceilingIndex].num : null,
    dkCount,
    noCount,
    unansweredInRange,
    scorable,
  };
}

// ---- Adaptive-level banding -------------------------------------------------

export function levelFromVScale(v: number | null): AdaptiveLevel {
  if (v === null) return "unknown";
  if (v >= 21) return "high";
  if (v >= 18) return "moderatelyHigh";
  if (v >= 13) return "adequate";
  if (v >= 10) return "moderatelyLow";
  return "low";
}

export function levelFromStandard(s: number | null): AdaptiveLevel {
  if (s === null) return "unknown";
  if (s >= 130) return "high";
  if (s >= 115) return "moderatelyHigh";
  if (s >= 86) return "adequate";
  if (s >= 71) return "moderatelyLow";
  return "low";
}

export function maladaptiveLevelFromVScale(v: number | null): MaladaptiveLevel {
  if (v === null) return "unknown";
  if (v >= 21) return "clinicallySignificant";
  if (v >= 18) return "elevated";
  return "average";
}

// ---- Norms lookups ----------------------------------------------------------

function lookupRange<T>(rows: RangeRow<T>[] | undefined, raw: number): T | null {
  if (!Array.isArray(rows)) return null; // defensive: tolerate malformed norms data
  for (const r of rows) if (raw >= r.min && raw <= r.max) return r.value;
  return null;
}

function findAgeBand(norms: NormsPack | null, ageMonths: number): AgeBand | null {
  if (!norms) return null;
  return norms.ageBands.find((b) => ageMonths >= b.minMonths && ageMonths <= b.maxMonths) ?? null;
}

// ---- Full report ------------------------------------------------------------

const COMPOSITE_DOMAINS_UNDER_7: DomainId[] = [
  "communication",
  "dailyLiving",
  "socialization",
  "motor",
];
const COMPOSITE_DOMAINS_7_PLUS: DomainId[] = ["communication", "dailyLiving", "socialization"];

/** The four adaptive-behavior domains (excludes maladaptive). */
const ADAPTIVE_DOMAINS: DomainId[] = ["communication", "dailyLiving", "socialization", "motor"];

export function computeReport(
  session: Session,
  pack: ItemsPack,
  norms: NormsPack | null,
): ScoreReport {
  const ageMonths = ageInMonths(session.examinee.birthDate, session.examinee.testDate);
  const band = findAgeBand(norms, ageMonths);
  const warnings: string[] = [];

  if (!norms) {
    warnings.push("normsMissing");
  } else if (!norms.verified) {
    warnings.push("normsUnverified");
  } else if (!band && !isNaN(ageMonths)) {
    warnings.push("ageOutOfNormRange");
  }
  if (isNaN(ageMonths)) warnings.push("ageInvalid");

  // --- Subdomains ---
  const subResults: SubdomainResult[] = [];
  for (const sd of pack.subdomains) {
    if (sd.domain === "maladaptive") continue; // handled separately if needed
    const raw = computeRaw(sd.items, session.responses);

    let vScale: number | null = null;
    let normsMissing = true;
    if (band) {
      const v = lookupRange(band.rawToVScale[sd.id], raw.rawScore);
      vScale = v;
      normsMissing = band.rawToVScale[sd.id] === undefined;
    }

    let ageEq: number | null = null;
    if (norms?.ageEquivalent) {
      ageEq = lookupRange(norms.ageEquivalent[sd.id], raw.rawScore);
    }

    subResults.push({
      subdomain: sd.id,
      rawScore: raw.rawScore,
      basalItemNum: raw.basalItemNum,
      ceilingItemNum: raw.ceilingItemNum,
      dkCount: raw.dkCount,
      noCount: raw.noCount,
      unansweredInRange: raw.unansweredInRange,
      scorable: raw.scorable,
      vScale: raw.scorable ? vScale : null,
      adaptiveLevel: levelFromVScale(raw.scorable ? vScale : null),
      ageEquivalentMonths: ageEq,
      normsMissing,
    });
  }

  // --- Domains ---
  // Minimum applicable age (months) per subdomain — e.g. Written starts at 3:0,
  // so it's excluded from the Communication total for younger children rather
  // than blanking the whole domain.
  const minAgeMonths = new Map(
    pack.subdomains.map((s) => [s.id, (s.minAgeYears ?? 0) * 12]),
  );
  const domainResults: DomainResult[] = [];
  for (const dom of pack.domains) {
    if (dom.id === "maladaptive") continue;
    const subs = subResults.filter(
      (s) =>
        dom.subdomains.includes(s.subdomain) &&
        ageMonths >= (minAgeMonths.get(s.subdomain) ?? 0), // skip not-yet-applicable subdomains
    );
    const vScales = subs.map((s) => s.vScale);
    const allHaveV = vScales.length > 0 && vScales.every((v) => v !== null);
    const sumV = allHaveV ? (vScales as number[]).reduce((a, b) => a + b, 0) : null;

    let standardScore: number | null = null;
    let percentile: number | null = null;
    let ci95: [number, number] | undefined;
    let normsMissing = true;

    if (norms && sumV !== null) {
      const rows = norms.domainStandard?.[dom.id];
      normsMissing = rows === undefined;
      if (rows) {
        const row = rows.find((r) => sumV >= r.sumVMin && sumV <= r.sumVMax);
        if (row) {
          standardScore = row.standard;
          percentile = row.percentile;
          ci95 = row.ci95;
        }
      }
    }

    domainResults.push({
      domain: dom.id,
      sumVScale: sumV,
      standardScore,
      percentile,
      adaptiveLevel: levelFromStandard(standardScore),
      ci95,
      normsMissing,
    });
  }

  // --- Composite ---
  const contributing =
    ageMonths >= 84 ? COMPOSITE_DOMAINS_7_PLUS : COMPOSITE_DOMAINS_UNDER_7;
  const contribResults = domainResults.filter((d) => contributing.includes(d.domain));
  const standards = contribResults.map((d) => d.standardScore);
  const allStandards =
    standards.length === contributing.length && standards.every((s) => s !== null);
  const sumStandards = allStandards ? (standards as number[]).reduce((a, b) => a + b, 0) : null;

  let compStandard: number | null = null;
  let compPercentile: number | null = null;
  let compNormsMissing = true;
  if (norms?.composite && sumStandards !== null) {
    compNormsMissing = false;
    const row = norms.composite.find(
      (r) => sumStandards >= r.sumVMin && sumStandards <= r.sumVMax,
    );
    if (row) {
      compStandard = row.standard;
      compPercentile = row.percentile;
    }
  }

  const composite: CompositeResult = {
    standardScore: compStandard,
    percentile: compPercentile,
    adaptiveLevel: levelFromStandard(compStandard),
    contributingDomains: contributing,
    normsMissing: compNormsMissing,
  };

  return {
    ageMonths,
    ageLabel: ageLabel(ageMonths),
    subdomains: subResults,
    domains: domainResults,
    composite,
    warnings,
  };
}

// ---- Progress helper (for the UI) ------------------------------------------

/** How many items in a subdomain have a non-null response. */
export function answeredCount(items: ItemDef[], responses: ResponsesMap): number {
  return items.reduce((n, it) => (responses[it.id] != null ? n + 1 : n), 0);
}

export { ADAPTIVE_DOMAINS };
export type { DomainDef };
