import fitz
import google.generativeai as genai
import json
import os
import io

API_KEY = os.environ.get('GEMINI_API_KEY')
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-3.1-flash-lite')

def get_img(p):
    doc = fitz.open('Vineland-II scoring.pdf')
    page = doc.load_page(p-1)
    pix = page.get_pixmap(dpi=200)
    from PIL import Image
    return Image.open(io.BytesIO(pix.tobytes('png')))

prompt = "What are the 4 age band headings at the top of the columns on this page? Just list the 4 strings (e.g. 'Ages 5:0-5:2'). Do not extract the tables."

for p in range(25, 40):
    try:
        print(f'Page {p}:')
        print(model.generate_content([prompt, get_img(p)]).text.strip())
    except Exception as e:
        print(f"Error on page {p}: {e}")
