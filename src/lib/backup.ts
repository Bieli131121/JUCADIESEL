import { supabaseConfigured } from './supabase'
import {
  listClientes,
  listVeiculos,
  listPecas,
  listMecanicos,
  listOrdensServico,
  listAgendamentos,
  listContasReceber,
  listContasPagar,
  listCaixaMovimentacoes,
  getEmpresaConfig,
} from './db'

const LS_PREFIX = 'oficina_'

// No modo local, o backup é um espelho direto do localStorage.
// No modo Supabase, geramos um snapshot em JSON a partir dos dados atuais
// (útil como cópia de segurança point-in-time, não como substituto do
// backup nativo do banco).

export async function exportarBackupJSON(): Promise<void> {
  let payload: Record<string, unknown>

  if (supabaseConfigured) {
    const [clientes, veiculos, pecas, mecanicos, ordens, agendamentos, contasReceber, contasPagar, caixa, empresa] =
      await Promise.all([
        listClientes(),
        listVeiculos(),
        listPecas(),
        listMecanicos(),
        listOrdensServico(),
        listAgendamentos(),
        listContasReceber(),
        listContasPagar(),
        listCaixaMovimentacoes(),
        getEmpresaConfig(),
      ])
    payload = {
      modo: 'supabase-snapshot',
      geradoEm: new Date().toISOString(),
      clientes,
      veiculos,
      pecas,
      mecanicos,
      ordens,
      agendamentos,
      contasReceber,
      contasPagar,
      caixa,
      empresa,
    }
  } else {
    const dados: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(LS_PREFIX)) {
        try {
          dados[key] = JSON.parse(localStorage.getItem(key) || 'null')
        } catch {
          dados[key] = localStorage.getItem(key)
        }
      }
    }
    payload = { modo: 'local', geradoEm: new Date().toISOString(), dados }
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-oficina-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Restaura um backup gerado no MODO LOCAL. Backups do modo Supabase servem
// como snapshot de leitura/consulta; restaurar de volta ao banco exigiria
// reescrever cada tabela e está fora do escopo desta função por segurança
// (evita sobrescrever dados de produção sem revisão manual).
export async function importarBackupLocalJSON(arquivo: File): Promise<{ ok: boolean; mensagem: string }> {
  const texto = await arquivo.text()
  let payload: any
  try {
    payload = JSON.parse(texto)
  } catch {
    return { ok: false, mensagem: 'Arquivo inválido: não é um JSON válido.' }
  }

  if (payload.modo !== 'local' || !payload.dados) {
    return {
      ok: false,
      mensagem: 'Este arquivo não é um backup de modo local. Backups do modo Supabase não podem ser restaurados por aqui.',
    }
  }

  Object.entries(payload.dados).forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  })

  return { ok: true, mensagem: 'Backup restaurado com sucesso. A página será recarregada.' }
}
