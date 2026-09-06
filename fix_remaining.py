import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

reps = [
    ('bg-[#141416]', 'bg-white'),
    ('bg-[#202022]', 'bg-zinc-100'),
    ('bg-[#18181A]', 'bg-zinc-50'),
    ('bg-[#0F0F11]', 'bg-zinc-50'),
    ('bg-[#0D0D0D]', 'bg-zinc-50'),
    ('bg-[#131313]', 'bg-white'),
    ('bg-[#0A0A0B]', 'bg-white'),
    ('bg-[#171717]', 'bg-white'),
    ('border-white/5', 'border-zinc-200'),
    ('border-white/10', 'border-zinc-200'),
    ('text-white', 'text-zinc-900'),
    ('text-zinc-400', 'text-zinc-500'),
    ('text-zinc-300', 'text-zinc-600'),
    ('hover:bg-[#262626]', 'hover:bg-zinc-100'),
    
    # Restore specific elements
    ('bg-brand-500 text-zinc-900', 'bg-brand-500 text-white'),
    ('bg-emerald-500 text-zinc-900', 'bg-emerald-500 text-white'),
    ('bg-orange-500 text-zinc-900', 'bg-orange-500 text-white'),
    ('bg-zinc-100/20', 'bg-black/10'),
    ('text-white/90', 'text-zinc-900/90'),
]

for root, _, files in os.walk('frontend-publico/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            replace_in_file(os.path.join(root, file), reps)

