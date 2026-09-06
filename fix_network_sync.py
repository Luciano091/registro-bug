filepath = 'frontend-publico/src/contexts/NetworkContext.tsx'
with open(filepath, 'r') as f:
    content = f.read()

old_sync = """          // Re-enviar para a API. O UUID já vai no payload.
          await api.post('/pedidos', order.payload);
          await deleteOfflineOrder(order.uuid);"""

new_sync = """          // Re-enviar para a API. O UUID já vai no payload.
          const response = await api.post('/pedidos', order.payload);
          if (response.data && response.data.id) {
            let saved = [];
            try {
              saved = JSON.parse(localStorage.getItem('meus_pedidos') || '[]');
              if (!Array.isArray(saved)) saved = [];
            } catch (e) {
              saved = [];
            }
            if (!saved.includes(response.data.id)) {
              saved.push(response.data.id);
              localStorage.setItem('meus_pedidos', JSON.stringify(saved));
            }
          }
          await deleteOfflineOrder(order.uuid);"""

content = content.replace(old_sync, new_sync)

with open(filepath, 'w') as f:
    f.write(content)
