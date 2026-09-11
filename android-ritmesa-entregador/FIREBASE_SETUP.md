# Firebase Cloud Messaging

O APK 1.1.0 usa o Firebase Cloud Messaging para avisar o entregador mesmo com o aplicativo fechado.

## Aplicativo Android

1. Crie ou selecione um projeto no Firebase.
2. Adicione o aplicativo Android com o pacote `br.com.ritmesa.entregador`.
3. Baixe `google-services.json` e salve em `android/app/google-services.json`.
4. Não envie esse arquivo para um repositório público; ele está ignorado pelo Git.

## Backend no Render

1. Em **Configurações do projeto > Contas de serviço**, gere uma chave privada JSON.
2. No serviço da API no Render, configure:
   - `FIREBASE_PROJECT_ID`: o ID do projeto Firebase.
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: o conteúdo completo da chave privada JSON.
3. Faça um novo deploy do backend.

O backend usa a API HTTP v1. Os tokens ficam associados ao estabelecimento e ao usuário autenticado. Tokens inválidos são desativados automaticamente.
