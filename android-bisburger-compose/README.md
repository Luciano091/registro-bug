# BisBurger Android nativo

Reimplementação gradual do aplicativo do cliente em Kotlin e Jetpack Compose. Este projeto é separado do aplicativo híbrido atual para permitir validação por etapas sem interromper a versão em produção.

## Estado atual

- Cardápio nativo com carregamento em segundo plano e skeleton imediato.
- Cache local Room para abrir o último cardápio sem esperar a rede.
- Atualização paralela de configuração, categorias e produtos.
- Recebimento persistente da notificação FCM `delivery_progress`, com barra de progresso até a entrega.
- Registro e renovação segura do token FCM em `PUT /clientes/push`, com diagnóstico na tela da conta.
- Login Google nativo com o mesmo Client ID e contrato do aplicativo atual.
- Seleção nativa de adicionais, observação, quantidades e carrinho.
- Checkout nativo para entrega fixa/por bairro/distância e retirada, com cupom, cashback e resumo fixo.
- Criação e acompanhamento de pedidos pelo código público `uuid`.
- Toque na notificação de entrega abre diretamente o acompanhamento.
- Marcadores de desempenho no Logcat com a tag `BisBurgerStartup`.

Versão 2.0.3. O fluxo 2.0.0 foi validado em aparelho físico com um pedido real completo, incluindo notificações automáticas de `em_rota` e `entregue`. A atualização 2.0.1 limpa cupom e cashback após cada pedido e estabiliza a rolagem do checkout. A 2.0.2 exibe automaticamente o cupom ativo no app e o deixa preparado para validação no pedido. A 2.0.3 compacta esse pop-up para preservar mais do cardápio visível.

## Validação local

```bash
./gradlew testDebugUnitTest assembleDebug
```

APK de engenharia:

`app/build/outputs/apk/debug/app-debug.apk`

## Medição de abertura

Com o aparelho conectado por ADB:

```bash
adb logcat -c
adb shell am force-stop br.com.ritmesa.bisburger
adb shell monkey -p br.com.ritmesa.bisburger 1
adb logcat -d -s BisBurgerStartup:I '*:S'
```

O marcador `catalog_visible` informa o tempo desde o início do processo Android até o cardápio realmente aparecer. Medir abertura fria e quente separadamente evita misturar tempo de inicialização com tempo de API.

## Regra de publicação

O aplicativo nativo usa a assinatura existente. A publicação exige build de release assinado e validação do fluxo completo de pedido, incluindo `em_rota → entregue` com um cliente autenticado.
