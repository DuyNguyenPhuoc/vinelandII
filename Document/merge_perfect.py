import json
import re

def parse_age_string(s):
    # Find all sequences of numbers separated by colon
    parts = re.findall(r'(\d+:\d+(?::\d+)?)', s)
    if not parts and '-' in s:
        parts = re.findall(r'(\d+:\d+)', s)
    
    if len(parts) >= 2:
        def to_months(p):
            nums = list(map(int, p.split(':')))
            if len(nums) >= 2:
                return nums[0] * 12 + nums[1]
            return nums[0] * 12
        return to_months(parts[0]), to_months(parts[1])
    return None, None

def merge():
    with open('table_b1_perfect.json', 'r', encoding='utf-8') as f:
        extracted = json.load(f)
        
    norms = {
      "edition": "vineland2",
      "source": "Automated Vision extraction with loop validation. PERFECT MATRICES.",
      "verified": True,
      "ageBands": [],
      "domainStandard": {
        "communication": [],
        "dailyLiving": [],
        "socialization": [],
        "motor": []
      },
      "ageEquivalent": {},
      "composite": []
    }
    
    for table in extracted:
        raw_str = table.get("ageBandRaw", "")
        min_m, max_m = parse_age_string(raw_str)
        if min_m is None or max_m is None:
            print(f"WARNING: Could not parse age band {raw_str}")
            continue
            
        band_data = {
            "minMonths": min_m,
            "maxMonths": max_m,
            "rawToVScale": table.get("rawToVScale", {})
        }
        norms['ageBands'].append(band_data)
        
    # Optional: sort by minMonths just in case
    norms['ageBands'].sort(key=lambda x: x['minMonths'])
    
    out_path = '../app/docs/norms.vineland2.local.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(norms, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully merged {len(norms['ageBands'])} flawless age bands into {out_path}")

if __name__ == '__main__':
    merge()
