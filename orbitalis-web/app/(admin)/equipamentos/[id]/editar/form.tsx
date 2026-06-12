'use client'

import { useTransition, useState } from 'react'
import { editarEquipamento } from './actions'

const TIPOS = [
  'Split Hi-Wall',
  'Split Cassete',
  'Split Piso-Teto',
  'Split Dutado',
  'Chiller',
  'Fancoil',
  'VRF / VRV',
  'Janela',
  'Cortina de Ar',
  'Outro',
]

type Props = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  numeroSerie: string | null
  tipoEquipamento: string
  dataInstalacao: string | null
  condicao: string | null
  diagnosticoInicial: string | null
  valorAquisicao: number | null
}

export function EditarEquipamentoForm({
  id, nome, marca, modelo, numeroSerie, tipoEquipamento,
  dataInstalacao, condicao, diagnosticoInicial, valorAquisicao,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await editarEquipamento(id, {
          nome: fd.get('nome') as string,
          marca: fd.get('marca') as string,
          modelo: fd.get('modelo') as string,
          numeroSerie: fd.get('numeroSerie') as string,
          tipoEquipamento: fd.get('tipoEquipamento') as string,
          dataInstalacao: fd.get('dataInstalacao') as string,
          condicao: fd.get('condicao') as string,
          diagnosticoInicial: fd.get('diagnosticoInicial') as string,
          valorAquisicao: fd.get('valorAquisicao') as string,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        if (!msg.includes('NEXT_REDIRECT')) setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Equipamento <span className="text-destructive">*</span>
        </label>
        <input
          name="nome"
          required
          minLength={2}
          defaultValue={nome}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo <span className="text-destructive">*</span>
        </label>
        <select
          name="tipoEquipamento"
          required
          defaultValue={tipoEquipamento}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca <span className="text-destructive">*</span>
          </label>
          <input
            name="marca"
            required
            defaultValue={marca}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <input
            name="modelo"
            defaultValue={modelo ?? ''}
            placeholder="Opcional"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
        <input
          name="numeroSerie"
          defaultValue={numeroSerie ?? ''}
          placeholder="Opcional"
          className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
        />
      </div>

      {/* Separador de ciclo de vida */}
      <div className="border-t border-border pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Ciclo de Vida &amp; Histórico
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Instalação</label>
            <input
              name="dataInstalacao"
              type="date"
              defaultValue={dataInstalacao ? dataInstalacao.slice(0, 10) : ''}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condição na Chegada</label>
            <select
              name="condicao"
              defaultValue={condicao ?? ''}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            >
              <option value="">Não informado</option>
              <option value="novo">Novo</option>
              <option value="usado">Usado</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Aquisição (R$)</label>
          <input
            name="valorAquisicao"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorAquisicao ?? ''}
            placeholder="0,00"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico Inicial / Observações de Entrada</label>
          <textarea
            name="diagnosticoInicial"
            rows={3}
            defaultValue={diagnosticoInicial ?? ''}
            placeholder="Estado do equipamento ao ser recebido, problemas já existentes, observações do técnico..."
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <a
          href="/equipamentos"
          className="flex-1 py-2.5 text-center border border-border text-gray-600 font-semibold rounded-lg text-sm hover:bg-surface transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-action text-white font-semibold rounded-lg text-sm hover:bg-action/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
