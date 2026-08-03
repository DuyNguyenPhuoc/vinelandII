import fitz
import google.generativeai as genai
import json
import os
import time
from PIL import Image
import io

API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-3.1-flash-lite')

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
    if 'rawToVScale' not in table: return ["Missing rawToVScale"]
    for sub in subdomains:
        if sub not in table['rawToVScale']: continue
        items = table['rawToVScale'][sub]
        if not items: continue
        items_sorted = sorted(items, key=lambda x: x['value'])
        for i in range(len(items_sorted)):
            item = items_sorted[i]
            v = item.get('value', 0)
            min_v = item.get('min', 0)
            max_v = item.get('max', 0)
            if min_v > max_v: errors.append(f"{sub} V={v}: min {min_v} > max {max_v}")
            if i > 0:
                prev_item = items_sorted[i-1]
                prev_max = prev_item.get('max', 0)
                prev_v = prev_item.get('value', 0)
                if min_v <= prev_max: errors.append(f"{sub}: Overlap! V={prev_v} max is {prev_max}, but next V={v} min is {min_v}")
                elif min_v > prev_max + 1: errors.append(f"{sub}: GAP! V={prev_v} max is {prev_max}, but next V={v} min is {min_v}")
    return errors

pdf_path = "Vineland-II scoring.pdf"
img20 = pdf_page_to_image(pdf_path, 20)
img21 = pdf_page_to_image(pdf_path, 21)
img22 = pdf_page_to_image(pdf_path, 22)

base_prompt = """
You are an expert clinical data transcriber. I am providing an image of a page from the Vineland-II scoring manual.
Extract all the age band tables on this page into a JSON array of objects.

Structure:
{
  "ageBandRaw": "e.g. Ages 3:0-3:1",
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

def extract_page(page_num, img):
    prompt = base_prompt + f"\n\nThis is page {page_num} of the PDF."
    for attempt in range(10):
        print(f"Page {page_num}, Attempt {attempt+1}...")
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
                print(f"Page {page_num} Flawless!")
                return data
            else:
                print("Errors:", all_errors[:3])
                prompt = base_prompt + f"\n\nThis is page {page_num}. YOUR PREVIOUS OUTPUT HAD ERRORS. FIX THEM:\n" + "\n".join(all_errors)
        except Exception as e:
            print("JSON Error:", e)
            if "429" in str(e): time.sleep(10)
        time.sleep(2)
    return []

d20 = extract_page(20, img20)
d21 = extract_page(21, img21)
d22 = extract_page(22, img22)

all_data = d20 + d21 + d22
with open('table_b1_missing.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)
print("Saved missing bands!")
