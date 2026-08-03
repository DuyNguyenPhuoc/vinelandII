import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import time
from PIL import Image
import io

API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)
MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']
current_model_idx = 0
model = genai.GenerativeModel(MODELS[current_model_idx])

def switch_model():
    global current_model_idx, model
    current_model_idx = (current_model_idx + 1) % len(MODELS)
    print(f"  Switching to {MODELS[current_model_idx]}...")
    model = genai.GenerativeModel(MODELS[current_model_idx])

def pdf_page_to_image(pdf_path, page_num):
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num - 1)
    pix = page.get_pixmap(dpi=200)
    img_data = pix.tobytes("png")
    doc.close()
    return Image.open(io.BytesIO(img_data))

def verify_table(table):
    errors = []
    subdomains = ['receptive', 'expressive', 'written', 'personal', 'domestic', 'community', 'interpersonal', 'play', 'coping', 'gross', 'fine']
    
    if 'rawToVScale' not in table:
        return ["Missing rawToVScale"]
        
    for sub in subdomains:
        if sub not in table['rawToVScale']:
            continue
        items = table['rawToVScale'][sub]
        if not items: continue
        
        items_sorted = sorted(items, key=lambda x: x['value'])
        
        for i in range(len(items_sorted)):
            item = items_sorted[i]
            v = item.get('value', 0)
            min_v = item.get('min', 0)
            max_v = item.get('max', 0)
            
            if min_v > max_v:
                errors.append(f"{sub} V={v}: min {min_v} > max {max_v}")
            
            if i > 0:
                prev_item = items_sorted[i-1]
                prev_max = prev_item.get('max', 0)
                prev_v = prev_item.get('value', 0)
                
                if min_v <= prev_max:
                    errors.append(f"{sub}: Overlap! V={prev_v} max is {prev_max}, but next V={v} min is {min_v}")
                elif min_v > prev_max + 1:
                    errors.append(f"{sub}: GAP! V={prev_v} max is {prev_max}, but next V={v} min is {min_v}")
    return errors

def extract_page_with_retry(pdf_path, page_num, max_retries=100):
    img = pdf_page_to_image(pdf_path, page_num)
    
    base_prompt = """
    You are an expert clinical data transcriber. I am providing an image of a page from the Vineland-II scoring manual.
    Extract all the age band tables on this page into a JSON array of objects.
    Each object represents ONE age band table.
    
    Structure:
    {
      "ageBandRaw": "e.g. Ages 0:0:0-0:0:30",
      "rawToVScale": {
        "receptive": [ { "min": 8, "max": 40, "value": 24 } ],
        "expressive": [], "written": [], "personal": [], "domestic": [], "community": [],
        "interpersonal": [], "play": [], "coping": [], "gross": [], "fine": []
      }
    }
    
    CRITICAL RULES:
    1. The 'value' is the v-Scale score (the far left/right column, from 24 down to 1).
    2. If a cell contains a single number (e.g., '4'), min and max are both 4.
    3. If a cell contains a range (e.g., '12-18'), min is 12, max is 18.
    4. Ignore blank cells or cells with a dash.
    5. VERY IMPORTANT: The raw scores MUST be mathematically consistent. The min score for V=X+1 MUST be exactly one higher than the max score for V=X. There can be NO GAPS and NO OVERLAPS in the raw scores!
    6. Double check blurry numbers. e.g. 50 vs 501, 1 vs 7.
    
    Return ONLY valid JSON.
    """
    
    prompt = base_prompt
    for attempt in range(max_retries):
        print(f"  Attempt {attempt+1} for page {page_num}...")
        try:
            response = model.generate_content([prompt, img])
            text = response.text.strip().removeprefix('```json').removesuffix('```').strip()
            data = json.loads(text)
            
            all_errors = []
            for t_idx, table in enumerate(data):
                errs = verify_table(table)
                for e in errs:
                    all_errors.append(f"Table {t_idx+1}: {e}")
                    
            if not all_errors:
                print(f"  Page {page_num} extracted flawlessly!")
                return data
            else:
                print(f"  Validation failed on attempt {attempt+1}: {all_errors[:3]}...")
                prompt = base_prompt + "\n\nYOUR PREVIOUS OUTPUT HAD LOGICAL ERRORS. PLEASE FIX THEM:\n" + "\n".join(all_errors)
        except Exception as e:
            print(f"  Error on attempt {attempt+1}: {e}")
            if "429" in str(e) or "Quota exceeded" in str(e) or "ResourceExhausted" in str(e):
                print("  API Rate limit hit!")
                switch_model()
                if current_model_idx == 0:
                    print("  All models exhausted! Sleeping 1 hour...")
                    time.sleep(3600)
                continue
            prompt = base_prompt + f"\n\nJSON Parse Error: {e}"
            
        time.sleep(5) # Respect limits
        
    print(f"  Failed to perfectly extract page {page_num} after {max_retries} attempts.")
    return None

def main():
    pdf_path = "Vineland-II scoring.pdf"
    
    # Load existing to append
    output_b1 = []
    if os.path.exists("table_b1_perfect.json"):
        with open("table_b1_perfect.json", "r", encoding="utf-8") as f:
            output_b1 = json.load(f)
            
    progress = []
    if os.path.exists("b1_progress.json"):
        with open("b1_progress.json", "r") as f:
            progress = json.load(f)
            
    pages_to_process = [17, 18, 19, 20] + list(range(31, 50))
            
    for page_num in pages_to_process:
        if page_num in progress:
            continue
            
        print(f"Processing Page {page_num} with Flash Loop Validation...")
        data = extract_page_with_retry(pdf_path, page_num)
        if data:
            output_b1.extend(data)
            progress.append(page_num)
            
            # Save incrementally
            with open("table_b1_perfect.json", "w", encoding="utf-8") as f:
                json.dump(output_b1, f, indent=2, ensure_ascii=False)
            with open("b1_progress.json", "w") as f:
                json.dump(progress, f)
                
    print("Done! Completely extracted Table B.1 to table_b1_perfect.json")

if __name__ == "__main__":
    main()
