# Gateway local do WhatsApp — Ritmesa

Serviço local e isolado que conecta o WhatsApp Business como um aparelho vinculado, usando o WhatsApp Web em um Chrome invisível. Ele não faz parte do backend de pedidos: se for desligado, o cardápio, o painel e os aplicativos continuam funcionando.

## Requisitos

- Node.js 20 ou superior;
- Google Chrome ou Chromium instalado;
- computador ligado e conectado durante o atendimento;
- um número do WhatsApp Business dedicado ao estabelecimento.

## Instalação

```bash
cd whatsapp-local-gateway
cp .env.example .env
PUPPETEER_SKIP_DOWNLOAD=true npm install
npm start
```

Abra `http://127.0.0.1:3210`, entre no WhatsApp Business pelo celular e acesse **Aparelhos conectados → Conectar um aparelho**. Escaneie o QR Code exibido na página.

A sessão fica em `.session/`, fora do Git. Não copie, envie ou compartilhe essa pasta: ela permite acesso ao WhatsApp conectado.

## Iniciar automaticamente com o computador

Depois de validar a conexão, copie `deploy/ritmesa-whatsapp.service` para `~/.config/systemd/user/` e execute:

```bash
systemctl --user daemon-reload
systemctl --user enable --now ritmesa-whatsapp.service
```

O serviço será reiniciado automaticamente em caso de falha. O painel permanece disponível somente neste computador em `http://127.0.0.1:3210`.

## Comportamento da primeira versão

- responde apenas conversas individuais, nunca grupos ou Status;
- junta mensagens consecutivas antes de responder;
- apresenta-se como assistente virtual;
- responde cardápio, horário, endereço, pagamento, entrega e acompanhamento;
- envia o cliente para o cardápio web para finalizar o pedido;
- pausa ao receber o pedido “atendente”;
- pausa automaticamente quando uma pessoa responde pelo celular;
- aplica limite por contato para evitar loops e excesso de mensagens;
- permite pausar toda a automação pela página local.

## Segurança e limitações

Esta integração automatiza o WhatsApp Web e não é uma API oficial. Atualizações do WhatsApp podem interromper o funcionamento, desconectar a sessão ou exigir novo QR Code. Existe risco de restrição do número conforme os termos do WhatsApp; não utilize para disparos, campanhas ou mensagens não solicitadas.
