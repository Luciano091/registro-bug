import os
import re

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

public_menu_replacements = [
    ('bg-[#0D0D0D]', 'bg-zinc-50'),
    ('text-zinc-100', 'text-zinc-900'),
    ('text-white', 'text-zinc-900'),
    ('bg-[#171717]/80', 'bg-white/90'),
    ('border-white/10', 'border-zinc-200'),
    ('border-white/5', 'border-zinc-200'),
    ('bg-[#171717]', 'bg-white'),
    ('text-zinc-400', 'text-zinc-500'),
    ('hover:bg-[#262626]', 'hover:bg-zinc-100'),
    ('text-zinc-300', 'text-zinc-500'),
    ('bg-[#131313]', 'bg-white'),
    ('hover:bg-[#1a1a1a]', 'hover:bg-zinc-50'),
    ('bg-[#0A0A0B]', 'bg-white'),
    ('shadow-black/20', 'shadow-zinc-200/50'),
    ('shadow-black/50', 'shadow-zinc-200'),
    ('bg-white/5', 'bg-zinc-100'), # For the Plus button background
    # Revert specific text-white that are inside colored badges/buttons
    ('bg-brand-500 text-zinc-900', 'bg-brand-500 text-white'),
    ('bg-orange-500 text-zinc-900', 'bg-orange-500 text-white'),
    ('bg-emerald-500 text-zinc-900', 'bg-emerald-500 text-white'),
    ('hover:text-zinc-900 active:scale-90', 'hover:text-white active:scale-90'),
]

replace_in_file('frontend-publico/src/pages/PublicMenu.tsx', public_menu_replacements)

app_replacements = [
    ('bg-[#0F0F11]', 'bg-zinc-50')
]
replace_in_file('frontend-publico/src/App.tsx', app_replacements)

# Now check if floating cart is somewhere else
