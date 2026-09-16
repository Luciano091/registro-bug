import sys

with open('src/components/CheckoutModal.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == ')}' and '</div>' in lines[i-1]:
        # let's check if it's the one before Footer
        if '{/* Footer */}' in ''.join(lines[i:i+10]):
            lines.insert(i, '            </div>\n')
            break

with open('src/components/CheckoutModal.tsx', 'w') as f:
    f.writelines(lines)
