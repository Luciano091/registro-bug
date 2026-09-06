filepath = 'frontend-publico/src/pages/PublicMenu.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Replace from HEADER to MODALS
parts = content.split("{/* HEADER / HERO */}")
if len(parts) == 2:
    part1 = parts[0]
    subparts = parts[1].split("{/* MODALS & FLOATING CART */}")
    
    if len(subparts) == 2:
        main_content = subparts[0]
        modals_content = subparts[1]
        
        new_content = part1 + """{/* DYNAMIC VIEWS */}
      {activeTab === 'cardapio' && (
        <div className="animate-in fade-in duration-300">
          {/* HEADER / HERO */}
""" + main_content + """
        </div>
      )}

      {activeTab === 'cupons' && <CuponsView />}
      {activeTab === 'pedidos' && <PedidosView />}
      {activeTab === 'conta' && <ContaView />}

      {/* MODALS & FLOATING CART */}
""" + modals_content

        with open(filepath, 'w') as f:
            f.write(new_content)
        print("Updated PublicMenu.tsx successfully")
    else:
        print("Could not find MODALS block")
else:
    print("Could not find HEADER block")

