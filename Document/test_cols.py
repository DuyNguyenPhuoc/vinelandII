import pdfplumber

def test():
    pdf_path = "Vineland-II scoring.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[2] # Page 3
        words = page.extract_words()
        
        for w in words:
            if w['text'] in ['Receptive', 'Expressive', 'Written', 'Personal', 'Domestic', 'Community', 'lnterpersonal', 'Play', 'Coping', 'Gross', 'Fine']:
                print(f"{w['text']}: {w['x0']}")

if __name__ == '__main__':
    test()
