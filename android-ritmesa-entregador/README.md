# Ritmesa Entregador

Aplicativo Android dos entregadores da plataforma Ritmesa. O app carrega o painel operacional e adiciona um serviço nativo de localização para manter o rastreamento durante uma entrega mesmo com a tela apagada.

## Comportamento

- O entregador entra com o usuário criado pelo restaurante.
- Ao compartilhar a localização, o Android solicita acesso ao GPS e inicia um serviço em primeiro plano.
- Uma notificação permanente informa que a entrega está sendo acompanhada.
- O serviço envia a posição ao backend a cada 10 segundos, respeitando deslocamento mínimo de 10 metros.
- Ao concluir, registrar ocorrência ou tocar em **Parar** na notificação, o serviço é encerrado.
- Google Maps e Waze são abertos por links de navegação e não exigem chave de API.

## Compilação

O projeto requer Node.js, JDK 21 e Android SDK. Depois de instalar as dependências:

```bash
npm install
npm run sync
cd android
./gradlew assembleDebug
```

Para uma versão distribuível, configure `android/keystore.properties` e execute `./gradlew assembleRelease`.

O aplicativo solicita apenas localização em uso. O rastreamento iniciado pelo entregador utiliza um serviço em primeiro plano com notificação visível; não solicita acesso permanente à localização.
