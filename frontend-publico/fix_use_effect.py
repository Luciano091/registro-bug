import sys

with open('src/components/CheckoutModal.tsx', 'r') as f:
    content = f.read()

use_effect_code = """
  useEffect(() => {
    const token = localStorage.getItem('cliente_token');
    if (token) {
      api.get(`/public/${getEstablishmentSlug()}/clientes/me`).then(res => {
        if (res.data && res.data.saldo_cashback) {
          setCashbackDisponivel(res.data.saldo_cashback);
        }
      }).catch(e => console.error(e));
    }
  }, []);
"""

content = content.replace("  useEffect(() => { setCupomAplicado(null); setCupomErro(''); }, [cartTotal]);", use_effect_code + "\n  useEffect(() => { setCupomAplicado(null); setCupomErro(''); }, [cartTotal]);")

with open('src/components/CheckoutModal.tsx', 'w') as f:
    f.write(content)
