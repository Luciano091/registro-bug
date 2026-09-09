# Plano de produto — Ritmesa completo

## Objetivo

Transformar o Ritmesa em uma plataforma SaaS multiestabelecimento para operações
de alimentação no Brasil, com módulos configuráveis para delivery, retirada,
balcão, salão, autoatendimento e múltiplas unidades.

Cada módulo somente é considerado concluído quando inclui modelo de dados,
migração, API, interface responsiva, permissões, auditoria, testes automatizados,
documentação operacional e validação em produção controlada.

## Ordem de construção

### 1. Fundação transacional e segurança

- Migrações versionadas com Alembic e processo seguro de rollback.
- Usuários individuais por estabelecimento e por unidade.
- Perfis: proprietário, gerente, caixa, atendente, garçom, cozinha e entregador.
- Permissões granulares e encerramento de sessões.
- Recuperação de senha, política de senha e opção de segundo fator.
- Auditoria de login, preço, desconto, cancelamento, caixa, estoque e pedido.
- Isolamento multi-tenant com chaves e restrições compostas no banco.
- Identificador público não enumerável para acompanhamento de pedidos.
- Valores monetários armazenados como decimal.
- Histórico imutável de status e eventos do pedido.
- Idempotência nas operações financeiras e criação de pedidos.
- Backup, restauração testada, monitoramento, alertas e rastreamento de erros.

### 2. Catálogo e pedido completos

- Categorias ordenáveis e disponibilidade por canal e horário.
- Variações, tamanhos, sabores, bordas, pontos e grupos de adicionais.
- Regras de mínimo, máximo, obrigatório, quantidade e preço por opção.
- Combos, complementos, meio a meio, observações e promoções programadas.
- Persistência do retrato do item vendido, inclusive nome e preço no momento da venda.
- Cupons com validade, limite, público, canal e regra de aplicação.
- Taxa de entrega por bairro, CEP, distância ou polígono.
- Cancelamento, estorno, reembolso e motivo obrigatório.

### 3. Salão, comandas e garçom

- Setores e mapa de mesas configurável.
- Estados: disponível, ocupada, ociosa, conta solicitada e reservada.
- Mesas, comandas individuais e múltiplas comandas por mesa.
- Aplicativo responsivo do garçom com login e permissões próprias.
- Transferência, união e divisão de mesa ou comanda.
- Divisão por item, pessoa, valor e forma de pagamento.
- Taxa de serviço, couvert, desconto autorizado e consumo mínimo.
- QR Code por mesa para visualizar, pedir, chamar garçom e solicitar conta.
- Registro de responsável e desempenho por garçom.

### 4. Produção, KDS e impressão

- KDS por setor: cozinha, chapa, bar, confeitaria e expedição.
- Filas configuráveis com recebido, aceito, preparando, pronto e entregue.
- Temporizadores, prioridade, atraso, reimpressão e cancelamento.
- Roteamento de itens para telas e impressoras específicas.
- Impressão ESC/POS por agente local resiliente à queda de internet.
- Painel de retirada/senha e aviso ao cliente.

### 5. Delivery e entregador

- Cadastro, disponibilidade, escala e área de atuação do entregador.
- Despacho manual e automático por distância, carga e prazo.
- Aplicativo do entregador com aceitar, coletar e concluir entrega.
- Navegação por Google Maps ou Waze.
- Localização em tempo real com frequência e consumo de bateria controlados.
- Página segura de rastreamento para o cliente e previsão de chegada.
- Prova de entrega por código, assinatura ou fotografia.
- Agrupamento de rotas, retorno, ocorrência e acerto financeiro.

### 6. PDV, pagamentos e fiscal

- Frente de caixa rápida para toque, teclado, leitor e SmartPOS.
- Pagamentos múltiplos, troco, gorjeta e divisão da conta.
- Pix dinâmico, cartão online, link de pagamento, conciliação e estorno.
- Integração TEF/adquirentes conforme equipamento e plano.
- NFC-e e contingência, com regras fiscais configuráveis por UF.
- Cadastro tributário de produtos, certificado, XML e envio à contabilidade.

### 7. Estoque, compras e financeiro

- Movimentação por lançamento, venda, perda, produção, ajuste e transferência.
- Ficha técnica, rendimento, conversão de unidade e produção de receitas.
- Inventário, estoque mínimo, lote, validade e custo médio.
- Fornecedores, cotação, pedido de compra e entrada por XML.
- Contas a pagar e receber, centros de custo, categorias e recorrências.
- Fluxo de caixa, conciliação, CMV, margem, DRE e projeções.

### 8. Canais, CRM e expansão

- Integrações homologadas com marketplaces e central única de pedidos.
- WhatsApp com catálogo, automação, recuperação de carrinho e atendimento humano.
- Fidelidade, cashback, pontos, vale-presente e pesquisa de satisfação.
- Segmentação de clientes e campanhas com consentimento.
- Multiunidade, central de produção, transferência e visão de franquia.
- Planos, cobrança recorrente, limites, trial, inadimplência e suporte Ritmesa.

## Primeiro ciclo de implementação

O primeiro ciclo entrega a fundação transacional e o catálogo completo. A ordem
interna é:

1. Introduzir Alembic sem perder os dados existentes.
2. Criar usuários, vínculos com estabelecimentos, perfis e permissões.
3. Proteger consultas públicas de pedidos com token não enumerável.
4. Corrigir restrições multi-tenant de clientes e demais entidades.
5. Criar grupos de opções, adicionais, variações e o retrato do item vendido.
6. Migrar dinheiro de `float` para decimal.
7. Criar eventos do pedido e log de auditoria.
8. Cobrir isolamento, autorização, pedido e estoque com testes de integração.

### Progresso em 09/09/2026

- Concluído: Alembic no processo de deploy, com criação segura da base e do proprietário inicial.
- Concluído: usuários individuais, sete perfis, permissões aplicadas nas rotas atuais e tela responsiva de equipe.
- Concluído: auditoria de login e administração de usuários.
- Concluído: acompanhamento público por UUID não sequencial e isolado por estabelecimento.
- Em andamento: restrições compostas multi-tenant e catálogo com adicionais e variações.

## Critério para iniciar vendas em escala

- Nenhum usuário acessa dados ou ações fora de sua permissão e estabelecimento.
- Pedido, pagamento, estoque e caixa são idempotentes e auditáveis.
- Backup e restauração são testados periodicamente.
- Fluxos críticos têm testes automatizados e monitoramento em produção.
- Existe processo de suporte, incidente, privacidade e continuidade operacional.
- Os recursos divulgados comercialmente estão concluídos de ponta a ponta.
