import sys

with open('src/components/CheckoutModal.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == ')}' and '</div>' in lines[i-1]:
        if '{/* Footer */}' in ''.join(lines[i:i+10]):
            lines.insert(i+1, '            </div>\n')
            break

with open('src/components/CheckoutModal.tsx', 'w') as f:
    f.writelines(lines)
