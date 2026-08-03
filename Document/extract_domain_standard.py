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

def verify_table_b2(table):
    errors = []
    domains = ['communication', 'dailyLiving', 'socialization', 'motor']
    
    if 'domainStandard' not in table:
        return ["Missing domainStandard"]
        
    for dom in domains:
        if dom not in table['domainStandard']:
            continue
        items = table['domainStandard'][dom]
        if not items: continue
        
        # Sort by standard score (which should correlate with sumVMin)
        items_sorted = sorted(items, key=lambda x: x['standard'])
        
        for i in range(len(items_sorted)):
            item = items_sorted[i]
            std = item.get('standard', 0)
            min_v = item.get('sumVMin', 0)
            max_v = item.get('sumVMax', 0)
            
            if min_v > max_v:
                errors.append(f"{dom} Std={std}: min {min_v} > max {max_v}")
            
            if i > 0:
                prev_item = items_sorted[i-1]
                prev_max = prev_item.get('sumVMax', 0)
                prev_std = prev_item.get('standard', 0)
                
                if min_v <= prev_max:
                    errors.append(f"{dom}: Overlap! Std={prev_std} max is {prev_max}, but next Std={std} min is {min_v}")
                elif min_v > prev_max + 1:
                    errors.append(f"{dom}: GAP! Std={prev_std} max is {prev_max}, but next Std={std} min is {min_v}")
                    
    # Also verify composite
    if 'composite' in table and table['composite']:
        comp_items = sorted(table['composite'], key=lambda x: x['standard'])
        for i in range(len(comp_items)):
            item = comp_items[i]
            std = item.get('standard', 0)
            min_s = item.get('sumStandardMin', 0)
            max_s = item.get('sumStandardMax', 0)
            
            if min_s > max_s:
                errors.append(f"composite Std={std}: min {min_s} > max {max_s}")
                
            if i > 0:
                prev_item = comp_items[i-1]
                prev_max = prev_item.get('sumStandardMax', 0)
                prev_std = prev_item.get('standard', 0)
                
                if min_s <= prev_max:
                    errors.append(f"composite: Overlap! Std={prev_std} max is {prev_max}, but next Std={std} min is {min_s}")
                elif min_s > prev_max + 1:
                    errors.append(f"composite: GAP! Std={prev_std} max is {prev_max}, but next Std={std} min is {min_s}")

    return errors

def extract_page_with_retry(pdf_path, page_num, max_retries=100):
    img = pdf_page_to_image(pdf_path, page_num)
    
    base_prompt = """
    You are an expert clinical data transcriber. I am providing an image of a page from the Vineland-II scoring manual (Table B.2).
    Extract all the age band tables on this page into a JSON array of objects.
    Each object represents ONE age band table.
    
    Structure:
    {
      "ageBandRaw": "e.g. Ages 0:0:0-0:0:30",
      "domainStandard": {
        "communication": [ { "sumVMin": 6, "sumVMax": 6, "standard": 40, "percentile": 1 } ],
        "dailyLiving": [],
        "socialization": [],
        "motor": []
      },
      "composite": [
        { "sumStandardMin": 160, "sumStandardMax": 160, "standard": 40, "percentile": 1 }
      ]
    }
    
    CRITICAL RULES:
    1. The 'standard' is the Standard Score (the far left/right column, ranging typically from 20 to 160).
    2. The 'percentile' is the Percentile Rank next to the standard score. If it says '<1', use 1. If '>99', use 99.
    3. The sum of v-scale scores can be a single number (e.g. '34') or a range (e.g. '35-37'). Put these in 'sumVMin' and 'sumVMax'.
    4. For the 'composite' array, the raw score is the "Sum of Domain Standard Scores". Put this in 'sumStandardMin' and 'sumStandardMax'.
    5. Ignore blank cells or cells with a dash.
    6. VERY IMPORTANT: The sumV/sumStandard scores MUST be mathematically consistent. The min score for Std=X+1 MUST be exactly one higher than the max score for Std=X. There can be NO GAPS and NO OVERLAPS!
    7. Double check blurry numbers.
    
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
                errs = verify_table_b2(table)
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
            
        time.sleep(5)
        
    print(f"  Failed to perfectly extract page {page_num} after {max_retries} attempts.")
    return None

def main():
    pdf_path = "Vineland-II scoring.pdf"
    output_b2 = []
    
    if os.path.exists("table_b2_perfect.json"):
        with open("table_b2_perfect.json", "r", encoding="utf-8") as f:
            output_b2 = json.load(f)
            
    progress = []
    if os.path.exists("b2_progress.json"):
        with open("b2_progress.json", "r") as f:
            progress = json.load(f)
            
    for page_num in range(55, 67): 
        if page_num in progress:
            continue
            
        print(f"Processing Page {page_num} with Flash Loop Validation (Table B.2)...")
        data = extract_page_with_retry(pdf_path, page_num)
        if data:
            output_b2.extend(data)
            progress.append(page_num)
            
            with open("table_b2_perfect.json", "w", encoding="utf-8") as f:
                json.dump(output_b2, f, indent=2, ensure_ascii=False)
            with open("b2_progress.json", "w") as f:
                json.dump(progress, f)
                
    print("Done! Completely extracted Table B.2 to table_b2_perfect.json")

if __name__ == "__main__":
    main()
