# Sistema de Gestão para Oficina Mecânica

React + Vite + TypeScript + Supabase, com fallback automático para
localStorage (modo local) quando o Supabase não está configurado.

## Módulos

- Ordem de Serviço (fluxo: Orçamento → Aprovado → Em execução → Aguardando peça → Concluído → Entregue)
- Clientes e Veículos
- Estoque de peças (baixa automática ao aprovar OS, estorno se cancelar)
- Financeiro (contas a receber geradas automaticamente ao entregar OS, contas a pagar manuais)
- Agendamento
- Relatórios (faturamento, ticket médio, taxa de conversão, peças mais usadas)
- Configurações (nome, logo e cor do menu — personalização da marca)

## Setup

```bash
npm install
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
npm run dev
```

Sem `.env` preenchido, o sistema roda automaticamente em modo local
(dados salvos no navegador via localStorage) — útil para testar antes
de configurar o Supabase, ou como fallback offline no desktop.

## Banco de dados

Rode o arquivo `schema.sql` (compartilhado anteriormente) no SQL Editor
do seu projeto Supabase antes de conectar o `.env`. Ele já cria as
tabelas, triggers de baixa de estoque, geração de contas a receber e as
views usadas na tela de Relatórios.

## Deploy Web (Vercel)

Conecte o repositório no Vercel normalmente. O `vercel.json` já inclui
o rewrite de SPA. Lembre de configurar `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto na Vercel.

## App Desktop (Electron)

```bash
npm run build       # gera a pasta dist/
npm run electron    # abre o app desktop, servindo dist/ via servidor local na porta 34568
```

O Electron sobe um servidor Express local (mesmo padrão usado no
PlacasFlow) para evitar tela preta ao carregar arquivos via `file://`.

## Estrutura

```
src/
  lib/
    supabase.ts      # cliente Supabase
    db.ts            # camada de dados (Supabase + fallback localStorage)
  types/database.ts  # tipos espelhando o schema.sql
  hooks/
    useDevice.ts         # detecção mobile/tablet/desktop
    useEmpresaConfig.ts  # carrega nome/logo/cor do menu
  components/
    layout/    # Sidebar, Header, Layout
    ui/        # StatusBadge, Modal, Placa
  pages/       # uma página por módulo
electron/
  main.cjs     # processo principal do app desktop
```
