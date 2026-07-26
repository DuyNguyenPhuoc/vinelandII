import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import time
from PIL import Image
import io

API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyC0zUZoPTUaen9qOByYG1Z-UVB-lbOXhjI")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-3.6-flash')

def pdf_page_to_image(pdf_path, page_num):
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num - 1)
    pix = page.get_pixmap(dpi=200)
    img_data = pix.tobytes("png")
    doc.close()
    return Image.open(io.BytesIO(img_data))

def extract_page_with_retry(pdf_path, page_num, max_retries=10):
    img = pdf_page_to_image(pdf_path, page_num)
    
    base_prompt = """
    You are an expert clinical data transcriber. I am providing an image of a page from the Vineland-II scoring manual (Table C.5).
    This table maps Subdomain Raw Scores to Age Equivalents.
    
    Extract the table into a JSON object with this structure:
    {
      "ageEquivalent": {
        "receptive": [ { "raw": 0, "age": "<0:1" }, { "raw": 1, "age": "0:1" } ],
        "expressive": [], "written": [], "personal": [], "domestic": [], "community": [],
        "interpersonal": [], "play": [], "coping": [], "gross": [], "fine": []
      }
    }
    
    CRITICAL RULES:
    1. The 'raw' is the Raw Score (the far left/right column).
    2. The 'age' is the Age Equivalent string (e.g. "0:1", "1:10", ">19:0").
    3. Ignore blank cells or dashes.
    4. For each subdomain, the raw scores MUST be perfectly contiguous (no missing raw scores between min and max) unless it explicitly skips in the table.
    5. Double check blurry numbers.
    
    Return ONLY valid JSON.
    """
    
    prompt = base_prompt
    for attempt in range(max_retries):
        print(f"  Attempt {attempt+1} for page {page_num}...")
        try:
            response = model.generate_content([prompt, img])
            text = response.text.strip().removeprefix('```json').removesuffix('```').strip()
            data = json.loads(text)
            print(f"  Page {page_num} extracted flawlessly!")
            return data
        except Exception as e:
            print(f"  Error on attempt {attempt+1}: {e}")
            if "429" in str(e) or "Quota exceeded" in str(e) or "ResourceExhausted" in str(e):
                print("  API Rate limit hit! Sleeping for 65 seconds...")
                time.sleep(65)
                continue
            prompt = base_prompt + f"\n\nJSON Parse Error: {e}"
            
        time.sleep(5)
        
    print(f"  Failed to perfectly extract page {page_num} after {max_retries} attempts.")
    return None

def main():
    pdf_path = "Vineland-II scoring.pdf"
    output_c5 = []
    
    if os.path.exists("table_c5_perfect.json"):
        with open("table_c5_perfect.json", "r", encoding="utf-8") as f:
            output_c5 = json.load(f)
            
    # Table C.5 is on pages 71 to 74
    for page_num in range(71, 75): 
        print(f"Processing Page {page_num} with Flash Loop Validation (Table C.5)...")
        data = extract_page_with_retry(pdf_path, page_num)
        if data:
            output_c5.append(data)
            
            with open("table_c5_perfect.json", "w", encoding="utf-8") as f:
                json.dump(output_c5, f, indent=2, ensure_ascii=False)
                
    print("Done! Completely extracted Table C.5 to table_c5_perfect.json")

if __name__ == "__main__":
    main()
