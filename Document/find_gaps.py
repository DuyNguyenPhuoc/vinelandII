import json
with open('vineland_ii_scoring.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
bands = data['ageBands']
for i in range(len(bands) - 1):
    curr_max = bands[i]['maxMonths']
    next_min = bands[i+1]['minMonths']
    if next_min > curr_max + 1:
        print(f"GAP DETECTED: from {curr_max+1} to {next_min-1}")
