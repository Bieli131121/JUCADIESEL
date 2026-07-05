import { useEffect, useState } from 'react'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { salvarEmpresaConfig } from '@/lib/db'

export default function Configuracoes() {
  const { config, loading, reload } = useEmpresaConfig()
  const [form, setForm] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
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
      setTimeout(() => setSalvo(false), 2500)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <p className="text-ink-soft text-sm">Carregando...</p>

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Configurações</h1>
        <p className="text-ink-soft text-sm mt-1">Personalize o nome, logo e cor do menu</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} className="w-14 h-14 rounded-lg object-cover border border-border" />
          ) : (
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-display font-bold text-xl"
              style={{ backgroundColor: form.cor_primaria }}
            >
              {(form.nome_fantasia || 'O').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <label className="label-field">URL da logo</label>
            <input
              className="input-field"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="label-field">Nome da oficina (aparece no menu) *</label>
          <input
            className="input-field"
            value={form.nome_fantasia}
            onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
          />
        </div>

        <div>
          <label className="label-field">Razão social</label>
          <input
            className="input-field"
            value={form.razao_social}
            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">CNPJ</label>
            <input className="input-field" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Telefone</label>
            <input
              className="input-field"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label-field">Endereço</label>
          <input
            className="input-field"
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
          />
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

        <button className="btn-primary w-full mt-2" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : salvo ? 'Salvo ✓' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
