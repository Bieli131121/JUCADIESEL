import { useEffect, useRef, useState } from 'react'
import { Plus, KeyRound, Ban, CheckCircle2, Pencil, Download, Upload, Sun, Moon, Trash2 } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { salvarEmpresaConfig } from '@/lib/db'
import { listUsuarios, criarUsuario, redefinirPin, alterarStatusUsuario, deleteUsuario, atualizarUsuario } from '@/lib/auth'
import { exportarBackupJSON, importarBackupLocalJSON } from '@/lib/backup'
import {
  listTemplatesWhatsapp,
  atualizarTemplateWhatsapp,
  garantirTemplatesPadrao,
  getWhatsappConfig,
  salvarWhatsappConfig,
  getNotaFiscalConfig,
  salvarNotaFiscalConfig,
} from '@/lib/whatsappNfe'
import { supabaseConfigured } from '@/lib/supabase'
import { listLogsSistema } from '@/lib/logs'
import { useTheme } from '@/contexts/ThemeContext'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useToast } from '@/contexts/ToastContext'
import type { Usuario, Role, WhatsappTemplate, NotaFiscalConfig } from '@/types/database'
import { ROLE_LABELS, TIPO_TEMPLATE_LABELS } from '@/types/database'
import type { TipoTemplateWhatsapp } from '@/types/database'

export default function Configuracoes() {
  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Configurações</h1>
        <p className="text-ink-soft text-sm mt-1">Marca, dados fiscais, tema, backup e usuários</p>
      </div>
      <EmpresaSection />
      <TemaSection />
      <WhatsappSection />
      <NotaFiscalSection />
      <BackupSection />
      <AuditoriaSection />
      <UsuariosSection />
    </div>
  )
}

function EmpresaSection() {
  const { showToast } = useToast()
  const { config, loading, reload } = useEmpresaConfig()
  const [form, setForm] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    certificado_digital_status: 'nao_configurado' as 'nao_configurado' | 'configurado' | 'expirado',
    telefone: '',
    endereco: '',
    logo_url: '',
    cor_primaria: '#F2600C',
  })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (config) {
      setForm({
        nome_fantasia: config.nome_fantasia || '',
        razao_social: config.razao_social || '',
        cnpj: config.cnpj || '',
        inscricao_estadual: config.inscricao_estadual || '',
        inscricao_municipal: config.inscricao_municipal || '',
        certificado_digital_status: config.certificado_digital_status || 'nao_configurado',
        telefone: config.telefone || '',
        endereco: config.endereco || '',
        logo_url: config.logo_url || '',
        cor_primaria: config.cor_primaria || '#F2600C',
      })
    }
  }, [config])

  async function salvar() {
    setSalvando(true)
    setSalvo(false)
    try {
      await salvarEmpresaConfig(form)
      await reload()
      setSalvo(true)
      showToast('Configurações salvas.', 'success')
      setTimeout(() => setSalvo(false), 2500)
    } catch {
      showToast('Não foi possível salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <SkeletonList rows={3} />

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-display font-semibold text-ink">Marca do sistema</h2>
      <div className="flex items-center gap-4">
        <img
          src={form.logo_url || '/branding/logo-jucax.png'}
          className="w-20 object-contain border border-border rounded-lg p-1 bg-white"
        />
        <div className="flex-1 space-y-1.5">
          <label className="label-field">URL da logo</label>
          <div className="flex gap-2">
            <input
              className="input-field"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="Deixe vazio para usar a logo padrão da JUCAX"
            />
            <ImageUpload pasta="empresa" compacto label="Enviar" onUploaded={(url) => setForm({ ...form, logo_url: url })} />
          </div>
        </div>
      </div>

      <div>
        <label className="label-field">Nome da oficina (aparece no menu) *</label>
        <input className="input-field" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
      </div>

      <div>
        <label className="label-field">Razão social</label>
        <input className="input-field" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Telefone</label>
          <input className="input-field" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Cor de destaque do menu</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.cor_primaria}
              onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <span className="font-mono text-xs text-ink-soft">{form.cor_primaria}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="label-field">Endereço</label>
        <input className="input-field" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-xs font-semibold text-ink-soft uppercase">Dados fiscais</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">CNPJ</label>
            <input className="input-field" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Inscrição Estadual</label>
            <input className="input-field" value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Inscrição Municipal</label>
            <input className="input-field" value={form.inscricao_municipal} onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Certificado Digital</label>
            <select
              className="input-field"
              value={form.certificado_digital_status}
              onChange={(e) => setForm({ ...form, certificado_digital_status: e.target.value as any })}
            >
              <option value="nao_configurado">Não configurado</option>
              <option value="configurado">Configurado</option>
              <option value="expirado">Expirado</option>
            </select>
          </div>
        </div>
        <p className="text-[11px] text-ink-soft">
          Estrutura preparada para emissão futura de NF-e/NFS-e/NFC-e. A integração com o certificado digital ainda
          não está ativa nesta versão.
        </p>
      </div>

      <Button fullWidth onClick={salvar} loading={salvando}>
        {salvo ? 'Salvo ✓' : 'Salvar configurações'}
      </Button>
    </section>
  )
}

function TemaSection() {
  const { tema, definirTema } = useTheme()
  return (
    <section className="card p-5 space-y-3">
      <h2 className="font-display font-semibold text-ink">Tema</h2>
      <p className="text-xs text-ink-soft">Escolha a aparência do sistema neste dispositivo.</p>
      <div className="flex gap-2">
        <button
          onClick={() => definirTema('claro')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            tema === 'claro' ? 'bg-graphite text-white border-graphite' : 'border-border text-ink-soft hover:bg-canvas'
          }`}
        >
          <Sun size={16} /> Claro
        </button>
        <button
          onClick={() => definirTema('escuro')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            tema === 'escuro' ? 'bg-graphite text-white border-graphite' : 'border-border text-ink-soft hover:bg-canvas'
          }`}
        >
          <Moon size={16} /> Escuro
        </button>
      </div>
    </section>
  )
}

function BackupSection() {
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)

  async function exportar() {
    setExportando(true)
    try {
      await exportarBackupJSON()
      showToast('Backup baixado com sucesso.', 'success')
    } catch {
      showToast('Não foi possível gerar o backup.', 'error')
    } finally {
      setExportando(false)
    }
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setImportando(true)
    try {
      const resultado = await importarBackupLocalJSON(arquivo)
      if (resultado.ok) {
        showToast(resultado.mensagem, 'success')
        setTimeout(() => window.location.reload(), 1200)
      } else {
        showToast(resultado.mensagem, 'error')
      }
    } catch {
      showToast('Não foi possível ler o arquivo de backup.', 'error')
    } finally {
      setImportando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="card p-5 space-y-3">
      <h2 className="font-display font-semibold text-ink">Backup</h2>
      <p className="text-xs text-ink-soft">
        {supabaseConfigured
          ? 'Gera um snapshot em JSON dos dados atuais para consulta ou conferência. A restauração de backups do Supabase deve ser feita pelo painel do Supabase.'
          : 'Seus dados estão salvos neste dispositivo. Baixe um backup periodicamente para não perder informações.'}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportar} loading={exportando}>
          Baixar backup
        </Button>
        {!supabaseConfigured && (
          <>
            <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => inputRef.current?.click()} loading={importando}>
              Restaurar backup
            </Button>
            <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={importar} />
          </>
        )}
      </div>
    </section>
  )
}

function WhatsappSection() {
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([])
  const [numeroRemetente, setNumeroRemetente] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<WhatsappTemplate | null>(null)
  const [salvandoNumero, setSalvandoNumero] = useState(false)

  async function carregar() {
    setLoading(true)
    await garantirTemplatesPadrao()
    const [t, config] = await Promise.all([listTemplatesWhatsapp(), getWhatsappConfig()])
    setTemplates(t)
    setNumeroRemetente(config?.numero_remetente || '')
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function salvarNumero() {
    setSalvandoNumero(true)
    try {
      await salvarWhatsappConfig({ numero_remetente: numeroRemetente, modo_envio: 'link_direto' })
      showToast('Número salvo.', 'success')
    } catch {
      showToast('Não foi possível salvar.', 'error')
    } finally {
      setSalvandoNumero(false)
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-display font-semibold text-ink">WhatsApp</h2>
      <p className="text-xs text-ink-soft">
        Modo atual: <strong>link direto (wa.me)</strong> — abre o WhatsApp com a mensagem pronta pra você conferir e
        enviar, sem custo e sem precisar de aprovação de API. Quando quiser evoluir para envio automático via API
        oficial (360dialog, Zapi), a estrutura de templates abaixo já está pronta para isso.
      </p>

      <div>
        <label className="label-field">Número de WhatsApp da oficina (opcional, para referência)</label>
        <div className="flex gap-2">
          <input className="input-field" value={numeroRemetente} onChange={(e) => setNumeroRemetente(e.target.value)} placeholder="(48) 99999-9999" />
          <Button size="sm" onClick={salvarNumero} loading={salvandoNumero}>
            Salvar
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-semibold text-ink-soft uppercase">Mensagens automáticas</p>
        {loading ? (
          <SkeletonList rows={3} />
        ) : (
          templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 text-sm py-1.5">
              <span className="text-ink">{TIPO_TEMPLATE_LABELS[t.tipo]}</span>
              <button className="text-xs text-torque font-medium hover:underline" onClick={() => setEditando(t)}>
                Editar mensagem
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-ink-soft uppercase mb-2">API oficial (em breve)</p>
        <div className="grid grid-cols-2 gap-3 opacity-50 pointer-events-none">
          <div>
            <label className="label-field">Provedor</label>
            <select className="input-field" disabled>
              <option>360dialog</option>
            </select>
          </div>
          <div>
            <label className="label-field">Token de API</label>
            <input className="input-field" disabled placeholder="Disponível em versão futura" />
          </div>
        </div>
      </div>

      {editando && (
        <ModalEditarTemplate
          template={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            carregar()
          }}
        />
      )}
    </section>
  )
}

function ModalEditarTemplate({
  template,
  onClose,
  onSaved,
}: {
  template: WhatsappTemplate
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [mensagem, setMensagem] = useState(template.mensagem)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await atualizarTemplateWhatsapp(template.id, mensagem)
      showToast('Template atualizado.', 'success')
      onSaved()
    } catch {
      showToast('Não foi possível salvar o template.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={TIPO_TEMPLATE_LABELS[template.tipo as TipoTemplateWhatsapp]} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Mensagem</label>
          <textarea className="input-field" rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </div>
        <p className="text-[11px] text-ink-soft">
          Variáveis disponíveis: <code className="font-mono">{'{{cliente}}'}</code> <code className="font-mono">{'{{numero_os}}'}</code>{' '}
          <code className="font-mono">{'{{veiculo}}'}</code> <code className="font-mono">{'{{valor}}'}</code>{' '}
          <code className="font-mono">{'{{vencimento}}'}</code> <code className="font-mono">{'{{data}}'}</code>{' '}
          <code className="font-mono">{'{{hora}}'}</code>
        </p>
        <Button fullWidth onClick={salvar} loading={salvando}>
          Salvar template
        </Button>
      </div>
    </Modal>
  )
}

function NotaFiscalSection() {
  const { showToast } = useToast()
  const [, setConfig] = useState<NotaFiscalConfig | null>(null)
  const [form, setForm] = useState({
    ambiente: 'homologacao' as 'homologacao' | 'producao',
    tipo_padrao: 'nfse' as 'nfe' | 'nfse' | 'nfce',
    cnae: '',
    codigo_servico_municipal: '',
    aliquota_iss: '',
    regime_tributario: 'simples_nacional' as 'simples_nacional' | 'lucro_presumido' | 'lucro_real',
    ativo: false,
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    getNotaFiscalConfig().then((c) => {
      setConfig(c)
      if (c) {
        setForm({
          ambiente: c.ambiente,
          tipo_padrao: c.tipo_padrao,
          cnae: c.cnae || '',
          codigo_servico_municipal: c.codigo_servico_municipal || '',
          aliquota_iss: c.aliquota_iss ? String(c.aliquota_iss) : '',
          regime_tributario: c.regime_tributario || 'simples_nacional',
          ativo: c.ativo,
        })
      }
      setLoading(false)
    })
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      await salvarNotaFiscalConfig({
        ambiente: form.ambiente,
        tipo_padrao: form.tipo_padrao,
        cnae: form.cnae || null,
        codigo_servico_municipal: form.codigo_servico_municipal || null,
        aliquota_iss: form.aliquota_iss ? Number(form.aliquota_iss) : null,
        regime_tributario: form.regime_tributario,
        ativo: form.ativo,
      })
      showToast('Preferências fiscais salvas.', 'success')
    } catch {
      showToast('Não foi possível salvar.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <SkeletonList rows={2} />

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-display font-semibold text-ink">Nota Fiscal (Focus NFe)</h2>
      <p className="text-xs text-ink-soft">
        Emissão real via Focus NFe. Requer uma conta ativa lá (com certificado digital cadastrado no painel deles) e
        o token configurado como variável de ambiente no servidor (<code className="font-mono">FOCUS_NFE_TOKEN_HOMOLOGACAO</code>{' '}
        / <code className="font-mono">FOCUS_NFE_TOKEN_PRODUCAO</code>) — nunca fica salvo aqui no app, por segurança.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Ambiente</label>
          <select className="input-field" value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value as any })}>
            <option value="homologacao">Homologação (testes)</option>
            <option value="producao">Produção</option>
          </select>
        </div>
        <div>
          <label className="label-field">Tipo padrão</label>
          <select className="input-field" value={form.tipo_padrao} onChange={(e) => setForm({ ...form, tipo_padrao: e.target.value as any })}>
            <option value="nfse">NFS-e (serviço)</option>
            <option value="nfe">NF-e (produto)</option>
            <option value="nfce">NFC-e (consumidor)</option>
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-3">
        <p className="text-xs font-semibold text-ink-soft uppercase">Dados do prestador (para NFS-e)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">CNAE</label>
            <input className="input-field" value={form.cnae} onChange={(e) => setForm({ ...form, cnae: e.target.value })} placeholder="ex: 4520-0/01" />
          </div>
          <div>
            <label className="label-field">Código de serviço municipal</label>
            <input
              className="input-field"
              value={form.codigo_servico_municipal}
              onChange={(e) => setForm({ ...form, codigo_servico_municipal: e.target.value })}
              placeholder="confirme na prefeitura de Garopaba"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Alíquota ISS (%)</label>
            <input className="input-field" value={form.aliquota_iss} onChange={(e) => setForm({ ...form, aliquota_iss: e.target.value })} placeholder="ex: 5" />
          </div>
          <div>
            <label className="label-field">Regime tributário</label>
            <select
              className="input-field"
              value={form.regime_tributario}
              onChange={(e) => setForm({ ...form, regime_tributario: e.target.value as any })}
            >
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-ink font-medium">Ativar emissão real</p>
          <p className="text-[11px] text-ink-soft">Só ative depois de confirmar que o token está configurado no servidor.</p>
        </div>
        <button
          onClick={() => setForm({ ...form, ativo: !form.ativo })}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${form.ativo ? 'bg-torque' : 'bg-border'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <Button size="sm" onClick={salvar} loading={salvando}>
        Salvar preferências
      </Button>
    </section>
  )
}

function AuditoriaSection() {
  const [logs, setLogs] = useState<import('@/types/database').LogSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (aberto) {
      listLogsSistema(80).then((l) => {
        setLogs(l)
        setLoading(false)
      })
    }
  }, [aberto])

  const CATEGORIA_LABEL: Record<string, string> = {
    login: 'Login',
    usuario: 'Usuário',
    configuracao: 'Configuração',
    os: 'Ordem de Serviço',
    financeiro: 'Financeiro',
    backup: 'Backup',
  }

  return (
    <section className="card p-5">
      <button className="flex items-center justify-between w-full" onClick={() => setAberto(!aberto)}>
        <h2 className="font-display font-semibold text-ink">Auditoria (logs do sistema)</h2>
        <span className="text-xs text-torque font-medium">{aberto ? 'Ocultar' : 'Ver logs'}</span>
      </button>
      {aberto && (
        <div className="mt-4 divide-y divide-border max-h-80 overflow-y-auto">
          {loading ? (
            <SkeletonList rows={4} />
          ) : logs.length === 0 ? (
            <p className="text-ink-soft text-sm py-4 text-center">Nenhum registro ainda.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-canvas text-ink-soft">
                    {CATEGORIA_LABEL[l.categoria] || l.categoria}
                  </span>
                  <span className="text-ink">{l.acao}</span>
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  {l.usuario_nome || 'Sistema'} · {new Date(l.created_at).toLocaleString('pt-BR')}
                  {l.detalhe && ` · ${l.detalhe}`}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}

function UsuariosSection() {
  const { showToast } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalPin, setModalPin] = useState<Usuario | null>(null)
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState<Usuario | null>(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState<Usuario | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setLoading(true)
    setUsuarios(await listUsuarios())
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarStatus(u: Usuario) {
    if (u.ativo) {
      setConfirmarDesativar(u)
      return
    }
    await alterarStatusUsuario(u.id, true)
    showToast('Usuário reativado.', 'info')
    carregar()
  }

  async function confirmarDesativacao() {
    if (!confirmarDesativar) return
    await alterarStatusUsuario(confirmarDesativar.id, false)
    showToast('Usuário desativado.', 'info')
    setConfirmarDesativar(null)
    carregar()
  }

  async function excluirUsuario() {
    if (!confirmarExcluir) return
    setExcluindo(true)
    try {
      await deleteUsuario(confirmarExcluir.id)
      showToast('Usuário excluído.', 'success')
      setConfirmarExcluir(null)
      carregar()
    } catch (erro: any) {
      showToast(erro.message || 'Não foi possível excluir o usuário.', 'error')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink">Usuários do sistema</h2>
        <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setModalNovo(true)}>
          Novo usuário
        </Button>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="divide-y divide-border">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium">{u.nome}</p>
                <p className="text-xs text-ink-soft font-mono">
                  @{u.usuario} · {ROLE_LABELS[u.role]}
                </p>
              </div>
              {!u.ativo && <span className="text-[10px] font-semibold uppercase text-status-cancelado">Inativo</span>}
              <button className="text-ink-soft hover:text-torque p-1.5 rounded-lg hover:bg-canvas" title="Editar" onClick={() => setModalEditar(u)}>
                <Pencil size={15} />
              </button>
              <button className="text-ink-soft hover:text-torque p-1.5 rounded-lg hover:bg-canvas" title="Redefinir PIN" onClick={() => setModalPin(u)}>
                <KeyRound size={15} />
              </button>
              <button
                className={`p-1.5 rounded-lg hover:bg-canvas ${u.ativo ? 'text-ink-soft hover:text-status-cancelado' : 'text-status-entregue'}`}
                title={u.ativo ? 'Desativar' : 'Reativar'}
                onClick={() => alternarStatus(u)}
              >
                {u.ativo ? <Ban size={15} /> : <CheckCircle2 size={15} />}
              </button>
              <button
                className="text-ink-soft hover:text-status-cancelado p-1.5 rounded-lg hover:bg-canvas"
                title="Excluir"
                onClick={() => setConfirmarExcluir(u)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {usuarios.length === 0 && <p className="text-ink-soft text-sm text-center py-4">Nenhum usuário cadastrado.</p>}
        </div>
      )}

      <ModalNovoUsuario open={modalNovo} onClose={() => setModalNovo(false)} onSaved={carregar} />
      {modalPin && <ModalRedefinirPin usuario={modalPin} onClose={() => setModalPin(null)} onSaved={carregar} />}
      {modalEditar && <ModalEditarUsuario usuario={modalEditar} onClose={() => setModalEditar(null)} onSaved={carregar} />}

      <ConfirmDialog
        open={!!confirmarDesativar}
        title="Desativar usuário"
        message={`Tem certeza que deseja desativar ${confirmarDesativar?.nome}? Ele não conseguirá mais entrar no sistema até ser reativado.`}
        confirmLabel="Desativar"
        variant="danger"
        onConfirm={confirmarDesativacao}
        onCancel={() => setConfirmarDesativar(null)}
      />
      <ConfirmDialog
        open={!!confirmarExcluir}
        title="Excluir usuário"
        message={`Tem certeza que deseja excluir ${confirmarExcluir?.nome}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={excluirUsuario}
        onCancel={() => setConfirmarExcluir(null)}
        loading={excluindo}
      />
    </section>
  )
}

function ModalNovoUsuario({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ nome: '', usuario: '', pin: '', role: 'recepcao' as Role })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setErro('')
    if (!form.nome || !form.usuario || form.pin.length < 4) {
      setErro('Preencha nome, usuário e um PIN de pelo menos 4 dígitos.')
      return
    }
    setSalvando(true)
    try {
      await criarUsuario(form)
      showToast('Usuário criado com sucesso.', 'success')
      setForm({ nome: '', usuario: '', pin: '', role: 'recepcao' })
      onClose()
      onSaved()
    } catch {
      setErro('Não foi possível criar. O nome de usuário já pode estar em uso.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} title="Novo usuário" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome completo *</label>
          <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Usuário (login) *</label>
          <input
            className="input-field"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })}
            placeholder="ex: joao"
          />
        </div>
        <div>
          <label className="label-field">PIN (4 a 6 dígitos) *</label>
          <input className="input-field font-mono" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
        </div>
        <div>
          <label className="label-field">Nível de acesso *</label>
          <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="recepcao">Recepção</option>
            <option value="mecanico">Mecânico</option>
            <option value="financeiro">Financeiro</option>
            <option value="gerente">Gerente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {erro && <p className="text-status-cancelado text-xs font-medium">{erro}</p>}
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Criar usuário
        </Button>
      </div>
    </Modal>
  )
}

function ModalEditarUsuario({ usuario, onClose, onSaved }: { usuario: Usuario; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [nome, setNome] = useState(usuario.nome)
  const [role, setRole] = useState<Role>(usuario.role)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!nome) return
    setSalvando(true)
    try {
      await atualizarUsuario(usuario.id, { nome, role })
      showToast('Usuário atualizado.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível atualizar o usuário.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={`Editar · ${usuario.nome}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Nome completo</label>
          <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="label-field">Nível de acesso</label>
          <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="recepcao">Recepção</option>
            <option value="mecanico">Mecânico</option>
            <option value="financeiro">Financeiro</option>
            <option value="gerente">Gerente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Salvar alterações
        </Button>
      </div>
    </Modal>
  )
}

function ModalRedefinirPin({ usuario, onClose, onSaved }: { usuario: Usuario; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [pin, setPin] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (pin.length < 4) return
    setSalvando(true)
    try {
      await redefinirPin(usuario.id, pin)
      showToast('PIN redefinido com sucesso.', 'success')
      onClose()
      onSaved()
    } catch {
      showToast('Não foi possível redefinir o PIN.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open title={`Redefinir PIN · ${usuario.nome}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label-field">Novo PIN (4 a 6 dígitos)</label>
          <input className="input-field font-mono" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
        <Button fullWidth className="mt-2" onClick={salvar} loading={salvando}>
          Confirmar novo PIN
        </Button>
      </div>
    </Modal>
  )
}
