import json
with open('table_b2_perfect.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, b in enumerate(data):
    if 'composite' in b and b['composite']:
        comp = sorted(b['composite'], key=lambda x: x['standard'])
        print(f"Table {i}: min={comp[0].get('sumStandardMin')} max={comp[-1].get('sumStandardMax')} len={len(comp)}")
