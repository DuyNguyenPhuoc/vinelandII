import fitz
import google.generativeai as genai
import json
import os
import io

API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyC0zUZoPTUaen9qOByYG1Z-UVB-lbOXhjI')
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-3.1-flash-lite')

doc = fitz.open('Vineland-II scoring.pdf')
page = doc.load_page(35)
pix = page.get_pixmap(dpi=200)
from PIL import Image
img = Image.open(io.BytesIO(pix.tobytes('png')))

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

print(model.generate_content([base_prompt.format(sub='receptive'), img]).text)
