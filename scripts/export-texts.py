"""Export the stable copy catalog as an easy-to-edit text file."""
from pathlib import Path
import json
root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'copy-catalog.json').read_text())
lines = ['Site text — personal edits preserved', 'Edit text below an ID and send the file back. Keep IDs and ${...} placeholders unchanged.', '']
for key, value in catalog.items():
    lines.extend([f'[{key}]', value, ''])
(root / 'site-texts.txt').write_text('\n'.join(lines), encoding='utf-8')
print(f'Exported {len(catalog)} stable text entries.')
