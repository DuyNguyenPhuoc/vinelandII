import json

with open('table_b1_perfect.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('table_b1_29_30.json', 'r', encoding='utf-8') as f:
    fixed = json.load(f)

target_ages = ["Ages 7:0-7:2", "Ages 7:3-7:5", "Ages 7:6-7:8", "Ages 7:9-7:11"]
fixed_bands = {}

for p in ['29', '30']:
    for b in fixed[p]:
        age = b.get('ageBandRaw', '')
        if age:
            if not age.startswith("Ages "):
                age = "Ages " + age
            age = age.replace("—", "-").replace("–", "-")
            
            if age == "Ages 7:0-7:8":
                age = "Ages 7:6-7:8"
            
            if age in target_ages:
                if age not in fixed_bands:
                    fixed_bands[age] = b
                    fixed_bands[age]['ageBandRaw'] = age
                else:
                    fixed_bands[age]['rawToVScale'].update(b.get('rawToVScale', {}))

for i, b in enumerate(data):
    age = b.get('ageBandRaw')
    if age in target_ages:
        if age in fixed_bands:
            print(f'Patched {age} at index {i} with {len(fixed_bands[age]["rawToVScale"])} subdomains')
            data[i] = fixed_bands[age]
        else:
            print(f'Warning: {age} not found in fixed data!')

with open('table_b1_perfect.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
