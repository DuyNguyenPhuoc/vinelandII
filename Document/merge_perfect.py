import json
import re
import os

def parse_age_string(s):
    if not s: return None, None
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
    norms = {
      "edition": "vineland2",
      "source": "Automated Vision extraction with loop validation. PERFECT MATRICES.",
      "verified": False,
      "ageBands": [],
      "ageEquivalent": {}
    }
    
    # 1. Merge Table B.1 (Raw to v-Scale)
    if os.path.exists('table_b1_perfect.json'):
        with open('table_b1_perfect.json', 'r', encoding='utf-8') as f:
            b1_data = json.load(f)
            
        for table in b1_data:
            raw_str = table.get("ageBandRaw", "")
            min_m, max_m = parse_age_string(raw_str)
            if min_m is None or max_m is None:
                continue
            
            # Use a unique key for the band
            band_data = {
                "minMonths": min_m,
                "maxMonths": max_m,
                "rawToVScale": table.get("rawToVScale", {})
            }
            norms['ageBands'].append(band_data)
            
    norms['ageBands'].sort(key=lambda x: x['minMonths'])
    
    # 2. Merge Table B.2 (domainStandard & composite)
    norms['domainStandard'] = {}
    norms['composite'] = []
    
    if os.path.exists('table_b2_perfect.json'):
        with open('table_b2_perfect.json', 'r', encoding='utf-8') as f:
            b2_data = json.load(f)
            
        for b2_table in b2_data:
            # Merge domainStandard
            ds = b2_table.get('domainStandard', {})
            for dom, items in ds.items():
                if dom not in norms['domainStandard']:
                    norms['domainStandard'][dom] = []
                norms['domainStandard'][dom].extend(items)
                
            # Merge composite
            comp = b2_table.get('composite', [])
            norms['composite'].extend(comp)
            
        # Clean up overlaps by keeping only unique standard scores, and sort them
        for dom in norms['domainStandard']:
            unique_ds = {item['standard']: item for item in norms['domainStandard'][dom]}
            norms['domainStandard'][dom] = sorted(unique_ds.values(), key=lambda x: x['standard'])
            
        unique_comp = {item['sumStandardMin']: item for item in norms['composite']}
        norms['composite'] = sorted(unique_comp.values(), key=lambda x: x['sumStandardMin'])

    # 3. Merge Table C.5 (ageEquivalent)
    if os.path.exists('table_c5_perfect.json'):
        with open('table_c5_perfect.json', 'r', encoding='utf-8') as f:
            c5_data = json.load(f)
            
        # c5_data is a list of tables. We can just merge them all into the root ageEquivalent
        for table in c5_data:
            if 'ageEquivalent' in table:
                for sub, items in table['ageEquivalent'].items():
                    if sub not in norms['ageEquivalent']:
                        norms['ageEquivalent'][sub] = {}
                    for item in items:
                        norms['ageEquivalent'][sub][str(item['raw'])] = item['age']
                        
    out_path = '../app/docs/norms.vineland2.local.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(norms, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully merged data into {out_path}")

if __name__ == '__main__':
    merge()
