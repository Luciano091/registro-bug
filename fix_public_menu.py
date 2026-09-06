filepath = 'frontend-publico/src/pages/PublicMenu.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add imports
imports = """import { BottomNav, TabType } from '../components/BottomNav';
import { CuponsView } from './CuponsView';
import { PedidosView } from './PedidosView';
import { ContaView } from './ContaView';"""
content = content.replace("import { BottomNav } from '../components/BottomNav';", imports)

# Add state
state = "const [activeTab, setActiveTab] = useState<TabType>('cardapio');"
content = content.replace("const [activeCategory, setActiveCategory] = useState<string>('Todos');", f"const [activeCategory, setActiveCategory] = useState<string>('Todos');\n  {state}")

# Update BottomNav props
content = content.replace("<BottomNav onOpenCart={() => setIsCheckoutOpen(true)} />", "<BottomNav onOpenCart={() => setIsCheckoutOpen(true)} activeTab={activeTab} onChangeTab={setActiveTab} />")

with open(filepath, 'w') as f:
    f.write(content)
