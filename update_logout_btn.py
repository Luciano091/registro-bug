filepath = 'frontend-publico/src/pages/ContaView.tsx'
with open(filepath, 'r') as f:
    content = f.read()

old_btn = """        {isLoggedIn && (
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        )}"""

new_btn = """        {isLoggedIn && (
          <button onClick={handleLogout} className="flex items-center gap-2 p-2 text-zinc-400 hover:text-red-500 transition-colors">
            <span className="text-sm font-bold">Sair</span>
            <LogOut size={20} />
          </button>
        )}"""

content = content.replace(old_btn, new_btn)

with open(filepath, 'w') as f:
    f.write(content)
