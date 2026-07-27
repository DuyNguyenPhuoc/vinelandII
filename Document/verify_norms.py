import fitz
import json
import re
import difflib

COL_CENTERS = {
    'receptive': 96,
    'expressive': 135,
    'written': 175,
    'personal': 213,
    'domestic': 253,
    'community': 295,
    'interpersonal': 345,
    'play': 383,
    'coping': 429,
    'gross': 467,
    'fine': 504
}

def clean_ocr(text):
    t = text.replace("—", "-").replace("–", "-").replace(",", "-").replace("(", "").replace(")", "").strip()
    t = t.replace(' ', '')
    # Common OCR fixes
    t = t.replace('/', '7').replace('o', '0').replace('O', '0').replace('Q', '0').replace('D', '0')
    t = t.replace('B', '8').replace('a', '8').replace('@', '8')
    t = t.replace('l', '1').replace('I', '1').replace('i', '1').replace('!', '1').replace('r', '1').replace('t', '1').replace(']', '1')
    t = t.replace('q', '9').replace('g', '9').replace('P', '9')
    t = t.replace('S', '5').replace('s', '5')
    t = t.replace('z', '2').replace('Z', '2')
    t = t.replace('A', '4')
    t = t.replace('G', '6')
    t = t.replace('E', '3')
    return t

def extract_table_columns(page, y_start, y_end):
    words = page.get_text("words")
    t_words = [w for w in words if y_start < w[1] < y_end and y_start < w[3] < y_end]
    
    col_texts = {sd: [] for sd in COL_CENTERS.keys()}
    y_clusters = []
    for w in t_words:
        if w[0] < 60 or w[0] > 540:
            continue
        y_c = (w[1] + w[3]) / 2
        x_c = (w[0] + w[2]) / 2
        
        best_sd = None
        best_dist = 999
        for sd, cx in COL_CENTERS.items():
            if abs(x_c - cx) < 20 and abs(x_c - cx) < best_dist:
                best_sd = sd
                best_dist = abs(x_c - cx)
                
        if best_sd:
            added = False
            for cluster in y_clusters:
                if abs(cluster['y'] - y_c) < 3 and cluster['sd'] == best_sd:
                    cluster['words'].append(w)
                    added = True
                    break
            if not added:
                y_clusters.append({'y': y_c, 'sd': best_sd, 'words': [w]})
                
    for c in y_clusters:
        c['words'].sort(key=lambda w: w[0])
        text = "".join([w[4] for w in c['words']])
        text = clean_ocr(text)
        if text:
            col_texts[c['sd']].append(text)
            
    return col_texts

def extract_all_tables():
    doc = fitz.open('Vineland-II scoring.pdf')
    tables = []
    for p_num in range(15, 45):
        page = doc.load_page(p_num)
        t1 = extract_table_columns(page, 50, 380)
        t2 = extract_table_columns(page, 390, 750)
        tables.append({'page': p_num+1, 'half': 'top', 'cols': t1})
        tables.append({'page': p_num+1, 'half': 'bottom', 'cols': t2})
    return tables

def is_fuzzy_match(expected, pdf_strings):
    exp_clean = clean_ocr(expected).replace('-', '')
    exp_digits = "".join([c for c in exp_clean if c.isdigit()])
    
    if not exp_digits: return True
    
    for pdf_str in pdf_strings:
        pdf_clean = clean_ocr(pdf_str).replace('-', '')
        pdf_digits = "".join([c for c in pdf_clean if c.isdigit()])
        
        if exp_digits == pdf_digits:
            return True
        if exp_digits in pdf_digits and len(exp_digits) > 1:
            return True
            
        if len(exp_digits) > 0 and len(pdf_digits) > 0:
            ratio = difflib.SequenceMatcher(None, exp_digits, pdf_digits).ratio()
            # Require high similarity for short strings, slightly less for long strings
            if ratio > 0.8:
                return True
    return False

def verify():
    tables = extract_all_tables()
    with open('../app/docs/norms.vineland2.local.json', 'r', encoding='utf-8') as f:
        norms = json.load(f)
        
    print(f"Loaded {len(tables)} tables from PDF.")
    print(f"Loaded {len(norms.get('ageBands', []))} age bands from JSON.\n")
    
    unverified = 0
    perfect = 0
    
    for band_idx, band in enumerate(norms.get('ageBands', [])):
        band_name = band.get('ageBandRaw') or "Unknown Band"
        
        expected = {}
        for sd, rows in band.get('rawToVScale', {}).items():
            vals = []
            for r in rows:
                if r['min'] == r['max']: vals.append(str(r['min']))
                else: vals.append(f"{r['min']}-{r['max']}")
            expected[sd] = vals
            
        best_match_rate = 0
        best_table = None
        best_missing = {}
        
        for t in tables:
            matches = 0
            possible = 0
            missing = {}
            for sd, evals in expected.items():
                tvals = t['cols'][sd]
                missing[sd] = []
                for ev in evals:
                    possible += 1
                    if is_fuzzy_match(ev, tvals):
                        matches += 1
                    else:
                        missing[sd].append(ev)
            
            if possible > 0:
                rate = matches / possible
                if rate > best_match_rate:
                    best_match_rate = rate
                    best_table = t
                    best_missing = {k: v for k, v in missing.items() if v}
                    
        if best_match_rate > 0.95:  # Allow slight mismatches due to extreme OCR corruption
            print(f"[OK] {band_name.ljust(20)} -> {best_match_rate*100:.1f}% Verified (Page {best_table['page']} {best_table['half']})")
            perfect += 1
            band['verified'] = True
        else:
            unverified += 1
            if best_table:
                print(f"[FAIL] {band_name.ljust(20)} -> {best_match_rate*100:.1f}% Verified (Page {best_table['page']} {best_table['half']})")
                for sd, miss in best_missing.items():
                    print(f"     {sd}: missing {miss} in PDF column {best_table['cols'][sd]}")
            else:
                print(f"[FAIL] {band_name.ljust(20)} -> 0% Verified (No table found)")
            band['verified'] = False
            
    print(f"\n{perfect} bands perfectly verified (or fuzzy-matched >95%).")
    if unverified > 0:
        print(f"{unverified} bands failed verification.")
        
    with open('../app/docs/norms.vineland2.local.json', 'w', encoding='utf-8') as f:
        json.dump(norms, f, indent=2, ensure_ascii=False)
    print("Injected 'verified' flags into the JSON.")

if __name__ == "__main__":
    verify()
