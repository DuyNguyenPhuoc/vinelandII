import pdfplumber
import json
import re
import os

def parse_age(age_str):
    parts = age_str.split('-')
    if len(parts) != 2: return None
    
    def to_months(s):
        comp = s.strip().split(':')
        if len(comp) >= 2:
            return int(comp[0]) * 12 + int(comp[1])
        return None
    
    try:
        minM = to_months(parts[0])
        maxM = to_months(parts[1])
        if minM is not None and maxM is not None:
            return minM, maxM
    except:
        pass
    return None

def build():
    pdf_path = "Vineland-II scoring.pdf"
    scaffold_path = "../app/docs/norms.vineland2.SCAFFOLD.json"
    output_path = "../app/docs/norms.vineland2.local.json"

    if not os.path.exists(scaffold_path):
        print(f"Scaffold not found at {scaffold_path}")
        return

    with open(scaffold_path, 'r', encoding='utf-8') as f:
        norms = json.load(f)

    norms['ageBands'] = []
    
    cols = {
        'receptive': (80, 125),
        'expressive': (125, 165),
        'written': (165, 205),
        'personal': (205, 245),
        'domestic': (245, 280),
        'community': (280, 320),
        'interpersonal': (320, 375),
        'play': (375, 420),
        'coping': (420, 460),
        'gross': (460, 500),
        'fine': (500, 550),
    }

    current_band = None

    with pdfplumber.open(pdf_path) as pdf:
        for i in range(2, 49): # Pages 3 to 49
            page = pdf.pages[i]
            words = page.extract_words()
            
            # Find Age Band
            for w in words:
                text = w['text']
                if re.match(r'^\d+:\d+(:.*)?-\d+:\d+(:.*)?$', text):
                    age_res = parse_age(text)
                    if age_res:
                        # Append the previous band if exists
                        if current_band:
                            norms['ageBands'].append(current_band)
                        
                        current_band = {
                            "minMonths": age_res[0],
                            "maxMonths": age_res[1],
                            "rawToVScale": {k: [] for k in cols.keys()}
                        }
            
            if not current_band:
                continue

            # Process scores
            valid_words = []
            for w in words:
                text = w['text'].replace('o', '0').replace('O', '0').replace('l', '1').replace('I', '1').replace('B', '8')
                # Include single numbers and ranges
                if re.match(r'^\d+(-\d+)?$', text):
                    valid_words.append({
                        'text': text,
                        'x0': w['x0'],
                        'top': w['top']
                    })
            
            # Group by line
            rows = {}
            for w in valid_words:
                y = round(w['top'] / 5) * 5
                if y not in rows:
                    rows[y] = []
                rows[y].append(w)

            # We know v-scale ranges from 24 down to 1.
            # We'll just infer v-scale from the leftmost or rightmost number if it matches 1-24 and is isolated,
            # or we just try to guess the v-scale from the row index.
            # Actually, let's just find the v-scale number in the row.
            
            for y in sorted(rows.keys()):
                row_words = sorted(rows[y], key=lambda x: x['x0'])
                if not row_words: continue
                
                # Assume the first number is v_scale if it's <= 24 and x0 < 80
                # Or the last number if x0 > 550
                v_scale = None
                for w in row_words:
                    if '-' not in w['text'] and w['text'].isdigit():
                        val = int(w['text'])
                        if 1 <= val <= 24:
                            if w['x0'] < 80 or w['x0'] > 550:
                                v_scale = val
                                break
                
                if v_scale is not None:
                    # Map the rest to subdomains
                    for w in row_words:
                        if w['x0'] < 80 or w['x0'] > 550: continue # Skip v-scale
                        
                        for sub, (xmin, xmax) in cols.items():
                            if xmin <= w['x0'] <= xmax:
                                text = w['text']
                                if '-' in text:
                                    parts = text.split('-')
                                    if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                                        current_band['rawToVScale'][sub].append({
                                            "min": int(parts[0]),
                                            "max": int(parts[1]),
                                            "value": v_scale
                                        })
                                else:
                                    if text.isdigit():
                                        current_band['rawToVScale'][sub].append({
                                            "min": int(text),
                                            "max": int(text),
                                            "value": v_scale
                                        })
                                break

        if current_band:
            norms['ageBands'].append(current_band)

    # Note: DomainStandard and composite are omitted for now due to complexity, 
    # but the user can add them manually. We will at least provide the scaffold.
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(norms, f, indent=2, ensure_ascii=False)
        
    print(f"Generated {output_path} successfully. Extracted {len(norms['ageBands'])} age bands.")

if __name__ == '__main__':
    build()
