import fitz
import google.generativeai as genai
import json
import os
import io
import time
from PIL import Image

API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyC0zUZoPTUaen9qOByYG1Z-UVB-lbOXhjI')
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-3.1-flash-lite')

def get_img(p):
    doc = fitz.open('Vineland-II scoring.pdf')
    page = doc.load_page(p-1)
    pix = page.get_pixmap(dpi=200)
    return Image.open(io.BytesIO(pix.tobytes('png')))

img18 = get_img(18)
img19 = get_img(19)

prompt = """Extract all age band tables on this page into a JSON array of objects.
Structure: { "ageBandRaw": "e.g. Ages 3:0-3:1", "rawToVScale": { "receptive": [ { "min": 8, "max": 40, "value": 24 } ], ... } }
Rules:
1. 'value' is V-Scale score (24 down to 1).
2. single number = min and max. range = min to max.
3. Ignore blank/dash.
4. NO GAPS, NO OVERLAPS in raw scores.
Return ONLY valid JSON."""

def extract(img, p):
    for attempt in range(5):
        try:
            r = model.generate_content([prompt, img])
            t = r.text.strip().removeprefix('```json').removesuffix('```').strip()
            return json.loads(t)
        except Exception as e:
            time.sleep(5)
    return []

print('Extracting 18...')
d18 = extract(img18, 18)
print('Extracting 19...')
d19 = extract(img19, 19)

all_d = d18 + d19
with open('table_b1_missing.json', 'w', encoding='utf-8') as f:
    json.dump(all_d, f, indent=2)
print('Saved to table_b1_missing.json')
