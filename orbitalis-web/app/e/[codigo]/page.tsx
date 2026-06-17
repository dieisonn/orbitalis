import { api } from '@/lib/api'
import { getRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Cpu, MapPin, Building2, QrCode } from 'lucide-react'
import { AbrirChamadoForm } from './abrir-chamado-form'

type Props = { params: Promise<{ codigo: string }> }

type Equipamento = {
  id: string
  nome: string
  marca: string
  modelo: string | null
  tipoEquipamento: string
  numeroSerie: string | null
  codigoQr: string
  ambiente: {
    id: string
    nome: string
    localizacaoInterna: string
    capacidadeTermica: string
    cliente: { razaoSocial: string; nomeFantasia: string | null }
  }
}

export default async function QrLandingPage({ params }: Props) {
  const { codigo } = await params

  const role = await getRole()
  if (!role) {
    redirect('/login')
  }

  let equipamento: Equipamento | null = null
  try {
    equipamento = await api.get<Equipamento>(`/equipamentos/qr/${codigo}`)
  } catch {
    // not found or forbidden
  }

  if (!equipamento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border text-center max-w-sm w-full">
          <QrCode size={40} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-lg font-bold text-gray-800 mb-1">Equipamento não encontrado</h1>
          <p className="text-sm text-gray-400">O código QR escaneado não corresponde a nenhum equipamento ativo.</p>
          <p className="font-mono text-xs text-gray-300 mt-2">{codigo}</p>
        </div>
      </div>
    )
  }

  const cliente = equipamento.ambiente.cliente.nomeFantasia ?? equipamento.ambiente.cliente.razaoSocial

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-border max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Orbitalis</p>
          <h1 className="text-xl font-bold text-white">{equipamento.nome}</h1>
          <p className="text-sm text-white/70 mt-0.5">{equipamento.tipoEquipamento}</p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Cpu size={16} className="text-primary/50 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Equipamento</p>
              <p className="text-sm font-medium text-gray-800">
                {equipamento.marca}
                {equipamento.modelo ? ` · ${equipamento.modelo}` : ''}
              </p>
              {equipamento.numeroSerie && (
                <p className="text-xs font-mono text-gray-400 mt-0.5">S/N: {equipamento.numeroSerie}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-primary/50 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Localização</p>
              <p className="text-sm font-medium text-gray-800">{equipamento.ambiente.nome}</p>
              <p className="text-xs text-gray-400">{equipamento.ambiente.localizacaoInterna}</p>
              <p className="text-xs text-gray-400">Cap. Térmica: {equipamento.ambiente.capacidadeTermica}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 size={16} className="text-primary/50 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p>
              <p className="text-sm font-medium text-gray-800">{cliente}</p>
            </div>
          </div>

          {/* Abrir Chamado — disponível para cliente e técnico */}
          {(role === 'cliente' || role === 'tecnico' || role === 'admin') && (
            <AbrirChamadoForm
              ambienteId={equipamento.ambiente.id}
              ambienteNome={equipamento.ambiente.nome}
            />
          )}

          {/* Histórico — apenas admin */}
          {role === 'admin' && (
            <a
              href={`/equipamentos/${equipamento.id}/historico`}
              className="block w-full text-center text-sm font-semibold text-primary border border-primary/30 rounded-xl py-2.5 hover:bg-primary/5 transition-colors"
            >
              Ver histórico completo
            </a>
          )}
        </div>

        <div className="px-6 pb-6">
          <p className="text-center text-[10px] font-mono text-gray-300">{equipamento.codigoQr}</p>
        </div>
      </div>
    </div>
  )
}
