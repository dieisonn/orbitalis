'use client'

import { useEffect, useState } from 'react'
import { Bell, Download, X, Share, MoreVertical, Smartphone } from 'lucide-react'
import { AvisosPush } from '@/components/ui/avisos-push'

const CHAVE = 'orbitalis_dicas_app_oculto'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/**
 * Ao abrir o sistema, explica como instalar o app (PWA) e como ativar as notificações.
 * "Não mostrar novamente" grava a escolha neste navegador. Só mostra o que ainda falta fazer.
 */
export function DicasApp({ notificacoes = true }: { notificacoes?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [naoMostrar, setNaoMostrar] = useState(false)
  const [instalado, setInstalado] = useState(false)
  const [pushAtivo, setPushAtivo] = useState(false)
  const [plataforma, setPlataforma] = useState<'ios' | 'android' | 'desktop'>('desktop')
  const [evento, setEvento] = useState<EventoInstalar | null>(null)

  useEffect(() => {
    try { if (localStorage.getItem(CHAVE) === '1') return } catch { /* sem armazenamento: mostra */ }
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
    const ua = navigator.userAgent
    setInstalado(!!standalone)
    setPlataforma(/iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop')

    const aoPreparar = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar) }
    window.addEventListener('beforeinstallprompt', aoPreparar)
    const aoInstalar = () => setInstalado(true)
    window.addEventListener('appinstalled', aoInstalar)

    async function decidir() {
      let ativo = false
      try {
        if (notificacoes && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
          const reg = await navigator.serviceWorker.ready
          ativo = !!(await reg.pushManager.getSubscription()) && Notification.permission === 'granted'
        }
      } catch { /* trata como não ativo */ }
      setPushAtivo(ativo)
      // se já está instalado e com avisos ativos (ou sem avisos neste perfil), não há o que ensinar
      if (standalone && (ativo || !notificacoes)) return
      setAberto(true)
    }
    const t = setTimeout(decidir, 2000)
    return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', aoPreparar); window.removeEventListener('appinstalled', aoInstalar) }
  }, [notificacoes])

  function fechar() {
    if (naoMostrar) { try { localStorage.setItem(CHAVE, '1') } catch { /* ignora */ } }
    setAberto(false)
  }

  async function instalar() {
    if (!evento) return
    try { await evento.prompt(); const r = await evento.userChoice; if (r.outcome === 'accepted') setInstalado(true) } catch { /* ignora */ }
    setEvento(null)
  }

  useEffect(() => {
    if (!aberto) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, naoMostrar])

  if (!aberto) return null
  const mostrarApp = !instalado
  const mostrarAvisos = notificacoes && !pushAtivo

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4 print:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dicas-titulo" className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 id="dicas-titulo" className="text-base font-bold text-gray-900">Use o Orbitalis como aplicativo</h2>
            <p className="text-sm text-gray-700 mt-0.5">Abre mais rápido, em janela própria, e avisa você mesmo com outras telas abertas.</p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button>
        </div>

        {mostrarApp && (
          <section className="rounded-lg border border-border p-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Smartphone size={15} aria-hidden="true" /> 1. Instalar o app</h3>
            {plataforma === 'ios' ? (
              <ol className="mt-2 text-sm text-gray-700 list-decimal pl-5 space-y-1">
                <li>Abra o Orbitalis no <b>Safari</b>.</li>
                <li>Toque em <b>Compartilhar</b> <Share size={13} className="inline -mt-0.5" aria-hidden="true" />.</li>
                <li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li>
                <li>Abra pelo ícone novo na tela do iPhone (os avisos só funcionam por ele).</li>
              </ol>
            ) : plataforma === 'android' ? (
              <ol className="mt-2 text-sm text-gray-700 list-decimal pl-5 space-y-1">
                <li>No <b>Chrome</b>, toque nos três pontos <MoreVertical size={13} className="inline -mt-0.5" aria-hidden="true" />.</li>
                <li>Escolha <b>Instalar aplicativo</b> (ou Adicionar à tela inicial).</li>
                <li>Confirme e abra pelo ícone do Orbitalis.</li>
              </ol>
            ) : (
              <ol className="mt-2 text-sm text-gray-700 list-decimal pl-5 space-y-1">
                <li>No <b>Chrome</b> ou <b>Edge</b>, clique no ícone de instalar <Download size={13} className="inline -mt-0.5" aria-hidden="true" /> no fim da barra de endereço (ou menu <MoreVertical size={13} className="inline -mt-0.5" aria-hidden="true" /> → <b>Instalar Orbitalis</b>).</li>
                <li>Confirme em <b>Instalar</b>. O Orbitalis abre em janela própria e fica no menu Iniciar/área de trabalho.</li>
              </ol>
            )}
            {evento && (
              <button onClick={instalar} className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-action rounded-lg hover:bg-action/90">
                <Download size={14} aria-hidden="true" /> Instalar agora
              </button>
            )}
          </section>
        )}

        {mostrarAvisos && (
          <section className="rounded-lg border border-border p-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Bell size={15} aria-hidden="true" /> {mostrarApp ? '2. ' : ''}Ativar as notificações</h3>
            <ol className="mt-2 text-sm text-gray-700 list-decimal pl-5 space-y-1">
              <li>Clique em <b>Ativar avisos</b> abaixo.</li>
              <li>Quando o navegador perguntar, escolha <b>Permitir</b>.</li>
              <li>Pronto: O.S. novas e eventos da agenda aparecem na tela do aparelho, mesmo em outros sites ou apps.</li>
            </ol>
            <p className="text-xs text-gray-600 mt-2">Se aparecer como bloqueado: clique no cadeado ao lado do endereço → Notificações → Permitir. Não funciona em janela anônima.</p>
            <div className="mt-3"><AvisosPush /></div>
          </section>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
            <input type="checkbox" checked={naoMostrar} onChange={(e) => setNaoMostrar(e.target.checked)} className="h-4 w-4 accent-[var(--color-action)]" />
            Não mostrar novamente
          </label>
          <button onClick={fechar} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-border rounded-lg hover:bg-surface">Fechar</button>
        </div>
      </div>
    </div>
  )
}
