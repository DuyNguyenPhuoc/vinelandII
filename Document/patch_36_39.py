import json

with open('table_b1_perfect.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('table_b1_fixed.json', 'r', encoding='utf-8') as f:
    fixed = json.load(f)

# Normalize the keys from 18 and 19 to merge them if they have weird age strings
band_18_1 = next((b for b in fixed['18'] if b.get('ageBandRaw') == 'Ages 3:0-3:1'), None)
band_18_2_part1 = next((b for b in fixed['18'] if b.get('ageBandRaw') == 'Ages 3:2-3:3'), None)
band_18_2_part2 = next((b for b in fixed['18'] if b.get('ageBandRaw') == '3:2-3:3'), None)
if band_18_2_part1 and band_18_2_part2:
    band_18_2_part1['rawToVScale'].update(band_18_2_part2['rawToVScale'])

# Replace indices 29 and 30? Wait, earlier I inserted 3:0-3:1 and 3:2-3:3!
# Let's find them!
for i, b in enumerate(data):
    if b.get('ageBandRaw') == 'Ages 3:0-3:1':
        print('Found 3:0-3:1 at', i)
        data[i] = band_18_1
    if b.get('ageBandRaw') == 'Ages 3:2-3:3':
        print('Found 3:2-3:3 at', i)
        data[i] = band_18_2_part1

with open('table_b1_perfect.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('Patched table_b1_perfect.json with 36-39 mo!')
