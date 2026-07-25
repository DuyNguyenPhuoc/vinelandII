// Norms pack loader.
//
// The conversion tables (raw→v-scale→standard→percentile→age-equivalent) are
// copyrighted and must be digitized from the user's licensed manual and VERIFIED
// before clinical use. Until a verified pack is provided, this returns null and
// the app reports raw scores only.
//
// To enable full scoring: create `norms.vineland2.json` matching the NormsPack
// shape in ../types, set `verified: true`, and import it here.

import type { Edition, NormsPack } from "../types";

export function getNorms(_edition: Edition): NormsPack | null {
  // Example wiring once a verified pack exists:
  //   import v2 from "./norms.vineland2.json";
  //   return _edition === "vineland2" ? (v2 as NormsPack) : null;
  return null;
}
