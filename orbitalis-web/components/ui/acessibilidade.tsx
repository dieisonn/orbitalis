'use client'

import { useEffect } from 'react'

let contador = 0

// Liga cada <label> sem "for" ao primeiro campo que vem depois dele no mesmo bloco, para que
// leitores de tela anunciem o nome do campo e o clique no rótulo foque o campo.
function associar(raiz: ParentNode) {
  raiz.querySelectorAll('label:not([for])').forEach((rotulo) => {
    if (rotulo.querySelector('input,select,textarea')) return // campo dentro do rótulo: já associado
    const bloco = rotulo.parentElement
    if (!bloco) return
    for (const campo of bloco.querySelectorAll<HTMLElement>('input:not([type=hidden]),select,textarea')) {
      if (!(rotulo.compareDocumentPosition(campo) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
      if ((campo as HTMLInputElement).labels?.length) return // já tem rótulo
      if (!campo.id) campo.id = `campo-${++contador}`
      rotulo.setAttribute('for', campo.id)
      return
    }
  })
}

export function Acessibilidade() {
  useEffect(() => {
    associar(document)
    let quadro = 0
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => associar(document))
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => { obs.disconnect(); cancelAnimationFrame(quadro) }
  }, [])
  return null
}
