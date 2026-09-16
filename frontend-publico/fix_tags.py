import sys

with open('src/components/CheckoutModal.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == ')}' and '</div>' in lines[i-1] and '{/* Footer */}' in lines[i+2]:
        lines.insert(i, '            </div>\n')
        break

with open('src/components/CheckoutModal.tsx', 'w') as f:
    f.writelines(lines)
