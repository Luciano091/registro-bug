export const dashboardHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WhatsApp • Ritmesa</title>
  <style>
    :root{font-family:Inter,system-ui,sans-serif;color:#172033;background:#f4f6f8}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}.shell{width:min(920px,100%)}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.brand{display:flex;gap:12px;align-items:center}.mark{width:44px;height:44px;border-radius:14px;background:#ff6b17;color:white;display:grid;place-items:center;font-size:22px}.card{background:white;border:1px solid #dfe5ec;border-radius:22px;padding:24px;box-shadow:0 16px 45px rgba(20,32,51,.08)}.grid{display:grid;grid-template-columns:320px 1fr;gap:24px}.qr{min-height:320px;border:1px dashed #cad3df;border-radius:18px;display:grid;place-items:center;padding:16px;text-align:center}.qr img{width:270px;height:270px}.pill{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border-radius:999px;font-weight:700;font-size:13px;background:#fff0e7;color:#b64100}.dot{width:9px;height:9px;border-radius:50%;background:currentColor}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}button{border:0;border-radius:12px;padding:11px 15px;font-weight:750;cursor:pointer;background:#ff6b17;color:#fff}button.secondary{background:#eef2f6;color:#344054}.logs{height:225px;overflow:auto;background:#111827;color:#cbd5e1;border-radius:14px;padding:14px;font:12px/1.55 ui-monospace,monospace}.muted{color:#667085;line-height:1.55}.warning{margin-top:16px;border-radius:14px;background:#fff8e7;color:#754c00;padding:13px 15px;font-size:13px}@media(max-width:760px){.grid{grid-template-columns:1fr}.qr{min-height:290px}}
  </style>
</head>
<body>
  <main class="shell">
    <header><div class="brand"><div class="mark">◉</div><div><strong>Ritmesa</strong><div class="muted">Conexão local do WhatsApp</div></div></div><span id="status" class="pill"><i class="dot"></i>Iniciando</span></header>
    <section class="card grid">
      <div id="qr" class="qr"><div><strong>Preparando o WhatsApp Web…</strong><p class="muted">O QR Code aparecerá aqui.</p></div></div>
      <div>
        <h1>Atendimento da BisBurger</h1>
        <p id="description" class="muted">O navegador trabalha em segundo plano neste computador. Escaneie o QR Code em WhatsApp Business → Aparelhos conectados.</p>
        <div class="actions"><button id="toggle">Pausar robô</button><button class="secondary" id="refresh">Atualizar</button></div>
        <h3>Atividade recente</h3><div id="logs" class="logs">Aguardando eventos…</div>
        <div class="warning">Mantenha este computador ligado e conectado durante o atendimento. O QR Code nunca deve ser compartilhado.</div>
      </div>
    </section>
  </main>
<script>
const labels={starting:'Iniciando',waiting_qr:'Aguardando QR Code',authenticated:'Autenticando',ready:'WhatsApp conectado',disconnected:'Desconectado',auth_failure:'Falha na autenticação'};
async function load(){const response=await fetch('/api/status');const data=await response.json();document.getElementById('status').innerHTML='<i class="dot"></i>'+(labels[data.connection]||data.connection);document.getElementById('toggle').textContent=data.automationEnabled?'Pausar robô':'Ativar robô';document.getElementById('description').textContent=data.automationEnabled?'O assistente está autorizado a responder mensagens novas.':'O WhatsApp continua conectado, mas o assistente não responderá automaticamente.';document.getElementById('qr').innerHTML=data.qr?'<img alt="QR Code do WhatsApp" src="'+data.qr+'" />':(data.connection==='ready'?'<div><div style="font-size:64px">✓</div><strong>Conectado com sucesso</strong><p class="muted">Pode fechar esta página; o serviço continuará trabalhando.</p></div>':'<div><strong>'+(labels[data.connection]||'Preparando…')+'</strong><p class="muted">Aguarde alguns instantes.</p></div>');document.getElementById('logs').textContent=data.logs.length?data.logs.map(x=>'['+x.time+'] '+x.message).join('\\n'):'Aguardando eventos…';}
document.getElementById('refresh').onclick=load;document.getElementById('toggle').onclick=async()=>{const current=(await (await fetch('/api/status')).json()).automationEnabled;await fetch('/api/automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!current})});load()};load();setInterval(load,3000);
</script>
</body></html>`;
