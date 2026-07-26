import pdfplumber

def debug_cell(page_idx, col_name, v_scale_target):
    pdf_path = 'Vineland-II scoring.pdf'
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
    col_range = cols[col_name]
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_idx]
        words = page.extract_words()
        
        rows = {}
        for w in words:
            y = round(w['top'] / 5) * 5
            if y not in rows:
                rows[y] = []
            rows[y].append(w)
            
        for y, row_words in sorted(rows.items()):
            row_words = sorted(row_words, key=lambda x: x['x0'])
            v_scale = None
            for w in row_words:
                if w['x0'] < 80 or w['x0'] > 550:
                    import re
                    cl = re.sub(r'[^\d]', '', w['text'])
                    if cl and cl.isdigit() and 1 <= int(cl) <= 24:
                        v_scale = int(cl)
                        break
            if v_scale == v_scale_target:
                print(f'Page {page_idx+1}, V-Scale {v_scale}:')
                for w in row_words:
                    if col_range[0] <= w['x0'] <= col_range[1]:
                        print(f'  {col_name} -> Raw: {w["text"]!r}')

debug_cell(13, 'expressive', 7)
debug_cell(22, 'expressive', 1)
debug_cell(22, 'domestic', 11)
debug_cell(22, 'fine', 11)
debug_cell(29, 'play', 1)
debug_cell(30, 'expressive', 1)
debug_cell(33, 'play', 1)
debug_cell(34, 'play', 4)
debug_cell(34, 'interpersonal', 3)
