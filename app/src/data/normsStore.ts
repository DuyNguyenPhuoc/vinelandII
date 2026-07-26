// ---------------------------------------------------------------------------
// Norms store: import, validate, persist, and load user-supplied norms packs.
//
// The conversion tables (raw→v-scale→standard→percentile→age-equivalent) are
// Pearson's copyrighted material. This app does NOT ship them. Instead, the user
// digitizes the tables they need from their own licensed manual into a JSON file
// (see docs/norms.template.json) and imports it here. The values are validated
// (coverage, monotonicity) and stored locally in the browser — never uploaded.
// ---------------------------------------------------------------------------

import type { DomainId, Edition, NormsPack, SubdomainId } from "../types";

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

export function saveNorms(edition: Edition, pack: NormsPack): void {
  localStorage.setItem(KEY_PREFIX + edition, JSON.stringify(pack));
}

export function loadNorms(edition: Edition): NormsPack | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + edition);
    return raw ? (JSON.parse(raw) as NormsPack) : null;
  } catch {
    return null;
  }
}

export function clearNorms(edition: Edition): void {
  localStorage.removeItem(KEY_PREFIX + edition);
}
