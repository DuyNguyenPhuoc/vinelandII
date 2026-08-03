import fitz
import google.generativeai as genai
import json
import os
import io
import time
from PIL import Image

API_KEY = os.environ.get('GEMINI_API_KEY')
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-3.1-flash-lite')

def get_img(p):
    doc = fitz.open('Vineland-II scoring.pdf')
    page = doc.load_page(p-1)
    pix = page.get_pixmap(dpi=200)
    return Image.open(io.BytesIO(pix.tobytes('png')))

subdomains = ['receptive', 'expressive', 'written', 'personal', 'domestic', 'community', 'interpersonal', 'play', 'coping', 'gross', 'fine']

base_prompt = """Extract ONLY the {sub} subdomain column from all age band tables on this page into a JSON array of objects.
CRITICAL HINT: This page contains EXACTLY 4 age band tables for ages:
1. "Ages 7:0-7:2"
2. "Ages 7:3-7:5"
3. "Ages 7:6-7:8"
4. "Ages 7:9-7:11"
Structure: {{ "ageBandRaw": "e.g. Ages 7:0-7:2", "rawToVScale": {{ "{sub}": [ {{ "min": 8, "max": 40, "value": 24 }} ] }} }}
Rules:
1. 'value' is V-Scale score (24 down to 1).
2. single number = min and max. range = min to max.
3. Ignore blank/dash.
4. NO GAPS, NO OVERLAPS in raw scores.
Return ONLY valid JSON."""

def extract_sub(img, p, sub):
    prompt = base_prompt.format(sub=sub)
    print(f'Extracting page {p} subdomain {sub}...')
    for attempt in range(3):
        try:
            r = model.generate_content([prompt, img])
            t = r.text.strip().removeprefix('```json').removesuffix('```').strip()
            return json.loads(t)
        except Exception as e:
            time.sleep(5)
    return []

def extract_page_full(p):
    img = get_img(p)
    merged_bands = {}
    for sub in subdomains:
        data = extract_sub(img, p, sub)
        if isinstance(data, dict):
            data = [data]
        elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], str):
            continue # Malformed
        for band in data:
            if not isinstance(band, dict): continue
            age = band.get('ageBandRaw')
            if not age: continue
            if age not in merged_bands:
                merged_bands[age] = {'ageBandRaw': age, 'rawToVScale': {}}
            if sub in band.get('rawToVScale', {}):
                merged_bands[age]['rawToVScale'][sub] = band['rawToVScale'][sub]
    return list(merged_bands.values())

d36 = extract_page_full(36)

with open('table_b1_36_fixed.json', 'w', encoding='utf-8') as f:
    json.dump({'36': d36}, f, indent=2)
print('Saved to table_b1_36_fixed.json')
