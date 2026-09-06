with open('frontend-publico/src/pages/PublicMenu.tsx', 'r') as f:
    content = f.read()

# 1. Revert min-h-screen flex flex-col to min-h-screen
content = content.replace(
    'className={`min-h-screen flex flex-col bg-zinc-50', 
    'className={`min-h-screen bg-zinc-50'
)

# 2. Revert animate-in fade-in flex flex-col flex-1 to animate-in fade-in
content = content.replace(
    'className="animate-in fade-in duration-300 flex flex-col flex-1"', 
    'className="animate-in fade-in duration-300"'
)

# 3. Add min-h-[50vh] to the main content container to push footer down
content = content.replace(
    '<div className="max-w-4xl mx-auto px-4 md:px-6 relative z-20 mt-4">',
    '<div className="max-w-4xl mx-auto px-4 md:px-6 relative z-20 mt-4 min-h-[55vh]">'
)

with open('frontend-publico/src/pages/PublicMenu.tsx', 'w') as f:
    f.write(content)
