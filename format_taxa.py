filepath = 'frontend-publico/src/pages/PublicMenu.tsx'
with open(filepath, 'r') as f:
    content = f.read()

old_taxa = "{config?.taxa_entrega === 0 || !config?.taxa_entrega ? 'Grátis' : `Taxa: R$ ${config.taxa_entrega.toFixed(2).replace('.', ',')}`}"
new_taxa = "{config?.taxa_entrega === 0 || !config?.taxa_entrega ? 'Grátis' : `( Taxa ${Math.floor(config.taxa_entrega)} Real )`}"

content = content.replace(old_taxa, new_taxa)

with open(filepath, 'w') as f:
    f.write(content)
