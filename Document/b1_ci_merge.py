"""
Merge Table B.1's "90% Conf. Int." row (subdomain v-scale confidence-interval width)
into app/docs/norms.vineland2.local.json, keyed by ageBands index (transcript order
matches JSON ageBands order 1:1 -- both are strictly age-ascending, 94 bands).

Source: Vineland-II scoring.pdf, Table B.1 pages (idx 2-49), re-transcribed by hand
from page renders the same way b2_rebuild.py did for Table B.2.

A few adult bands (30:0-39:11, 70:0-79:11, 50:0-54:11) print a parenthesized second
number next to the main digit (e.g. "1 (3)") with no explanatory footnote visible on
the page. We keep only the primary (unparenthesized) digit; the bracketed figures are
NOT captured here and would need a manual page revisit if their meaning matters later.
"""
import json

COLUMNS = ["receptive", "expressive", "written", "personal", "domestic",
           "community", "interpersonal", "play", "coping", "gross", "fine"]

TRANSCRIPT = """
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,-,-,2,2,-,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,3,2,2,3,1,2
2,1,-,2,2,2,2,2,2,2,2
2,1,-,2,2,2,2,2,2,2,2
2,1,-,2,2,2,2,2,2,2,2
2,1,-,2,2,2,2,2,2,2,2
2,1,-,2,2,2,2,2,2,2,2
2,1,-,2,2,2,2,2,2,2,2
2,1,3,2,3,2,2,2,2,2,2
2,1,3,2,3,2,2,2,2,2,2
2,1,3,2,3,2,2,2,2,2,2
2,1,3,2,3,2,2,2,2,2,2
2,1,3,2,3,2,2,2,2,2,2
2,1,3,2,3,2,2,2,2,2,2
3,1,2,3,2,2,2,2,2,2,2
3,1,2,3,2,2,2,2,2,2,2
3,1,2,3,2,2,2,2,2,2,2
3,1,2,3,2,2,2,2,2,2,2
3,1,2,3,2,2,2,2,2,2,2
3,1,2,3,2,2,2,2,2,2,2
2,1,2,2,2,2,2,2,2,2,2
2,1,2,2,2,2,2,2,2,2,2
2,1,2,2,2,2,2,2,2,2,2
2,1,2,2,2,2,2,2,2,2,2
2,1,2,2,2,2,2,2,2,2,2
2,1,2,2,2,2,2,2,2,2,2
2,2,2,2,2,2,2,2,1,2,2
2,2,2,2,2,2,2,2,1,2,2
2,2,2,2,2,2,2,2,1,2,2
2,2,2,2,2,2,2,2,1,2,2
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,2,2,-,-
2,2,2,2,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,2,2,-,-
2,2,2,3,2,2,2,2,2,-,-
2,2,2,3,2,2,2,2,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,3,2,-,-
2,2,2,3,2,2,2,2,2,-,-
2,2,2,3,2,2,2,2,2,-,-
2,2,2,3,2,2,2,2,2,-,-
2,2,2,3,2,2,2,2,2,-,-
1,2,2,3,2,2,2,2,2,-,-
1,2,2,3,2,2,2,2,2,-,-
1,2,2,3,2,2,2,2,2,-,-
1,2,2,3,2,2,2,2,2,-,-
1,2,2,3,2,2,2,2,2,-,-
1,2,2,3,2,2,2,2,2,-,-
1,2,2,2,2,3,2,2,2,-,-
1,1,2,2,1,2,2,2,2,-,-
1,1,2,2,1,2,2,2,2,-,-
3,2,2,2,2,2,1,2,2,-,-
3,2,2,2,2,2,1,2,2,-,-
3,1,2,2,2,2,2,2,1,2,2
3,1,2,2,2,2,2,2,1,2,2
3,1,2,2,2,2,2,2,1,2,2
3,1,2,2,2,2,2,2,1,2,2
1,1,2,1,2,1,2,1,2,1,3
""".strip().split("\n")

assert len(TRANSCRIPT) == 94, len(TRANSCRIPT)

PATH = "app/docs/norms.vineland2.local.json"
d = json.load(open(PATH, encoding="utf-8"))
ab = d["ageBands"]
assert len(ab) == 94, len(ab)

for band, row in zip(ab, TRANSCRIPT):
    vals = [v.strip() for v in row.split(",")]
    assert len(vals) == 11, row
    ci = {}
    for col, v in zip(COLUMNS, vals):
        if v != "-":
            ci[col] = int(v)
    band["confidenceInterval90"] = ci

json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("wrote", PATH, "with confidenceInterval90 on", len(ab), "bands")
