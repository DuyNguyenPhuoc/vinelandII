import pdfplumber

def test():
    with pdfplumber.open("Vineland-II scoring.pdf") as pdf:
        page = pdf.pages[2] # Page 3
        words = page.extract_words()
        
        # Let's find words around y=130 (which was the first data row based on test_words.py)
        row_words = [w for w in words if abs(w['top'] - 130) < 5]
        row_words.sort(key=lambda x: x['x0'])
        
        for w in row_words:
            print(f"'{w['text']}' at x0={w['x0']:.1f}, top={w['top']:.1f}")

test()
