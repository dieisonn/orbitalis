import Link from 'next/link'
import { DadosOperador } from '@/components/legal/legal-shell'
import {
  QrCode, ClipboardList, CalendarClock, Users, BarChart3, Smartphone,
  CheckCircle2, ArrowRight, Zap, Shield, Clock,
} from 'lucide-react'

// ─── Dados estáticos ───────────────────────────────────────────────
const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Ordens de Serviço',
    desc: 'Abertas, agendadas e executadas com checklist digital e assinatura do cliente. Histórico completo de cada atendimento.',
  },
  {
    icon: CalendarClock,
    title: 'Planos Preventivos PMOC',
    desc: 'Geração automática de OS preventivas com frequência configurável. Exportação do laudo PMOC em PDF.',
  },
  {
    icon: QrCode,
    title: 'Gestão de Ativos com QR Code',
    desc: 'Etiqueta QR por equipamento. Ao escanear, aparecem os dados do equipamento e dá para abrir um chamado, direto do celular.',
  },
  {
    icon: Users,
    title: 'Portal do Cliente',
    desc: 'O cliente acompanha as ordens de serviço, aprova orçamentos e consulta o histórico de manutenções, sem precisar ligar.',
  },
  {
    icon: BarChart3,
    title: 'Painel analítico',
    desc: 'MTTR, MTBF, taxa de corretivas, carga por técnico, planos vencendo. Dados que viram decisão.',
  },
  {
    icon: Smartphone,
    title: 'App Mobile (PWA)',
    desc: 'Instale no iPhone ou Android sem passar pela loja e acesse suas ordens de serviço direto do celular.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Crie a conta da sua empresa',
    desc: 'Registre sua empresa e defina seu identificador. Não pedimos cartão de crédito.',
    icon: Zap,
  },
  {
    n: '02',
    title: 'Configure sua equipe',
    desc: 'Convide técnicos e clientes com um link simples. Cada um acessa o portal certo com suas permissões.',
    icon: Users,
  },
  {
    n: '03',
    title: 'Acompanhe a operação',
    desc: 'Crie O.S., execute checklists, colete a assinatura no celular e acompanhe tudo no painel.',
    icon: Shield,
  },
]

// ─── Componente de hero "mockup" ──────────────────────────────────
function HeroMockup() {
  const cards = [
    { label: 'Abertas',      n: '12', color: 'bg-sky-400' },
    { label: 'Agendadas',    n: '8',  color: 'bg-white/40' },
    { label: 'Em andamento', n: '5',  color: 'bg-amber-400' },
    { label: 'Concluídas',   n: '43', color: 'bg-emerald-400' },
  ]
  return (
    <div aria-hidden="true" className="relative w-full max-w-lg mx-auto select-none pointer-events-none">
      {/* Janela do painel */}
      <div className="rounded-lg overflow-hidden border border-white/10 bg-white/5 ">
        {/* Barra de título */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-white/10 border-b border-white/10">
          <span className="w-3 h-3 rounded-full bg-white/30" />
          <span className="w-3 h-3 rounded-full bg-white/30" />
          <span className="w-3 h-3 rounded-full bg-white/30" />
          <span className="ml-3 text-xs text-white/70 font-mono">orbitalis.com.br/dashboard</span>
        </div>
        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-semibold text-white/75 uppercase tracking-widest">Painel</p>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2">
            {cards.map((c) => (
              <div key={c.label} className="bg-white/10 rounded-md p-3">
                <p className="text-xl font-semibold text-white tabular-nums">{c.n}</p>
                <p className="text-xs text-white/70 mt-0.5 leading-tight flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.color}`} />{c.label}</p>
              </div>
            ))}
          </div>
          {/* Fake chart bars */}
          <div className="bg-white/5 rounded-md p-4">
            <p className="text-[11px] text-white/70 mb-3">O.S. por mês</p>
            <div className="flex items-end gap-1.5 h-16">
              {[30, 55, 45, 70, 40, 65, 80, 60, 75, 50, 85, 68].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-white/20"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          {/* Fake OS list */}
          <div className="space-y-2">
            {['OS-0042 · Ar-condicionado split', 'OS-0041 · PMOC trimestral', 'OS-0040 · Chiller central'].map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-xs text-white/60 truncate">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-white/70">Ilustração com dados de exemplo</p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="bg-primary rounded-md p-1.5">
              <img src="/logo.png" alt="Orbitalis" className="h-7 w-auto object-contain" />
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">Orbitalis</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="#features"      className="hover:text-gray-900 transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Como funciona</a>
            <a href="#acesso"        className="hover:text-gray-900 transition-colors">Acesso</a>
          </nav>
          <div className="flex items-center gap-2 ml-4">
            <Link href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Entrar
            </Link>
            <Link href="/registro"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-md hover:bg-primary/90 transition-colors">
              Criar conta <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-24 md:py-32">
        <div className="relative max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Clock size={12} />
              CMMS para climatização e refrigeração
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight">
              Dados em Órbita.<br />Manutenção<br />
              <span className="text-white/70">em Dia.</span>
            </h1>
            <p className="text-white/80 mt-5 text-lg leading-relaxed max-w-md">
              Controle ativos, execute planos PMOC, gerencie sua equipe de campo e encante seus clientes — tudo em um sistema só.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/registro"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-primary font-semibold rounded-md hover:bg-white/90 transition-colors text-base">
                Criar conta <ArrowRight size={16} />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 text-white font-semibold rounded-md hover:bg-white/15 transition-colors text-base">
                Já tenho conta
              </Link>
            </div>
            <p className="text-white/75 text-xs mt-4">Sem cartão de crédito · Sem cobrança na fase inicial</p>
          </div>

          <div className="hidden md:block">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── NÚMEROS ───────────────────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { n: 'PMOC',   label: 'Laudos em PDF'              },
            { n: 'QR',     label: 'Etiqueta por equipamento'   },
            { n: 'PWA',    label: 'Instalável no celular'      },
            { n: 'Portal', label: 'Acesso para o seu cliente'  },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-semibold text-primary">{n}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">Tudo que sua operação precisa</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Do checklist no campo ao relatório no escritório. Uma plataforma integrada para toda a jornada.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group bg-white border border-gray-100 rounded-lg p-6 hover:border-primary/20 hover:border-primary/40 transition-all">
              <div className="w-11 h-11 rounded-md bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">Do cadastro ao primeiro atendimento</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Linha conectora */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            {STEPS.map(({ n, title, desc, icon: Icon }) => (
              <div key={n} className="text-center relative">
                <div className="w-24 h-24 mx-auto rounded-lg bg-white border-2 border-primary/15 flex items-center justify-center mb-5">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-primary/75">{n}</p>
                    <Icon size={28} className="text-primary mx-auto mt-0.5" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACESSO ────────────────────────────────────────────── */}
      <section id="acesso" className="py-24 max-w-3xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Acesso</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">Em fase inicial, sem cobrança</h2>
          <p className="text-gray-600 mt-3">O Orbitalis está em desenvolvimento ativo. Você pode criar a conta da sua empresa e testar com a sua operação.</p>
        </div>
        <ul className="bg-white border border-gray-200 rounded-lg p-7 space-y-3.5 max-w-xl mx-auto">
          {[
            'Não pedimos cartão de crédito.',
            'Se passarmos a cobrar, valores e condições serão informados antes de qualquer cobrança.',
            'Você pode pedir a exclusão dos seus dados a qualquer momento.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="text-sm text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
        <div className="text-center mt-8">
          <Link href="/registro" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary/90 transition-colors text-sm">
            Criar conta <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Pronto para colocar sua operação em órbita?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Crie a conta da sua empresa e teste o Orbitalis com a sua operação.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-md text-base hover:bg-white/90 transition-colors"
          >
            Criar conta <ArrowRight size={18} />
          </Link>
          <p className="text-white/75 text-sm mt-4">Sem cartão de crédito · Sem cobrança na fase inicial</p>
        </div>
      </section>

      </main>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary rounded-md p-1.5">
                <img src="/logo.png" alt="Orbitalis" className="h-7 w-auto object-contain" />
              </div>
              <span className="font-semibold text-white text-base">Orbitalis</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#features"      className="hover:text-white transition-colors">Funcionalidades</a>
              <a href="#acesso"        className="hover:text-white transition-colors">Acesso</a>
              <Link href="/login"      className="hover:text-white transition-colors">Entrar</Link>
              <Link href="/registro"   className="hover:text-white transition-colors">Criar conta</Link>
              <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/termos"      className="hover:text-white transition-colors">Termos de Uso</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-300 space-y-1.5">
            <DadosOperador />
            <p>© {new Date().getFullYear()} Orbitalis · Plataforma de Gestão de Ativos para Climatização e Refrigeração</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
