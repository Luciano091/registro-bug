import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

reps = [
    ('bg-[#18181A]', 'bg-zinc-50'),
    ('text-zinc-200', 'text-zinc-900'),
    ('placeholder:text-zinc-600', 'placeholder:text-zinc-400'),
    ('bg-[#171717]', 'bg-white'),
]

for filename in ['ProductModal.tsx', 'CheckoutModal.tsx', 'PublicMenu.tsx']:
    path = f'frontend-publico/src/components/{filename}'
    if not os.path.exists(path):
        path = f'frontend-publico/src/pages/{filename}'
    if os.path.exists(path):
        replace_in_file(path, reps)

