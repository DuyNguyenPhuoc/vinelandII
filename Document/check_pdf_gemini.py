import fitz
import google.generativeai as genai
import os, io, time
from PIL import Image
import json

genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-3.5-flash')

doc = fitz.open('Vineland-II scoring.pdf')
for p in range(18, 25):
    page = doc.load_page(p)
    pix = page.get_pixmap(dpi=150)
    img = Image.open(io.BytesIO(pix.tobytes('png')))
    response = model.generate_content(['List all the age bands (e.g. "Ages 3:4-3:5") that appear as headers on this page.', img])
    print(f'Page {p+1}: {response.text.strip()}')
    time.sleep(4)
doc.close()
