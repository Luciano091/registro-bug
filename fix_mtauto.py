with open('frontend-publico/src/pages/PublicMenu.tsx', 'r') as f:
    content = f.read()

content = content.replace('<div className="mt-auto">\n      {/* AVISO IMPORTANTE */}', '{/* AVISO IMPORTANTE */}')
content = content.replace('</footer>\n      </div>', '</footer>')

with open('frontend-publico/src/pages/PublicMenu.tsx', 'w') as f:
    f.write(content)
