# Norms file format (`NormsPack`)

Fill this from **your licensed manual** and import it via **Results → "Nạp bảng chuẩn (.json)"**.
Values stay local in your browser; nothing is uploaded or committed.

## Exact id strings

- **Subdomains** (11): `receptive`, `expressive`, `written`, `personal`, `domestic`,
  `community`, `interpersonal`, `play`, `coping`, `gross`, `fine`
- **Domains** (4): `communication`, `dailyLiving`, `socialization`, `motor`

## Top-level

```jsonc
{
  "edition": "vineland2",     // required
  "source":  "…",             // free text (who/when)
  "verified": false,          // set true only after you double-check every value
  "ageBands": [ … ],          // required — one entry per age band (see below)
  "domainStandard": { … },    // optional — enables standard scores + percentiles
  "ageEquivalent": { … },     // optional — enables age-equivalents
  "composite": [ … ]          // optional — enables the ABC composite
}
```

All ranges are **inclusive**.

## `ageBands[]` — from Table B.1

```jsonc
{
  "minMonths": 48,            // 4:0  (years*12 + months)
  "maxMonths": 59,            // 4:11
  "rawToVScale": {
    // For each subdomain: raw-score range -> v-scale (1–24).
    // Read down the subdomain's column in Table B.1: each cell is the raw range for a v-scale.
    "receptive": [
      { "min": 0,  "max": 2,  "value": 1 },
      { "min": 3,  "max": 5,  "value": 2 },
      { "min": 6,  "max": 8,  "value": 3 }
      // … up to value 24
    ],
    "expressive": [ … ]
    // … all 11 subdomains you have data for
  }
}
```

> A raw score that isn't covered by any range simply yields a blank v-scale — so you can
> start with a partial column and extend it later.

## `domainStandard` — from Table B.2 (+ C.3 for percentile)

```jsonc
"domainStandard": {
  "communication": [
    // sumV = the SUM of this domain's subdomain v-scales
    { "sumVMin": 6,  "sumVMax": 6,  "standard": 40, "percentile": 1 },
    { "sumVMin": 7,  "sumVMax": 7,  "standard": 42, "percentile": 1 }
    // usually one row per sum; ci95:[low,high] optional
  ],
  "dailyLiving": [ … ], "socialization": [ … ], "motor": [ … ]
}
```

## `ageEquivalent` (optional)

```jsonc
"ageEquivalent": {
  "receptive": [ { "min": 0, "max": 2, "value": 1 } ]   // value = age-equivalent in MONTHS (1:9 → 21)
}
```

## `composite` (optional) — ABC

```jsonc
"composite": [
  // sumV = sum of the domain STANDARD scores (4 domains under age 7; 3 domains at 7+)
  { "sumVMin": 180, "sumVMax": 182, "standard": 65, "percentile": 1 }
]
```

## Smallest useful file

Just `edition` + one `ageBands[]` with `rawToVScale` → the app fills **v-scale + adaptive level**.
Add `domainStandard` for standard scores + percentiles, `composite` for ABC.

## Check it worked

Import it — the app validates (edition match, coverage, `min ≤ max`) and shows errors/warnings.
Then open the **"✍️ Xem / nhập bảng chuẩn"** grid: your values appear in the manual's layout, and
the Results tables fill in for any examinee whose age falls in a band you entered.

*(All example numbers above are illustrative placeholders, not real norms.)*
