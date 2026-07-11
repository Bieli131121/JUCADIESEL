# Relatório Completo — Sistema de Gestão JUCAX (Mecânica Diesel)

**Stack:** React + Vite + TypeScript + Tailwind CSS + Supabase (com fallback automático para localStorage) + Electron (desktop)
**Repositório:** github.com/Bieli131121/JUCADIESEL

---

## 1. Autenticação e Controle de Acesso

- Login com **usuário + PIN** (4-6 dígitos), PIN armazenado com hash SHA-256 (nunca texto puro)
- **3 níveis de acesso:**
  - **Admin**: acesso total, inclusive cadastro de usuários e configurações
  - **Recepção**: clientes, veículos, agendamento, OS, financeiro
  - **Mecânico**: OS e estoque (consulta/uso) — sem financeiro nem configurações
- Rotas protegidas automaticamente por permissão
- **Bloqueio por tentativas**: 5 PINs errados bloqueiam o login por 15 minutos
- **Timeout de sessão**: logout automático após 30 min de inatividade
- Usuário `admin` criado automaticamente no primeiro uso (PIN inicial `1234` — **troque isso**)
- Edição de nome/nível de acesso, redefinição de PIN, ativar/desativar usuário

## 2. Painel (Dashboard)

- KPIs: total de clientes, veículos, OS em aberto, OS finalizadas, faturamento do mês, faturamento anual, peças em estoque, produtos com estoque baixo
- Gráfico de faturamento (últimos 6 meses) e de OS criadas por mês
- Ranking de serviços mais vendidos e mecânicos com mais atendimentos
- Últimos clientes cadastrados e últimas ordens de serviço

## 3. Clientes e Veículos

- Cadastro completo: nome, CPF/CNPJ, RG, telefone, WhatsApp, e-mail, foto, endereço com **busca automática de CEP (ViaCEP)**, cidade, estado, observações
- Cada cliente pode ter vários veículos: placa, marca, modelo, ano, motor, combustível, cor, KM, chassi, renavam
- **Galeria de fotos por veículo**
- Ficha do cliente com abas: **Veículos**, **Histórico de OS**, **Financeiro**
- **Cadastro rápido de cliente e veículo direto na criação de uma OS** (sem precisar sair do fluxo)
- Busca por nome/telefone/CPF + paginação

## 4. Ordens de Serviço

- Numeração automática (#1001, #1002...)
- Fluxo de status: `Orçamento → Aprovado → Em execução → (Aguardando peça | Aguardando cliente) → Concluído → Entregue`, com `Cancelado` disponível a qualquer momento
- Seletor de status mostra só as transições válidas pro momento atual
- Itens de serviço e peça, com tempo de mão de obra (minutos) por serviço
- **Baixa automática de estoque** ao aprovar; **estorno automático** se cancelar depois
- **Geração automática de conta a receber** ao marcar como entregue
- Desconto, frete, valor pago e saldo devedor calculados automaticamente
- Garantia (dias) com data-limite calculada a partir da entrega
- **Checklist** de itens verificáveis
- **Fotos e vídeos** anexados à OS
- **Assinatura digital do cliente** (desenhada na tela)
- **Histórico de alterações** (quem mudou o quê e quando)
- Envio de **WhatsApp** contextual ao status (orçamento, OS aberta, veículo pronto, OS finalizada)
- **Emissão de Nota Fiscal (NFS-e) real** via Focus NFe, com consulta de status e link do PDF

## 5. Estoque

- Peças com código interno, código de barras, categoria, localização, fornecedor, preço de custo/venda, estoque mínimo
- Filtro por categoria
- Movimentações: **entrada**, **saída manual**, **ajuste de inventário** (contagem física), **estorno automático** (de cancelamento de OS)
- Histórico de movimentações por peça
- KPIs: valor total em estoque (custo e venda), peças com estoque baixo

## 6. Financeiro

- **Contas a receber** (geradas automaticamente pelas OS) e **contas a pagar** (manuais)
- Categoria e centro de custo em cada lançamento
- **Formas de pagamento**: dinheiro, PIX, cartão crédito/débito, cheque, transferência
- **Fluxo de caixa** com saldo, entradas e saídas — inclui lançamentos manuais (receita/despesa avulsa)
- **Conciliação** (marcar lançamento como conferido com o extrato)
- Cobrança via WhatsApp direto da conta pendente

## 7. Agendamento

- **Calendário** com visões Mês, Semana e Dia
- **Arrastar e soltar** pra reagendar
- Lembretes automáticos (toast) de agendamentos na próxima hora
- Confirmação via WhatsApp

## 8. Relatórios

- Faturamento total, ticket médio, lucro estimado (faturamento − custo de peças − despesas), taxa de conversão orçamento→aprovado
- Faturamento por mês, peças mais usadas, distribuição de OS por status, estoque baixo
- **Exportação real em PDF** (jsPDF) e **Excel** (5 abas: resumo, OS, clientes, veículos, financeiro, estoque)
- Impressão com CSS dedicado (oculta menu/sidebar)

## 9. Configurações

- **Marca**: nome, logo, cor de destaque do menu
- **Dados fiscais**: CNPJ, Inscrição Estadual/Municipal, status do certificado digital
- **Tema**: claro/escuro (aplicado ao sistema inteiro via variáveis CSS)
- **Backup**: baixar snapshot em JSON; restaurar (modo local) ou consultar (modo Supabase)
- **Auditoria**: log de login/logout, tentativas bloqueadas, criação/edição de usuário, redefinição de PIN
- **WhatsApp**: 7 templates de mensagem editáveis, com variáveis (`{{cliente}}`, `{{numero_os}}` etc.)
- **Nota Fiscal**: ambiente (homologação/produção), CNAE, código de serviço municipal, alíquota ISS, regime tributário, toggle de ativação

## 10. WhatsApp (estrutura funcional hoje)

- Envio via link direto (`wa.me`) com mensagem pré-preenchida — funciona sem custo e sem aprovação de API
- Gatilhos: orçamento, OS aberta, veículo pronto, OS finalizada, lembrete de revisão, cobrança, confirmação de agendamento
- Preparado pra evoluir pra API oficial (360dialog/Zapi) no futuro, sem mudar o restante do sistema

## 11. Nota Fiscal (emissão real via Focus NFe)

- Proxy seguro do token (Vercel serverless function **e** rota equivalente no servidor embutido do Electron — funciona web e desktop)
- Emissão de NFS-e direto da OS, com consulta de status assíncrona e link do PDF
- **Pendente de você**: conta ativa no Focus NFe + certificado digital cadastrado lá + token configurado como variável de ambiente (`FOCUS_NFE_TOKEN_HOMOLOGACAO`/`_PRODUCAO`) + confirmar código de serviço municipal de Garopaba/SC

## 12. Segurança

- Sanitização de campos de texto livre antes de salvar
- `ErrorBoundary` global (tela amigável em vez de tela branca em caso de erro)
- Índices de banco revisados (9 índices adicionados nas Fases 12/13)

## 13. Qualidade de Código

- ESLint + Prettier configurados (`npm run lint` / `npm run format`)
- Zero erros de lint no código atual

## 14. UX

- Busca global (`Ctrl+K`) por cliente, veículo (placa) e nº de OS
- Paginação em Ordens de Serviço e Clientes
- Confirmação antes de excluir (itens de OS, mudanças de status)
- Toasts, skeleton loading, animações suaves em todo o sistema
- `Esc` fecha modais

## 15. Versão Desktop (Electron)

- Ícone personalizado (símbolo recortado da logo JUCAX)
- Splash screen com a logo ao abrir
- Lembra tamanho/posição da janela entre sessões
- Trava de instância única (não abre duas vezes)
- **Atalho "Sistema Oficina" criado automaticamente** na área de trabalho a cada `npm install` (detecta OneDrive)
- Instalador profissional preparado (`npm run dist` gera `.exe` via electron-builder, com atalho de desktop/menu iniciar automáticos)
- Auto-update preparado (electron-updater), ativa quando você publicar uma release no GitHub

## 16. Mecânicos

- Cadastro completo: nome, telefone, especialidade
- **Comissão configurável** por mecânico (%), calculada automaticamente sobre o faturamento das OS entregues atribuídas a ele
- Painel de produtividade: total de atendimentos, entregues no mês, faturamento gerado, comissão estimada

## 17. Fornecedores e Ordens de Compra

- Cadastro de fornecedores (CNPJ, contato, prazo de pagamento) — peças podem ser vinculadas a um fornecedor cadastrado
- **Ordem de compra**: rascunho → enviada → recebida (ou cancelada)
- Ao marcar como **recebida**, dá entrada automática no estoque

## 18. Manutenção Preventiva (Revisões)

- Configuração por veículo: intervalo de revisão em KM e/ou em meses
- Atualização automática do KM/data da última revisão ao entregar uma OS
- Painel de revisões com status (Em dia / Próxima / Atrasada) + lembrete via WhatsApp

## 19. Aprovação de Orçamento Online

- Link público (sem login) pro cliente aprovar o orçamento remotamente
- Botão "Enviar link de aprovação" na OS, já monta mensagem de WhatsApp com o link
- **Atenção**: só acessível de outros dispositivos quando publicado na web (Vercel)

## 20. Central de Mensagens WhatsApp

- Histórico de mensagens preparadas pelo sistema, com filtro por tipo

## 21. CI/CD

- GitHub Actions (`.github/workflows/build.yml`) — build+lint automático a cada push

---
---

## ⚠️ Pendências que só você resolve (não são código)

1. **Trocar o PIN do usuário `admin`** (ainda é `1234` por padrão)
2. **Configurar o Supabase** — hoje tudo roda em modo local (localStorage); dados não sincronizam entre PC e notebook até isso ser feito
3. **Fazer `git commit` + `push`** — desde a Fase 9, nada foi enviado pro GitHub; todo o trabalho das Fases 10-17 existe só localmente
4. **Focus NFe**: criar/confirmar conta, cadastrar certificado digital lá, gerar token, configurar variável de ambiente, confirmar código de serviço municipal de Garopaba
5. **WhatsApp API oficial**: só necessário se quiser automatizar 100% (hoje já funciona manualmente via link direto, sem custo)
