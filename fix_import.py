filepath = 'frontend-publico/src/pages/PublicMenu.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace("import { FloatingCart }\nimport { BottomNav } from '../components/FloatingCart';", "import { FloatingCart } from '../components/FloatingCart';\nimport { BottomNav } from '../components/BottomNav';")

with open(filepath, 'w') as f:
    f.write(content)
