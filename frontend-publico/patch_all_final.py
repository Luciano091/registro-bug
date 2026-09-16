import sys
import re

with open('src/components/CheckoutModal.tsx', 'r') as f:
    content = f.read()

# 1. Add states
content = content.replace("  const [cupomErro, setCupomErro] = useState('');",
                          "  const [cupomErro, setCupomErro] = useState('');\n  const [cashbackDisponivel, setCashbackDisponivel] = useState(0);\n  const [usarCashback, setUsarCashback] = useState(false);")

# 2. Add useEffect for /clientes/me
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
content = content.replace("  const fetchConfig = async () => {", use_effect_code + "\n  const fetchConfig = async () => {")

# 3. Change total calculation
content = content.replace("const totalFinal = Math.max(0, cartTotal + deliveryFee - (cupomAplicado?.desconto || 0));",
                          "const partialTotal = Math.max(0, cartTotal + deliveryFee - (cupomAplicado?.desconto || 0));\n  const totalFinal = Math.max(0, partialTotal - (usarCashback ? cashbackDisponivel : 0));")

# 4. Add cashback_usado to payload
content = content.replace("cliente: nome,", "cliente: nome,\n        cashback_usado: usarCashback && cashbackDisponivel > 0 ? (partialTotal > cashbackDisponivel ? cashbackDisponivel : partialTotal) : 0,")

# 5. Add UI in Forma de pagamento
cashback_ui = """
                  {cashbackDisponivel > 0 && (
                    <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={usarCashback} onChange={e => setUsarCashback(e.target.checked)} className="accent-emerald-600 w-5 h-5" />
                        <div>
                          <strong className="block text-emerald-800 text-sm">Usar saldo de Cashback</strong>
                          <span className="text-emerald-600 text-xs">Você tem R$ {cashbackDisponivel.toFixed(2)} disponível</span>
                        </div>
                      </label>
                    </div>
                  )}"""

content = content.replace("O pagamento é feito diretamente ao estabelecimento. O aplicativo não cobra agora.</p>",
                          "O pagamento é feito diretamente ao estabelecimento. O aplicativo não cobra agora.</p>" + cashback_ui)

# 6. Add UI in Footer
footer_cashback = """
            {usarCashback && cashbackDisponivel > 0 && (
              <div className="-mt-2 mb-4 flex items-center justify-between text-xs text-emerald-600 font-bold">
                <span>Desconto (Cashback)</span>
                <span>− R$ {Math.min(partialTotal, cashbackDisponivel).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
              </div>
            )}"""

content = content.replace("<span>Taxa de entrega</span><strong className=\"text-zinc-700\">{deliveryFee ? deliveryFee.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'Grátis'}</strong></div>}",
                          "<span>Taxa de entrega</span><strong className=\"text-zinc-700\">{deliveryFee ? deliveryFee.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'Grátis'}</strong></div>}" + footer_cashback)


with open('src/components/CheckoutModal.tsx', 'w') as f:
    f.write(content)

