'use client'

import { useState } from 'react'
import { MODULOS, PERFIS } from '@/lib/modulos'

// Escolha do perfil de acesso + módulos (nome="perfilAcesso" e nome="modulo" no form)
export function AcessoFields({ perfilInicial = 'gestor', modulosIniciais = [] }: { perfilInicial?: string; modulosIniciais?: string[] }) {
  const [perfil, setPerfil] = useState(perfilInicial)
  const [custom, setCustom] = useState<string[]>(modulosIniciais)

  const def = PERFIS[perfil]
  const marcados = perfil === 'personalizado' ? custom : (def?.modulos ?? MODULOS.map((m) => m.key))

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-gray-700 mb-1">Perfil de acesso</legend>
      <div className="grid gap-2">
        {Object.entries(PERFIS).map(([key, p]) => (
          <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${perfil === key ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface'}`}>
            <input type="radio" name="perfilAcesso" value={key} checked={perfil === key} onChange={() => setPerfil(key)} className="mt-1" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">{p.label}</span>
              <span className="block text-xs text-gray-500">{p.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="pt-1">
        <p className="text-xs font-semibold text-gray-500 mb-2">Módulos liberados</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {MODULOS.map((m) => {
            const on = marcados.includes(m.key)
            const editavel = perfil === 'personalizado'
            return (
              <label key={m.key} className={`flex items-start gap-2 text-sm ${editavel ? 'cursor-pointer' : 'opacity-70'}`}>
                <input
                  type="checkbox"
                  name="modulo"
                  value={m.key}
                  checked={on}
                  disabled={!editavel}
                  onChange={(e) => setCustom((c) => (e.target.checked ? [...c, m.key] : c.filter((x) => x !== m.key)))}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-gray-800">{m.label}</span>
                  <span className="block text-xs text-gray-500">{m.desc}</span>
                </span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">Painel, alertas e o próprio perfil ficam sempre disponíveis.</p>
      </div>
    </fieldset>
  )
}
