filepath = 'frontend-publico/src/components/CheckoutModal.tsx'
with open(filepath, 'r') as f:
    content = f.read()

old_logic = """          if (response.data && response.data.id) {
            const saved = JSON.parse(localStorage.getItem('meus_pedidos') || '[]');
            saved.push(response.data.id);
            localStorage.setItem('meus_pedidos', JSON.stringify(saved));
          }"""

new_logic = """          if (response.data && response.data.id) {
            let saved = [];
            try {
              saved = JSON.parse(localStorage.getItem('meus_pedidos') || '[]');
              if (!Array.isArray(saved)) saved = [];
            } catch (e) {
              saved = [];
            }
            if (!saved.includes(response.data.id)) {
              saved.push(response.data.id);
            }
            localStorage.setItem('meus_pedidos', JSON.stringify(saved));
          }"""
          
content = content.replace(old_logic, new_logic)

with open(filepath, 'w') as f:
    f.write(content)
