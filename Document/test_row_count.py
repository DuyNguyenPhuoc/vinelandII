import pdfplumber

def test():
    with pdfplumber.open("Vineland-II scoring.pdf") as pdf:
        page = pdf.pages[2] # Page 3
        words = page.extract_words()
        
        rows = {}
        for w in words:
            # Round top coordinate to group into rows
            y = round(w['top'] / 5) * 5
            if y not in rows:
                rows[y] = []
            rows[y].append(w)
            
        print(f"Total distinct Y rows: {len(rows)}")
        
        # Print the Y coordinates and the text in the row
        for y in sorted(rows.keys()):
            row_words = [w['text'] for w in rows[y]]
            print(f"Y={y}: {' '.join(row_words)}")

test()
