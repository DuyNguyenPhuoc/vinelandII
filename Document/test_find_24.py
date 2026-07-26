import pdfplumber

def test():
    with pdfplumber.open("Vineland-II scoring.pdf") as pdf:
        page = pdf.pages[2] # Page 3
        words = page.extract_words()
        
        for w in words:
            if '24' in w['text']:
                print(f"'{w['text']}' at x0={w['x0']:.1f}, top={w['top']:.1f}")

test()
