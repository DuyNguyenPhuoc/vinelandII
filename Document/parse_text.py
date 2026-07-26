import pdfplumber

def extract_text():
    pdf_path = "Vineland-II scoring.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(2, 5): # Pages 3 to 5 (0-indexed 2,3,4)
            print(f"--- PAGE {i+1} ---")
            text = pdf.pages[i].extract_text()
            print(text[:1000])

extract_text()
