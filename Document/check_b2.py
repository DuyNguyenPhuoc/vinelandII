import json
import os
if os.path.exists('table_b2_perfect.json'):
    with open('table_b2_perfect.json') as f:
        data = json.load(f)
        for i, d in enumerate(data[:3]):
            print(f"Table {i}: ageBand={d.get('ageBandRaw')}, domains={list(d.get('domainStandard', {}).keys())}, composite len={len(d.get('composite', []))}")
else:
    print("Not found")
