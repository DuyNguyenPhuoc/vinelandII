import pdfplumber
pdf = pdfplumber.open('Vineland-II scoring.pdf')
page = pdf.pages[2]
words = page.extract_words()
for w in words:
    if w['x0'] < 80 or w['x0'] > 550:
        print(f"{w['text']} at {w['x0']}")
