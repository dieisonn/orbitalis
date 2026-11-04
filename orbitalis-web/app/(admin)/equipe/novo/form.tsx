'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, KeyRound, Link2, CheckCircle } from 'lucide-react'
import { AcessoFields } from '../acesso-fields'
import { criarUsuarioEscritorio, convidarUsuarioEscritorio } from '../actions'

const campo = 'w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

type Modo = 'senha' | 'convite'
type Resultado =
  | { tipo: 'senha'; nome: string; email: string; senha: string }
  | { tipo: 'convite'; link: string; email: string }

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" onClick={async () => { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2500) }}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-primary text-primary rounded-lg hover:bg-primary/5">
      {ok ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {ok ? 'Copiado!' : rotulo}
    </button>
  )
}

export function NovoUsuarioForm() {
  const [modo, setModo] = useState<Modo>('senha')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const t = (k: string) => ((fd.get(k) as string) ?? '').trim()
    const acesso = { perfilAcesso: t('perfilAcesso'), permissoes: fd.getAll('modulo') as string[] }
    setErro(null)
    setOcupado(true)
    try {
      if (modo === 'senha') {
        const d = { nome: t('nome'), email: t('email'), senha: t('senha'), telefone: t('telefone'), ...acesso }
        const r = await criarUsuarioEscritorio(d)
        if (!r.ok) { setErro(r.error); return }
        setResultado({ tipo: 'senha', nome: d.nome, email: d.email, senha: d.senha })
      } else {
        const r = await convidarUsuarioEscritorio({ email: t('emailConvite'), ...acesso })
        if (!r.ok) { setErro(r.error); return }
        setResultado({ tipo: 'convite', link: `${window.location.origin}/convite/${r.token}`, email: t('emailConvite') })
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir. Tente novamente.')
    } finally {
      setOcupado(false)
    }
  }

  if (resultado) {
    const login = `${typeof window !== 'undefined' ? window.location.origin : ''}/login`
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle size={28} className="text-action shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {resultado.tipo === 'senha' ? 'Usuário criado!' : 'Convite gerado!'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {resultado.tipo === 'senha'
                ? 'O acesso já está ativo. Envie os dados abaixo à pessoa e peça para trocar a senha no primeiro acesso.'
                : 'Envie este link à pessoa. Ela mesma escolhe nome, e-mail e senha. O link vale 7 dias e só pode ser usado uma vez.'}
            </p>
          </div>
        </div>

        {resultado.tipo === 'senha' ? (
          <div className="rounded-xl bg-surface p-4 text-sm space-y-1">
            <p><span className="text-gray-500">Usuário:</span> <strong>{resultado.nome}</strong></p>
            <p><span className="text-gray-500">E-mail (login):</span> <strong>{resultado.email}</strong></p>
            <p><span className="text-gray-500">Senha provisória:</span> <strong className="font-mono">{resultado.senha}</strong></p>
            <div className="pt-3">
              <Copiar rotulo="Copiar dados de acesso"
                texto={`Acesso ao Orbitalis\nEndereço: ${login}\nE-mail: ${resultado.email}\nSenha provisória: ${resultado.senha}\n(troque a senha no primeiro acesso)`} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-surface p-4 space-y-3">
            <p className="font-mono text-xs break-all bg-white border border-border rounded-lg px-3 py-2">{resultado.link}</p>
            <Copiar rotulo="Copiar link do convite" texto={resultado.link} />
            <p className="text-xs text-gray-500">Se precisar do link de novo, ele fica em “Convites pendentes”, na página Equipe.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => { setResultado(null); setErro(null) }}
            className="px-5 py-2.5 text-sm font-semibold border border-border text-gray-700 rounded-lg hover:bg-surface">Adicionar outro</button>
          <a href="/equipe" className="px-5 py-2.5 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90">Voltar para Equipe</a>
        </div>
      </div>
    )
  }

  const cartao = (m: Modo, titulo: string, desc: string, Icone: typeof KeyRound) => (
    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${modo === m ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface'}`}>
      <input type="radio" name="modo" checked={modo === m} onChange={() => { setModo(m); setErro(null) }} className="mt-1" />
      <span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Icone size={14} aria-hidden="true" /> {titulo}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
      </span>
    </label>
  )

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Como você quer adicionar?</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {cartao('senha', 'Criar o acesso agora', 'Você informa nome, e-mail e uma senha provisória. O usuário é criado na hora.', KeyRound)}
          {cartao('convite', 'Enviar convite por link', 'Nada é criado agora: você gera um link e a própria pessoa cadastra nome, e-mail e senha.', Link2)}
        </div>
      </fieldset>

      {modo === 'senha' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="nu-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-destructive">*</span></label>
            <input id="nu-nome" name="nome" required className={campo} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nu-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail (será o login) <span className="text-destructive">*</span></label>
              <input id="nu-email" name="email" type="email" required className={campo} />
            </div>
            <div>
              <label htmlFor="nu-tel" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input id="nu-tel" name="telefone" maxLength={20} className={campo} />
            </div>
          </div>
          <div>
            <label htmlFor="nu-senha" className="block text-sm font-medium text-gray-700 mb-1">Senha provisória <span className="text-destructive">*</span></label>
            <input id="nu-senha" name="senha" type="text" required minLength={6} autoComplete="off" placeholder="Mínimo de 6 caracteres" className={campo} />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="nu-emailc" className="block text-sm font-medium text-gray-700 mb-1">E-mail da pessoa <span className="text-gray-500 font-normal">(opcional)</span></label>
          <input id="nu-emailc" name="emailConvite" type="email" className={campo} placeholder="Se informar, já vem preenchido no convite" />
        </div>
      )}

      <AcessoFields />

      {erro && <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

      <div className="flex gap-3">
        <a href="/equipe" className="px-5 py-2.5 text-sm text-center border border-border text-gray-600 font-semibold rounded-lg hover:bg-surface transition-colors">Cancelar</a>
        <button type="submit" disabled={ocupado}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-action text-white rounded-lg hover:bg-action/90 disabled:opacity-60">
          {ocupado && <Loader2 size={14} className="animate-spin" />}
          {modo === 'senha' ? 'Criar usuário' : 'Gerar link de convite'}
        </button>
      </div>
    </form>
  )
}
