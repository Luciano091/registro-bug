filepath = 'frontend-publico/src/pages/PublicMenu.tsx'
with open(filepath, 'r') as f:
    content = f.read()

import re

# Find the block from <div className="w-full relative flex flex-col items-center justify-end min-h-[260px] to the end of that div (before max-w-4xl)

pattern = re.compile(r'      <div className="w-full relative flex flex-col items-center justify-end min-h-\[260px\].*?      </div>\n\n      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-20 mt-6">', re.DOTALL)

new_header = """      <div className="w-full bg-white border-b border-zinc-200 pt-6 pb-4 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full p-0.5 border border-zinc-200 shrink-0 overflow-hidden shadow-sm">
              <img src={config?.logo || "/logo.jpg"} alt={config?.nome_empresa || "Logo"} className="w-full h-full object-cover rounded-full" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-heading font-black text-zinc-900 uppercase tracking-tight flex items-center justify-between">
                {config?.nome_empresa || 'Burger Hause'}
              </h1>
              
              <div className="flex items-center gap-2 mt-1">
                {config?.loja_aberta ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></div>
                    <span className="text-sm font-bold text-[#22C55E]">Aberto</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-bold text-red-500">Fechado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-4">
             <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-emerald-100">
                <MapPin size={14} />
                {config?.taxa_entrega === 0 || !config?.taxa_entrega ? 'Grátis' : `Taxa: R$ ${config.taxa_entrega.toFixed(2).replace('.', ',')}`}
             </div>
             <div className="bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-zinc-200">
                <Clock size={14} />
                {config?.tempo_medio_preparo || 30} min
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-20 mt-4">"""

content = re.sub(pattern, new_header, content)

with open(filepath, 'w') as f:
    f.write(content)
