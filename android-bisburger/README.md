# BisBurger para Android

Aplicativo Android do cardápio BisBurger publicado em `bisburger.ritmesa.com.br`.
Ele usa Trusted Web Activity (TWA), portanto as mudanças publicadas no cardápio
web aparecem no aplicativo sem manter uma segunda interface.

O identificador Android é `br.com.ritmesa.bisburger`. A chave de assinatura e
suas senhas são arquivos locais ignorados pelo Git e precisam de backup seguro.

## Artefatos

- `app-release-signed.apk`: instalação direta em aparelhos Android.
- `app-release-bundle.aab`: envio para a Google Play Console.
- `bisburger-release.keystore`: chave permanente para assinar atualizações.
- `.keystore-password`: senha local da chave.

Faça backup dos dois últimos arquivos. Sem essa chave, não é possível publicar
uma atualização com a mesma identidade Android.

## Gerar uma atualização

Atualize `appVersionCode` e `appVersion` em `twa-manifest.json`, aplique as
mudanças com `npx bubblewrap update` e compile com `npx bubblewrap build`. A
compilação lê as senhas pelas variáveis `BUBBLEWRAP_KEYSTORE_PASSWORD` e
`BUBBLEWRAP_KEY_PASSWORD`.

O site precisa publicar `/.well-known/assetlinks.json` para validar o domínio e
abrir o aplicativo em tela cheia.
