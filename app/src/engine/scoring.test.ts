import { describe, it, expect } from "vitest";
import {
  ageInMonths,
  ageLabel,
  computeRaw,
  levelFromVScale,
  levelFromStandard,
  maladaptiveLevelFromVScale,
  computeReport,
} from "./scoring";
import type {
  ItemDef,
  ResponsesMap,
  NormsPack,
  ItemsPack,
  Session,
} from "../types";
import { SESSION_SCHEMA_VERSION } from "../types";

function items(n: number, subdomain = "receptive"): ItemDef[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t.${subdomain}.${i + 1}`,
    subdomain: subdomain as ItemDef["subdomain"],
    num: i + 1,
    textVi: `item ${i + 1}`,
  }));
}

function resp(defs: ItemDef[], scores: (number | "DK" | "NO" | null)[]): ResponsesMap {
  const m: ResponsesMap = {};
  defs.forEach((d, i) => {
    m[d.id] = scores[i] as ResponsesMap[string];
  });
  return m;
}

describe("age math", () => {
  it("computes whole months, adjusting for day-of-month", () => {
    expect(ageInMonths("2017-09-19", "2022-04-14")).toBe(54); // 4y6m25d → 54 months
    expect(ageInMonths("2020-01-31", "2020-02-01")).toBe(0);
    expect(ageInMonths("2020-01-01", "2021-01-01")).toBe(12);
  });
  it("formats age labels", () => {
    expect(ageLabel(54)).toBe("4:6");
    expect(ageLabel(0)).toBe("0:0");
  });
});

describe("basal / ceiling / raw", () => {
  it("credits all below-basal items as 2 and stops at a 4x0 ceiling", () => {
    const defs = items(12);
    // items 1..6 = 2, then 1,1, then 0,0,0,0 (ceiling), then 2 (above ceiling, ignored)
    const r = computeRaw(defs, resp(defs, [2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 2]));
    // basal at item 1 (first run of 4 twos). Ceiling run of 0s starts at item 9.
    // raw = 2*6 (items1-6) + 1 +1 (items7,8) + 0 (item9) = 14; items 10-12 above ceiling.
    expect(r.basalItemNum).toBe(1);
    expect(r.ceilingItemNum).toBe(12); // only three 0s in a row → no 4x0 ceiling → last item
    // raw = 2*6 (items1-6) + 1 + 1 (items7,8) + 0+0+0 (items9-11) + 2 (item12) = 16
    expect(r.rawScore).toBe(16);
  });

  it("finds a proper 4x0 ceiling", () => {
    const defs = items(12);
    const r = computeRaw(defs, resp(defs, [2, 2, 2, 2, 1, 0, 0, 0, 0, 2, 2, 2]));
    // basal item 1; ceiling run 0,0,0,0 at items 6-9 → ceiling item 9. Items 10-12 credited 0.
    expect(r.ceilingItemNum).toBe(9);
    // raw = 2*4 + 1 (item5) + 0s = 9
    expect(r.rawScore).toBe(9);
  });

  it("credits items below the basal run as 2 even if unanswered", () => {
    const defs = items(10);
    // examiner started at item 5: items 1-4 unanswered, items 5-8 = 2 (basal), 9-10 = 0
    const r = computeRaw(defs, resp(defs, [null, null, null, null, 2, 2, 2, 2, 0, 0]));
    expect(r.basalItemNum).toBe(5);
    // below basal (items1-4) credited 2 = 8; items5-8 = 8; items9-10 = 0 → raw 16
    expect(r.rawScore).toBe(16);
  });

  it("marks subdomain not scorable with >2 DK/unanswered in range", () => {
    const defs = items(8);
    const r = computeRaw(defs, resp(defs, [2, 2, 2, 2, "DK", "DK", "DK", 0]));
    expect(r.dkCount).toBe(3);
    expect(r.scorable).toBe(false);
  });

  it("counts NO separately and stays scorable", () => {
    const defs = items(8);
    const r = computeRaw(defs, resp(defs, [2, 2, 2, 2, "NO", 1, 0, 0]));
    expect(r.noCount).toBe(1);
    expect(r.dkCount).toBe(0);
    expect(r.scorable).toBe(true);
  });
});

describe("adaptive-level banding", () => {
  it("bands v-scale scores", () => {
    expect(levelFromVScale(24)).toBe("high");
    expect(levelFromVScale(19)).toBe("moderatelyHigh");
    expect(levelFromVScale(15)).toBe("adequate");
    expect(levelFromVScale(11)).toBe("moderatelyLow");
    expect(levelFromVScale(9)).toBe("low");
    expect(levelFromVScale(null)).toBe("unknown");
  });
  it("bands standard scores", () => {
    expect(levelFromStandard(131)).toBe("high");
    expect(levelFromStandard(120)).toBe("moderatelyHigh");
    expect(levelFromStandard(100)).toBe("adequate");
    expect(levelFromStandard(80)).toBe("moderatelyLow");
    expect(levelFromStandard(67)).toBe("low");
  });
  it("bands maladaptive v-scale scores", () => {
    expect(maladaptiveLevelFromVScale(16)).toBe("average");
    expect(maladaptiveLevelFromVScale(19)).toBe("elevated");
    expect(maladaptiveLevelFromVScale(22)).toBe("clinicallySignificant");
  });
});

describe("computeReport integration (synthetic norms)", () => {
  const pack: ItemsPack = {
    edition: "vineland2",
    form: "survey",
    source: "test",
    domains: [
      {
        id: "communication",
        nameVi: "Giao tiếp",
        nameEn: "Communication",
        subdomains: ["receptive", "expressive"],
      },
    ],
    subdomains: [
      {
        id: "receptive",
        domain: "communication",
        nameVi: "Tiếp nhận",
        nameEn: "Receptive",
        items: items(8, "receptive"),
      },
      {
        id: "expressive",
        domain: "communication",
        nameVi: "Diễn đạt",
        nameEn: "Expressive",
        items: items(8, "expressive"),
      },
    ],
  };

  const norms: NormsPack = {
    edition: "vineland2",
    source: "synthetic test norms — NOT clinical",
    verified: true,
    ageBands: [
      {
        minMonths: 48,
        maxMonths: 60,
        rawToVScale: {
          receptive: [{ min: 0, max: 20, value: 9 }],
          expressive: [{ min: 0, max: 20, value: 5 }],
        },
      },
    ],
    domainStandard: {
      communication: [{ sumVMin: 0, sumVMax: 40, standard: 67, percentile: 1, ci95: [61, 76] }],
    },
    composite: [{ sumVMin: 0, sumVMax: 400, standard: 65, percentile: 1 }],
  };

  const session: Session = {
    schemaVersion: SESSION_SCHEMA_VERSION,
    appVersion: "test",
    edition: "vineland2",
    form: "survey",
    examinee: { name: "Test", sex: "male", birthDate: "2017-09-19", testDate: "2022-04-14" },
    interviewer: { name: "Examiner" },
    responses: {
      ...resp(items(8, "receptive"), [2, 2, 2, 2, 1, 0, 0, 0]),
      ...resp(items(8, "expressive"), [2, 2, 2, 2, 0, 0, 0, 0]),
    },
    criticalSeverity: {},
    createdAt: "2022-04-14",
    updatedAt: "2022-04-14",
  };

  it("produces subdomain, domain, and composite results", () => {
    const rep = computeReport(session, pack, norms);
    expect(rep.ageLabel).toBe("4:6");
    const recept = rep.subdomains.find((s) => s.subdomain === "receptive")!;
    expect(recept.vScale).toBe(9);
    expect(recept.adaptiveLevel).toBe("low");
    const comm = rep.domains.find((d) => d.domain === "communication")!;
    expect(comm.sumVScale).toBe(14); // 9 + 5
    expect(comm.standardScore).toBe(67);
    expect(comm.adaptiveLevel).toBe("low");
  });

  it("flags missing norms without throwing", () => {
    const rep = computeReport(session, pack, null);
    expect(rep.warnings).toContain("normsMissing");
    const recept = rep.subdomains.find((s) => s.subdomain === "receptive")!;
    expect(recept.rawScore).toBe(9); // raw still computed
    expect(recept.vScale).toBeNull();
  });
});
