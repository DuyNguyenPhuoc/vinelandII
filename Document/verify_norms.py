import json

def verify():
    with open('../app/docs/norms.vineland2.local.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    age_bands = data['ageBands']
    errors = []

    for band_idx, band in enumerate(age_bands):
        min_m = band['minMonths']
        max_m = band['maxMonths']
        
        for sub, items in band['rawToVScale'].items():
            if not items:
                continue
            
            # items are presumably in some order. Let's sort them by v-scale ascending
            items_sorted = sorted(items, key=lambda x: x['value'])
            
            for i in range(len(items_sorted)):
                item = items_sorted[i]
                v = item['value']
                min_v = item['min']
                max_v = item['max']
                
                # Check 1: min <= max
                if min_v > max_v:
                    errors.append(f"Band {min_m}-{max_m}mo, {sub}: V={v} has min > max ({min_v} > {max_v})")
                
                # Check 2: Contiguity and Monotonicity
                if i > 0:
                    prev_item = items_sorted[i-1]
                    prev_max = prev_item['max']
                    prev_v = prev_item['value']
                    
                    if min_v <= prev_max:
                        errors.append(f"Band {min_m}-{max_m}mo, {sub}: Overlap/Non-monotonic! V={prev_v} max is {prev_max}, but next V={v} min is {min_v}")
                    elif min_v > prev_max + 1:
                        errors.append(f"Band {min_m}-{max_m}mo, {sub}: GAP found! V={prev_v} max is {prev_max}, but next V={v} min is {min_v}")

    if not errors:
        print("All raw score ranges are contiguous, monotonic, and valid!")
    else:
        print(f"Found {len(errors)} errors:")
        for e in errors[:50]: # print first 50
            print(e)
        if len(errors) > 50:
            print(f"... and {len(errors) - 50} more errors.")

if __name__ == '__main__':
    verify()
