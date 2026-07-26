import fitz
import google.generativeai as genai
import json
import os
import io
import time
from PIL import Image

API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyC0zUZoPTUaen9qOByYG1Z-UVB-lbOXhjI')
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro')

def get_img(p):
    doc = fitz.open('Vineland-II scoring.pdf')
    page = doc.load_page(p-1)
    pix = page.get_pixmap(dpi=200)
    return Image.open(io.BytesIO(pix.tobytes('png')))

prompt = """Extract all age band tables on this page into a JSON array of objects.
Structure: { "ageBandRaw": "e.g. Ages 7:0-7:2", "rawToVScale": { "receptive": [ { "min": 8, "max": 40, "value": 24 } ], "expressive": [], "written": [], "personal": [], "domestic": [], "community": [], "interpersonal": [], "play": [], "coping": [], "gross": [], "fine": [] } }
Rules:
1. 'value' is V-Scale score (24 down to 1).
2. single number = min and max. range = min to max.
3. Ignore blank/dash.
4. NO GAPS, NO OVERLAPS in raw scores.
CRITICAL: DO NOT TRUNCATE. YOU MUST OUTPUT ALL SUBDOMAINS. Output the entire table exactly as written.
Return ONLY valid JSON."""

def extract(p):
    img = get_img(p)
    print(f'Extracting page {p}...')
    for attempt in range(3):
        try:
            r = model.generate_content([prompt, img])
            t = r.text.strip().removeprefix('```json').removesuffix('```').strip()
            return json.loads(t)
        except Exception as e:
            print(f'Attempt {attempt} failed: {e}')
            time.sleep(10)
    return []

d21 = extract(21)
d22 = extract(22)
d36 = extract(36)

with open('table_b1_pro.json', 'w', encoding='utf-8') as f:
    json.dump({'21': d21, '22': d22, '36': d36}, f, indent=2)
print('Saved to table_b1_pro.json')
