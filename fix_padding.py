with open('frontend-publico/src/pages/PublicMenu.tsx', 'r') as f:
    content = f.read()

# Make sure we use useCart
if "cartCount" not in content.split("const { addItem } = useCart();")[0]:
    content = content.replace("const { addItem } = useCart();", "const { addItem, cartCount } = useCart();")

old_class = 'className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 font-sans pb-32 md:pb-24 selection:bg-brand-500/30 selection:text-zinc-900"'
new_class = 'className={`min-h-screen flex flex-col bg-zinc-50 text-zinc-900 font-sans ${cartCount > 0 ? "pb-36" : "pb-20"} md:pb-12 selection:bg-brand-500/30 selection:text-zinc-900`}'

content = content.replace(old_class, new_class)

with open('frontend-publico/src/pages/PublicMenu.tsx', 'w') as f:
    f.write(content)
