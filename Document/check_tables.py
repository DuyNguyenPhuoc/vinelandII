import json
with open('table_b1_perfect.json', 'r') as f:
    data = json.load(f)
for i, d in enumerate(data):
    print(f"Table {i}: {d.get('ageBandRaw')}")
