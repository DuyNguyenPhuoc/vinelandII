import json

data = json.load(open('vineland_ii_scoring.json', encoding='utf-8'))

for i in range(3, 5):
    page_data = data.get(f'page_{i}', [])
    for t_idx, table in enumerate(page_data):
        data_rows = []
        for row in table:
            # A row is a data row if it has some digits
            if sum(1 for cell in row if any(c.isdigit() for c in cell)) >= 3:
                data_rows.append(row)
        print(f"Page {i}, Table {t_idx}: {len(data_rows)} data rows")
