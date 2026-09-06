import re

filepath = 'frontend-publico/src/components/CheckoutModal.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Fill defaults from localStorage
content = content.replace(
    "const [nome, setNome] = useState('');", 
    "const [nome, setNome] = useState(localStorage.getItem('user_nome') || '');"
)
content = content.replace(
    "const [telefone, setTelefone] = useState('');", 
    "const [telefone, setTelefone] = useState(localStorage.getItem('user_telefone') || '');"
)
content = content.replace(
    "const [endereco, setEndereco] = useState('');", 
    "const [endereco, setEndereco] = useState(localStorage.getItem('user_endereco') || '');"
)

# Store new info on submit so next time it's there even if they didn't use Conta tab
store_info_code = """      localStorage.setItem('user_nome', nome);
      localStorage.setItem('user_telefone', telefone);
      if (tipoPedido === 'entrega') localStorage.setItem('user_endereco', endereco);

      if (!isOnline) {"""
content = content.replace("if (!isOnline) {", store_info_code)

# Store order ID
old_post = """        try {
          await api.post('/pedidos', pedidoData);
        }"""
new_post = """        try {
          const response = await api.post('/pedidos', pedidoData);
          if (response.data && response.data.id) {
            const saved = JSON.parse(localStorage.getItem('meus_pedidos') || '[]');
            saved.push(response.data.id);
            localStorage.setItem('meus_pedidos', JSON.stringify(saved));
          }
        }"""
content = content.replace(old_post, new_post)

with open(filepath, 'w') as f:
    f.write(content)
