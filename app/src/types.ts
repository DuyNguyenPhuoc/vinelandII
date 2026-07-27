// ---------------------------------------------------------------------------
// Vineland ABS — domain model
//
// The app is "edition-pluggable": each edition (Vineland-II, Vineland-3) is a
// pair of data packs — an ITEMS pack (what the examiner scores) and a NORMS
// pack (the copyrighted conversion tables, supplied by the user from their
// licensed manual). The engine is pure and edition-agnostic; it only consumes
// these packs.
// ---------------------------------------------------------------------------

export type Edition = "vineland2" | "vineland3";

/** Only the Survey Interview Form is implemented for now. */
export type FormType = "survey" | "parentCaregiver" | "expanded" | "teacher";

export type DomainId =
  | "communication"
  | "dailyLiving"
  | "socialization"
  | "motor"
  | "maladaptive";

export type SubdomainId =
  // Communication
  | "receptive"
  | "expressive"
  | "written"
  // Daily Living Skills
  | "personal"
  | "domestic"
  | "community"
  // Socialization
  | "interpersonal"
  | "play"
  | "coping"
  // Motor
  | "gross"
  | "fine"
  // Maladaptive (optional)
  | "internalizing"
  | "externalizing"
  | "maladaptiveOther"
  | "maladaptiveCritical";

/** A single raw item score. `null` = not yet answered. */
export type ItemScore = 2 | 1 | 0 | "DK" | "NO" | null;
//  2  = usually/independently (Thường xuyên)
//  1  = sometimes/partially   (Đôi khi, hoặc phần nào đó)
//  0  = never/not independently (Không bao giờ)
//  DK = don't know            (KB — Không biết)
//  NO = no opportunity / N/A  (K/P — Không phù hợp)

/** Severity flag for Maladaptive "critical items" (T = severe, N = mild). */
export type CriticalSeverity = "severe" | "mild" | null;

export interface ItemDef {
  /** Stable id, e.g. "v2.receptive.7". */
  id: string;
  subdomain: SubdomainId;
  /** Item number as printed within its subdomain. */
  num: number;
  /** Item text (Vietnamese, from the translated survey form). */
  textVi: string;
  /** Optional content-cluster label within the subdomain (Vietnamese). */
  cluster?: string;
  /**
   * Ages (in whole years) for which this item is a START point.
   * From the form's start-point markers (e.g. `<1→`, `2→`, `3+→`).
   * "3+" is modeled as { from: 3 } meaning "start here for age 3 and up".
   */
  startFor?: number[];
  /** True when this item's scoring rules explicitly allow the "NO" (K/P) choice. */
  allowNO?: boolean;
  /** True when the item's guide says "do not score 1" (2/0 only). */
  noScoreOne?: boolean;
  /** Optional special scoring guidance printed under the item (Vietnamese). */
  guideVi?: string;
  /** Maladaptive critical items get a severity rating in addition to 2/1/0. */
  isCritical?: boolean;
  /** True when the form prints this item with blank score cells (still scored live). */
  blankScore?: boolean;
  /** True when the Vietnamese text is machine-extracted and pending proofreading. */
  draft?: boolean;
}

export interface SubdomainDef {
  id: SubdomainId;
  domain: DomainId;
  /** Bilingual display names. */
  nameVi: string;
  nameEn: string;
  /** Items in printed order (numbering restarts per subdomain). */
  items: ItemDef[];
  /** Minimum age (years) at which this subdomain applies; below → skippable. */
  minAgeYears?: number;
  /** True when the item text has been hand-verified against the form. */
  verified?: boolean;
}

export interface DomainDef {
  id: DomainId;
  nameVi: string;
  nameEn: string;
  subdomains: SubdomainId[];
}

export interface ItemsPack {
  edition: Edition;
  form: FormType;
  /** Human-readable version/source note for provenance. */
  source: string;
  domains: DomainDef[];
  subdomains: SubdomainDef[];
}

// ---------------------------------------------------------------------------
// Norms packs (copyrighted conversion tables — user-supplied)
// ---------------------------------------------------------------------------

/** One age band's lookup, expressed as raw-score ranges → output value. */
export interface RangeRow<T> {
  /** Inclusive minimum raw score. */
  min: number;
  /** Inclusive maximum raw score. */
  max: number;
  value: T;
}

export interface AgeBand {
  /** Inclusive age in months. */
  minMonths: number;
  maxMonths: number;
  /** Table B.1: subdomain raw score → v-scale score, per subdomain. */
  rawToVScale: Partial<Record<SubdomainId, RangeRow<number>[]>>;
  /**
   * Table B.1's "90% Conf. Int." row: ± v-scale points for the 90% confidence
   * band around a subdomain v-scale score, per subdomain, for this age band.
   * Absent subdomain = not administered at this age (printed as "—" in the manual).
   */
  confidenceInterval90?: Partial<Record<SubdomainId, number>>;
  /**
   * True only when every cell in this band was individually cross-checked
   * against the manual's PDF page (not just internally self-consistent).
   * Passing structural validation (no gaps/overlaps/non-monotonic values)
   * does NOT imply this — a wrong-but-plausible transcribed number still
   * passes those checks. Missing/false means "please double-check against
   * the manual" — surfaced in the norms editor as a highlighted band.
   */
  pdfVerified?: boolean;
}

/** Domain standard-score lookup: sum of subdomain v-scales → standard score. */
export interface DomainStandardRow {
  sumVMin: number;
  sumVMax: number;
  standard: number;
  percentile: number;
  /** 90% / 95% confidence band offsets, if provided. */
  ci90?: [number, number];
  ci95?: [number, number];
}

/**
 * Table B.2 broken out by age band. The domain-standard and ABC conversions are
 * age-dependent in Vineland-II, so a single flat table cannot be correct — the
 * engine selects the entry whose [minMonths, maxMonths] contains the examinee's age.
 */
export interface DomainStandardAgeBand {
  minMonths: number;
  maxMonths: number;
  /** Human-readable band label from the manual (e.g. "Ages 3:0-6:11"). */
  ageBandRaw?: string;
  /** Sum-of-v-scales → domain standard score, per domain, for this age band. */
  domainStandard: Partial<Record<DomainId, DomainStandardRow[]>>;
  /** Sum of domain standard scores → ABC, for this age band. */
  composite?: DomainStandardRow[];
  /** True when this band's cells were individually transcribed from the PDF (see AgeBand.pdfVerified). */
  pdfVerified?: boolean;
}

export interface NormsPack {
  edition: Edition;
  /** Provenance: which manual/tables and who digitized + verified them. */
  source: string;
  verified: boolean;
  ageBands: AgeBand[];
  /** Table B.2 per domain: sum-of-v-scales → domain standard score. */
  domainStandard: Partial<Record<DomainId, DomainStandardRow[]>>;
  /**
   * Table B.2 broken out by age band (preferred). When present, the engine uses
   * the age-matched entry for domain standard scores and the ABC composite,
   * falling back to the flat `domainStandard`/`composite` only if no band matches.
   */
  domainStandardByAge?: DomainStandardAgeBand[];
  /** Table C.5: subdomain raw score → age equivalent (months), per age band or global. */
  ageEquivalent?: Partial<Record<SubdomainId, RangeRow<number>[]>>;
  /** Adaptive Behavior Composite: sum of domain standard scores → ABC. */
  composite?: DomainStandardRow[];
}

// ---------------------------------------------------------------------------
// Live session (what gets saved to / loaded from Google Drive)
// ---------------------------------------------------------------------------

export interface Examinee {
  name: string;
  sex: "" | "male" | "female";
  birthDate: string; // ISO yyyy-mm-dd
  testDate: string; // ISO yyyy-mm-dd
  idNumber?: string;
  diagnosis?: string;
  notes?: string;
}

export interface Interviewer {
  name: string;
  role?: string;
  respondentName?: string;
  respondentRelation?: string;
}

export type ResponsesMap = Record<string, ItemScore>;
export type CriticalMap = Record<string, CriticalSeverity>;

export const SESSION_SCHEMA_VERSION = 1 as const;

export interface Session {
  schemaVersion: typeof SESSION_SCHEMA_VERSION;
  appVersion: string;
  edition: Edition;
  form: FormType;
  examinee: Examinee;
  interviewer: Interviewer;
  /** itemId → score. */
  responses: ResponsesMap;
  /** itemId → severity, for Maladaptive critical items. */
  criticalSeverity: CriticalMap;
  createdAt: string;
  updatedAt: string;
  /** Drive file id once saved (set by the Drive layer). */
  driveFileId?: string;
}

// ---------------------------------------------------------------------------
// Computed results
// ---------------------------------------------------------------------------

export type AdaptiveLevel =
  | "high"
  | "moderatelyHigh"
  | "adequate"
  | "moderatelyLow"
  | "low"
  | "unknown";

export type MaladaptiveLevel = "average" | "elevated" | "clinicallySignificant" | "unknown";

export interface SubdomainResult {
  subdomain: SubdomainId;
  /** Raw score (below-basal items credited 2, plus 2s/1s in the basal–ceiling range). */
  rawScore: number;
  basalItemNum: number | null;
  ceilingItemNum: number | null;
  dkCount: number;
  noCount: number;
  unansweredInRange: number;
  /** False when DK + unanswered in range > 2 → subdomain not scorable. */
  scorable: boolean;
  vScale: number | null;
  adaptiveLevel: AdaptiveLevel;
  ageEquivalentMonths: number | null;
  /** True when norms were unavailable, so only the raw score is known. */
  normsMissing: boolean;
}

export interface DomainResult {
  domain: DomainId;
  sumVScale: number | null;
  standardScore: number | null;
  percentile: number | null;
  adaptiveLevel: AdaptiveLevel;
  ci95?: [number, number];
  normsMissing: boolean;
}

export interface CompositeResult {
  standardScore: number | null;
  percentile: number | null;
  adaptiveLevel: AdaptiveLevel;
  /** Which domains fed the composite (age-dependent). */
  contributingDomains: DomainId[];
  normsMissing: boolean;
}

export interface ScoreReport {
  ageMonths: number;
  ageLabel: string; // e.g. "4:6"
  subdomains: SubdomainResult[];
  domains: DomainResult[];
  composite: CompositeResult;
  warnings: string[];
}
