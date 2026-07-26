import json

with open('table_b1_perfect.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('table_b1_36_fixed.json', 'r', encoding='utf-8') as f:
    fixed = json.load(f)

# Indices in data are 54, 55, 56, 57
target_ages = ["Ages 7:0-7:2", "Ages 7:3-7:5", "Ages 7:6-7:8", "Ages 7:9-7:11"]
fixed_bands = {}

for b in fixed['36']:
    age = b.get('ageBandRaw')
    if age in target_ages:
        fixed_bands[age] = b

for i, b in enumerate(data):
    age = b.get('ageBandRaw')
    if age in target_ages:
        if age in fixed_bands:
            print(f'Patched {age} at index {i}')
            data[i] = fixed_bands[age]
        else:
            print(f'Warning: {age} not found in fixed data!')

with open('table_b1_perfect.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('Successfully patched 84-95 mo gaps!')
