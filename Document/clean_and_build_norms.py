import pdfplumber
import json
import re
import os

def clean_ocr(text):
    """Aggressive cleanup of OCR errors specific to this Vineland PDF."""
    # Remove spaces inside numbers
    t = text.replace(' ', '')
    
    # Common character replacements
    t = t.replace('o', '0').replace('O', '0')
    t = t.replace('l', '1').replace('I', '1').replace('i', '1')
    t = t.replace('s', '5').replace('S', '5')
    t = t.replace('B', '8')
    t = t.replace('Z', '2').replace('z', '2')
    t = t.replace('t', '7')
    t = t.replace('G', '6')
    
    # Replace common punctuation with hyphen if it looks like a range separator
    t = t.replace('.', '-').replace(',', '-')
    
    # Remove any other non-digit, non-hyphen characters
    t = re.sub(r'[^\d\-]', '', t)
    
    overrides = {
        '46-5': '46-54',
        '5-1': '0-1',
        '16-8': '16-18',
        '1111-1': '11',
        '7-4': '0-4',
        '2-1': '0-1',
        '8-1': '0-1',
        '3-1': '0-1',
        'B-1': '8-10',
    }
    if t in overrides:
        return overrides[t]
    
    # If the text is empty after cleanup, return None
    if not t:
        return None
        
    # Split fused numbers (e.g., 3448 -> 34-48)
    if '-' not in t and len(t) >= 4:
        # A valid raw score is <= 150 (roughly). A 4-digit number is almost certainly two fused 2-digit numbers
        if len(t) == 4:
            part1, part2 = int(t[:2]), int(t[2:])
            if part1 <= part2:
                t = f"{part1}-{part2}"
        elif len(t) == 5:
            # E.g., 104105 -> 104-105
            part1, part2 = int(t[:3]), int(t[3:])
            if part1 <= part2:
                t = f"{part1}-{part2}"
            else:
                # Could be 2-digit then 3-digit?
                part1, part2 = int(t[:2]), int(t[2:])
                if part1 <= part2:
                    t = f"{part1}-{part2}"
        elif len(t) == 6:
            part1, part2 = int(t[:3]), int(t[3:])
            if part1 <= part2:
                t = f"{part1}-{part2}"
                
    return t

def parse_range(t):
    if '-' in t:
        parts = t.split('-')
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            return int(parts[0]), int(parts[1])
    elif t.isdigit():
        return int(t), int(t)
    return None, None

def get_age_bands():
    # Hardcoded from the index to avoid OCR errors
    bands = [
        (0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), 
        (6, 6), (7, 7), (8, 8), (9, 9), (10, 10), (11, 11),
        (12, 13), (14, 15), (16, 17), (18, 19), (20, 21), (22, 23),
        (24, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35),
        (36, 37), (38, 39), (40, 41), (42, 43), (44, 45), (46, 47),
        (48, 49), (50, 51), (52, 53), (54, 55), (56, 57), (58, 59),
        (60, 62), (63, 65), (66, 68), (69, 71),
        (72, 74), (75, 77), (78, 80), (81, 83),
        (84, 86), (87, 89), (90, 92), (93, 95),
        (96, 99), (100, 103), (104, 107), (108, 111),
        (112, 115), (116, 119), (120, 123), (124, 127),
        (128, 131), (132, 135), (136, 139), (140, 143),
        (144, 147), (148, 151), (152, 155), (156, 167),
        (168, 173), (174, 179), (180, 185), (186, 191),
        (192, 197), (198, 203), (204, 209), (210, 215),
        (216, 221), (222, 227), (228, 263), (264, 359),
        (360, 479), (480, 599),
        (600, 659), (660, 719),
        (720, 779), (780, 839),
        (840, 959), (960, 1091)
    ]
    return bands

def build():
    pdf_path = "Vineland-II scoring.pdf"
    output_path = "../app/docs/norms.vineland2.local.json"

    norms = {
      "edition": "vineland2",
      "source": "Automated OCR extraction with aggressive cleanup. REQUIRES MANUAL VERIFICATION.",
      "verified": False,
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

    cols = {
        'receptive': (80, 125),
        'expressive': (125, 170),
        'written': (170, 210),
        'personal': (210, 250),
        'domestic': (250, 290),
        'community': (290, 330),
        'interpersonal': (330, 380),
        'play': (380, 430),
        'coping': (430, 465),
        'gross': (465, 505),
        'fine': (505, 550),
    }

    age_bands = get_age_bands()
    band_idx = 0

    warnings = []

    with pdfplumber.open(pdf_path) as pdf:
        for i in range(2, 49): # Pages 3 to 49
            page = pdf.pages[i]
            words = page.extract_words()
            
            # Group words by Y coordinate
            rows = {}
            for w in words:
                y = round(w['top'] / 5) * 5
                if y not in rows:
                    rows[y] = []
                rows[y].append(w)
                
            sorted_y = sorted(rows.keys())
            
            # Split the rows into two tables (top half and bottom half)
            table1_rows = []
            table2_rows = []
            
            for y in sorted_y:
                row_words = sorted(rows[y], key=lambda x: x['x0'])
                # Only keep rows that look like data rows (have a v-scale score on the left/right)
                has_vscale = False
                for w in row_words:
                    if w['x0'] < 80 or w['x0'] > 550:
                        cl = clean_ocr(w['text'])
                        if cl and cl.isdigit() and 1 <= int(cl) <= 24:
                            has_vscale = True
                            break
                if has_vscale:
                    if y < page.height / 2 + 50: # Adjust split point slightly
                        table1_rows.append(row_words)
                    else:
                        table2_rows.append(row_words)
            
            for t_idx, table_rows in enumerate([table1_rows, table2_rows]):
                if band_idx >= len(age_bands): break
                
                minM, maxM = age_bands[band_idx]
                
                band_data = {
                    "minMonths": minM,
                    "maxMonths": maxM,
                    "rawToVScale": {k: [] for k in cols.keys()}
                }
                
                # Sort rows from top to bottom (should be V-scale 24 down to 1)
                for row_words in table_rows:
                    v_scale = None
                    # Find v-scale
                    for w in row_words:
                        if w['x0'] < 80 or w['x0'] > 550:
                            cl = clean_ocr(w['text'])
                            if cl and cl.isdigit() and 1 <= int(cl) <= 24:
                                v_scale = int(cl)
                                break
                    
                    if v_scale is not None:
                        for w in row_words:
                            if w['x0'] < 80 or w['x0'] > 550: continue # Skip v-scale
                            
                            for sub, (xmin, xmax) in cols.items():
                                if xmin <= w['x0'] <= xmax:
                                    cl = clean_ocr(w['text'])
                                    if cl:
                                        min_val, max_val = parse_range(cl)
                                        if min_val is not None and max_val is not None:
                                            if min_val > max_val:
                                                warnings.append(f"WARNING: min > max on Page {i+1}, Subdomain {sub}, V-Scale {v_scale}: {cl}")
                                            band_data['rawToVScale'][sub].append({
                                                "min": min_val,
                                                "max": max_val,
                                                "value": v_scale
                                            })
                                    break
                
                norms['ageBands'].append(band_data)
                band_idx += 1

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(norms, f, indent=2, ensure_ascii=False)
        
    print(f"Generated {output_path} successfully. Extracted {len(norms['ageBands'])} age bands.")
    if warnings:
        print("\n--- VALIDATION WARNINGS ---")
        for w in warnings:
            print(w)
    else:
        print("\nNo validation warnings found.")

if __name__ == '__main__':
    build()
