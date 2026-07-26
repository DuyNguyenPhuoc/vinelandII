import pdfplumber
import re
pdf = pdfplumber.open('Vineland-II scoring.pdf')
for i in range(15, 30): # Pages 16 to 30
    page = pdf.pages[i]
    text = page.extract_text()
    if text:
        # Find all age-like strings
        matches = re.findall(r'Ages?\s*\d+[:\-].*', text)
        print(f'Page {i+1}: {matches}')
