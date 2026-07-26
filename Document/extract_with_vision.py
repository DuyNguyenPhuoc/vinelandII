import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import time
from PIL import Image
import io

# Setup your API key here or via environment variable
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyC0zUZoPTUaen9qOByYG1Z-UVB-lbOXhjI")
genai.configure(api_key=API_KEY)

# Use the latest pro model for flawless vision reasoning
model = genai.GenerativeModel('gemini-3.1-pro-preview')

def pdf_page_to_image(pdf_path, page_num):
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num - 1)  # 0-indexed
    pix = page.get_pixmap(dpi=200) # High DPI for clear text
    img_data = pix.tobytes("png")
    doc.close()
    return Image.open(io.BytesIO(img_data))

def extract_table_b1(img):
    prompt = """
    You are an expert clinical data transcriber. I am providing you with an image of a page from the Vineland-II scoring manual (Table B.1).
    This page contains age-specific tables mapping Raw Scores to v-Scale Scores for various subdomains.
    
    Extract all the tables on this page into a JSON array of objects. 
    Each object in the array represents ONE age band table (e.g., 'Ages 0:0:0-0:0:30').
    
    For each table, provide exactly this structure:
    {
      "ageBandRaw": "The exact age string from the header (e.g. 0:0:0-0:0:30)",
      "rawToVScale": {
        "receptive": [ { "min": 8, "max": 40, "value": 24 } ],
        "expressive": [],
        "written": [],
        "personal": [],
        "domestic": [],
        "community": [],
        "interpersonal": [],
        "play": [],
        "coping": [],
        "gross": [],
        "fine": []
      }
    }
    
    Rules for 'rawToVScale':
    - The 'value' is the v-Scale score (found in the far left/right columns, ranging from 24 down to 1).
    - If a cell contains a single number (e.g., '4'), use that number for both 'min' and 'max'.
    - If a cell contains a range (e.g., '12-108'), split it into 'min' and 'max'.
    - If a cell is blank or has a dash indicating no score, omit it entirely from the JSON array for that subdomain.
    - Ensure EVERY row and EVERY valid cell is transcribed flawlessly. Do not skip any rows.
    
    Return ONLY valid JSON. Do not include markdown code blocks like ```json.
    """
    response = model.generate_content([prompt, img])
    try:
        return json.loads(response.text.strip().removeprefix('```json').removesuffix('```'))
    except Exception as e:
        print("Failed to parse JSON for this page. Raw response:")
        print(response.text)
        return None

def extract_table_b2(img):
    prompt = """
    You are an expert clinical data transcriber. I am providing you with an image of a page from the Vineland-II scoring manual (Table B.2).
    This page contains tables mapping Sums of Subdomain v-Scale Scores to Standard Scores.
    
    Extract all the tables on this page into a JSON array of objects. 
    Each object in the array represents ONE age band table.
    
    For each table, provide exactly this structure:
    {
      "ageBandRaw": "The exact age string from the header",
      "domainStandard": {
        "communication": [ { "sumVMin": 6, "sumVMax": 6, "standard": 40, "percentile": 1 } ],
        "dailyLiving": [],
        "socialization": [],
        "motor": []
      }
    }
    
    Rules:
    - Sums of Subdomain v-Scale Scores can be a single number or a range. Split into sumVMin and sumVMax.
    - Standard Score is a single number.
    - Percentile Rank is a single number (or '<1', which you can represent as 1, or '>99' as 99).
    - If a cell is blank or a dash, omit it.
    
    Return ONLY valid JSON. Do not include markdown code blocks like ```json.
    """
    response = model.generate_content([prompt, img])
    try:
        return json.loads(response.text.strip().removeprefix('```json').removesuffix('```'))
    except Exception:
        return None

def main():
    pdf_path = "Vineland-II scoring.pdf"
    output_b1 = []
    
    print("--- Testing Table B.1 (Pages 3 to 4) ---")
    for page_num in range(3, 5):
        print(f"Processing Page {page_num} with Gemini 1.5 Pro...")
        img = pdf_page_to_image(pdf_path, page_num)
        
        data = extract_table_b1(img)
        if data:
            print(f"Successfully extracted {len(data)} age bands from page {page_num}.")
            output_b1.extend(data)
        
        time.sleep(4) # Respect API rate limits
        
    with open("table_b1_extracted.json", "w", encoding="utf-8") as f:
        json.dump(output_b1, f, indent=2, ensure_ascii=False)
        
    print(f"\nSaved {len(output_b1)} age bands to table_b1_extracted.json")
    print("\nNext Steps:")
    print("1. Expand the page_num range(3, 50) to process all of Table B.1.")
    print("2. Call `extract_table_b2` for pages 50 to 66 to process domainStandard scores.")

if __name__ == "__main__":
    main()
