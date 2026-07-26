import json
import os

transcript_path = r"C:\Users\pcx\.gemini\antigravity-ide\brain\2bae139c-2b0c-41e5-a1c2-b414c9a89b99\.system_generated\logs\transcript_full.jsonl"
output_path = r"h:\Prj\VineLand\Document\clean_ocr.txt"

ocr_text = ""

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
            # Find the view_file tool response
            if step.get('source') == 'SYSTEM' and step.get('type') == 'TOOL_RESPONSE':
                # Check if it contains the PDF OCR
                if '==Start of PDF==' in step.get('content', ''):
                    ocr_text = step['content']
                    break
        except Exception as e:
            pass

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(ocr_text)

print(f"Extracted {len(ocr_text)} characters of OCR text to clean_ocr.txt")
