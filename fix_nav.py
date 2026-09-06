import os

filepath = 'frontend-publico/src/pages/PublicMenu.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add BottomNav import
content = content.replace("import { FloatingCart }", "import { FloatingCart }\nimport { BottomNav }")

# Add BottomNav to render
content = content.replace("<FloatingCart onOpen={() => setIsCheckoutOpen(true)} />", """<div className="hidden md:block">
        <FloatingCart onOpen={() => setIsCheckoutOpen(true)} />
      </div>
      <BottomNav onOpenCart={() => setIsCheckoutOpen(true)} />""")

with open(filepath, 'w') as f:
    f.write(content)

