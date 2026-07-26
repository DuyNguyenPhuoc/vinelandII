import pdfplumber
import re

def test():
    pdf_path = "Vineland-II scoring.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[2] # Page 3
        words = page.extract_words()
        
        valid_words = []
        for w in words:
            text = w['text'].replace('o', '0').replace('O', '0').replace('l', '1').replace('I', '1').replace('B', '8')
            if re.match(r'^\d+(-\d+)?$', text):
                valid_words.append({
                    'text': text,
                    'x0': w['x0'],
                    'top': w['top']
                })
        
        rows = {}
        for w in valid_words:
            y = round(w['top'] / 5) * 5
            if y not in rows:
                rows[y] = []
            rows[y].append(w)
            
        for y in sorted(rows.keys()):
            row = sorted(rows[y], key=lambda x: x['x0'])
            print(f"Y={y}: {[w['text'] for w in row]}")

if __name__ == '__main__':
    test()
