#!/bin/bash
echo "🍔 Iniciando Burger House..."
echo ""

# Diretório do projeto
DIR="$(cd "$(dirname "$0")" && pwd)"

# Iniciar o Backend
echo "⚙️  Ligando o servidor backend..."
source "$DIR/backend/venv/bin/activate"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8080 &
BACKEND_PID=$!

# Carregar NVM e iniciar o Frontend
echo "🎨 Ligando o frontend..."
if [ -f "$DIR/.nvm/nvm.sh" ]; then
  export NVM_DIR="$DIR/.nvm"
  \. "$NVM_DIR/nvm.sh"
fi
cd "$DIR/frontend"
npm run dev -- --host 127.0.0.1 --port 5180 &
FRONTEND_PID=$!

# Aguardar o servidor subir
sleep 3

# Abrir o navegador automaticamente
echo "🌐 Abrindo o navegador..."
xdg-open "http://127.0.0.1:5180" 2>/dev/null || echo "Acesse: http://127.0.0.1:5180"

echo ""
echo "✅ Burger House está rodando!"
echo "   Para encerrar, feche esta janela ou pressione Ctrl+C"
echo ""

# Quando o usuário apertar Ctrl+C, matar os dois processos
trap "echo ''; echo '👋 Encerrando Burger House...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Manter o script rodando
wait
