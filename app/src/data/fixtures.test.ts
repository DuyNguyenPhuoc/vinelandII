import { describe, it, expect } from "vitest";
import { FIXTURES, buildFixtureSession } from "./fixtures";
import { vineland2Pack } from "./vineland2.pack";
import { buildSyntheticNorms } from "./norms.synthetic";
import { computeReport } from "../engine/scoring";

const pack = vineland2Pack;
const norms = buildSyntheticNorms(pack);

describe("dummy fixtures — end-to-end scoring", () => {
  it("has 10 profiles", () => {
    expect(FIXTURES).toHaveLength(10);
  });

  // Every fixture must run through the engine without throwing and produce
  // internally-consistent results.
  it.each(FIXTURES.map((f) => [f.id, f] as const))(
    "%s: computes a consistent report",
    (_id, f) => {
      const session = buildFixtureSession(f, pack);
      const rep = computeReport(session, pack, norms);

      // age parsed
      expect(rep.ageMonths).toBeGreaterThan(0);

      for (const s of rep.subdomains) {
        expect(s.rawScore).toBeGreaterThanOrEqual(0);
        if (s.scorable) {
          // synthetic norms cover the full raw range → a v-scale must resolve
          expect(s.vScale).not.toBeNull();
          expect(s.vScale!).toBeGreaterThanOrEqual(1);
          expect(s.vScale!).toBeLessThanOrEqual(24);
          expect(s.adaptiveLevel).not.toBe("unknown");
        } else {
          expect(s.vScale).toBeNull();
        }
      }
      // composite domain selection is age-correct
      const expectDomains = rep.ageMonths >= 84 ? 3 : 4;
      expect(rep.composite.contributingDomains).toHaveLength(expectDomains);
    },
  );

  it("typical-4y: all domains scorable → full composite", () => {
    const rep = computeReport(buildFixtureSession(FIXTURES.find((f) => f.id === "typical-4y")!, pack), pack, norms);
    for (const d of rep.domains) expect(d.standardScore).not.toBeNull();
    expect(rep.composite.standardScore).not.toBeNull();
    expect(rep.composite.contributingDomains).toContain("motor"); // under age 7
  });

  it("global-delay-4y6m: community not scorable (KB) → DLS domain has no standard", () => {
    const rep = computeReport(buildFixtureSession(FIXTURES.find((f) => f.id === "global-delay-4y6m")!, pack), pack, norms);
    const community = rep.subdomains.find((s) => s.subdomain === "community")!;
    expect(community.scorable).toBe(false);
    const dls = rep.domains.find((d) => d.domain === "dailyLiving")!;
    expect(dls.standardScore).toBeNull();
    expect(rep.composite.standardScore).toBeNull(); // a contributing domain is missing
  });

  it("typical-8y: composite uses 3 domains (Motor excluded at 7+)", () => {
    const rep = computeReport(buildFixtureSession(FIXTURES.find((f) => f.id === "typical-8y")!, pack), pack, norms);
    expect(rep.composite.contributingDomains).toEqual(["communication", "dailyLiving", "socialization"]);
    expect(rep.composite.contributingDomains).not.toContain("motor");
  });

  it("in-progress-4y: only Communication scored → other domains blank, no composite", () => {
    const rep = computeReport(buildFixtureSession(FIXTURES.find((f) => f.id === "in-progress-4y")!, pack), pack, norms);
    const comm = rep.domains.find((d) => d.domain === "communication")!;
    expect(comm.standardScore).not.toBeNull();
    const soc = rep.domains.find((d) => d.domain === "socialization")!;
    expect(soc.standardScore).toBeNull();
    expect(rep.composite.standardScore).toBeNull();
  });

  it("severe-delay-3y scores lower than high-6y (composite)", () => {
    const severe = computeReport(buildFixtureSession(FIXTURES.find((f) => f.id === "severe-delay-3y")!, pack), pack, norms);
    const high = computeReport(buildFixtureSession(FIXTURES.find((f) => f.id === "high-6y")!, pack), pack, norms);
    expect(severe.composite.standardScore!).toBeLessThan(high.composite.standardScore!);
  });

  // Final results table — printed for the record.
  it("prints a final results table for all fixtures", () => {
    const rows = FIXTURES.map((f) => {
      const rep = computeReport(buildFixtureSession(f, pack), pack, norms);
      const dom = (id: string) => rep.domains.find((d) => d.domain === id)?.standardScore ?? "—";
      return {
        profile: f.id,
        age: rep.ageLabel,
        Comm: dom("communication"),
        DLS: dom("dailyLiving"),
        Soc: dom("socialization"),
        Motor: dom("motor"),
        ABC: rep.composite.standardScore ?? "—",
        unscorable: rep.subdomains.filter((s) => !s.scorable).length,
      };
    });
    // eslint-disable-next-line no-console
    console.table(rows);
    expect(rows).toHaveLength(10);
  });
});
