import pdfplumber
import json
import os

pdf_path = "Vineland-II scoring.pdf"
json_path = "vineland_ii_scoring.json"

print(f"Opening PDF: {pdf_path}")
all_data = {}

try:
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            # Try to extract tables from the page
            table_settings = {
                "vertical_strategy": "text",
                "horizontal_strategy": "text",
            }
            tables = page.extract_tables(table_settings)
            if tables:
                all_data[f"page_{i+1}"] = tables
                print(f"Extracted {len(tables)} table(s) from page {i+1}")
            else:
                # If no strict tables, let's extract raw text to avoid missing things entirely
                # Or just skip it since it's a table extraction task
                pass

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=4, ensure_ascii=False)

    print(f"Successfully extracted tables from {len(all_data)} pages to {json_path}")

except Exception as e:
    print(f"An error occurred: {e}")
