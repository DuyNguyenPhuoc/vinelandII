import pdfplumber
import json
import re

def parse_pdf():
    pdf_path = "Vineland-II scoring.pdf"
    scaffold_path = "../app/docs/norms.vineland2.SCAFFOLD.json"
    
    with open(scaffold_path, 'r', encoding='utf-8') as f:
        norms = json.load(f)

    # We will build ageBands dynamically
    age_bands = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text(layout=True)
            if not text: continue
            
            # Print first 20 lines of page 3 to see layout
            if i == 2:
                print(f"--- Page {i+1} ---")
                print("\n".join(text.split("\n")[:30]))

parse_pdf()
