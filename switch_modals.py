import os
import re

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

modal_replacements = [
    ('bg-[#131313]', 'bg-white'),
    ('bg-[#1a1a1a]', 'bg-zinc-50'),
    ('bg-dark-900', 'bg-white'),
    ('bg-dark-800', 'bg-zinc-100'),
    ('bg-[#0A0A0B]', 'bg-white'),
    ('bg-[#171717]', 'bg-white'),
    ('bg-[#0F0F11]', 'bg-zinc-50'),
    ('text-zinc-100', 'text-zinc-900'),
    ('text-white', 'text-zinc-900'),
    ('text-zinc-400', 'text-zinc-500'),
    ('text-zinc-300', 'text-zinc-600'),
    ('border-white/10', 'border-zinc-200'),
    ('border-white/5', 'border-zinc-200'),
    ('shadow-black/20', 'shadow-zinc-200/50'),
    ('shadow-black/50', 'shadow-zinc-200'),
    ('bg-black/50', 'bg-zinc-900/50'),
    ('bg-black/80', 'bg-zinc-900/50'),
    
    # Restore button texts
    ('bg-brand-500 text-zinc-900', 'bg-brand-500 text-white'),
    ('bg-emerald-500 text-zinc-900', 'bg-emerald-500 text-white'),
    ('bg-red-500 text-zinc-900', 'bg-red-500 text-white'),
    ('text-zinc-900/90', 'text-white/90'),
    ('text-zinc-900/80', 'text-zinc-500'),
    ('border-zinc-200 placeholder-zinc-500 focus:border-brand-500 text-zinc-900', 'border-zinc-200 placeholder-zinc-400 focus:border-brand-500 text-zinc-900'),
    ('bg-zinc-100 border border-zinc-200', 'bg-zinc-50 border border-zinc-200')
]

for filename in ['ProductModal.tsx', 'CheckoutModal.tsx']:
    path = f'frontend-publico/src/components/{filename}'
    if os.path.exists(path):
        replace_in_file(path, modal_replacements)
        
