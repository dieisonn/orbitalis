import Link from 'next/link'
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
    desc: 'Etiqueta QR por equipamento. Técnico escaneia, vê o histórico e abre OS em segundos, direto do celular.',
  },
  {
    icon: Users,
    title: 'Portal do Cliente',
    desc: 'O cliente acompanha OS em tempo real, aprova orçamentos e consulta o histórico de manutenções — sem ligar para você.',
  },
  {
    icon: BarChart3,
    title: 'Cockpit Analítico',
    desc: 'MTTR, MTBF, taxa de corretivas, carga por técnico, planos vencendo. Dados que viram decisão.',
  },
  {
    icon: Smartphone,
    title: 'App Mobile (PWA)',
    desc: 'Instale no iPhone ou Android sem passar pela loja. Trabalhe offline em campo e sincronize ao retornar.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Crie sua conta em 30 segundos',
    desc: 'Registre sua empresa, defina seu identificador e pronto. Sem cartão de crédito, sem burocracia.',
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
    title: 'Opere com total controle',
    desc: 'Crie OS, execute checklists, assine no celular e acompanhe tudo no cockpit em tempo real.',
    icon: Shield,
  },
]

const PLANOS = [
  {
    nome: 'Básico',
    preco: 'Grátis',
    periodo: 'para sempre',
    desc: 'Ideal para começar e testar a plataforma.',
    destaque: false,
    cta: 'Criar conta grátis',
    itens: [
      'Até 2 técnicos',
      'Até 10 clientes',
      '50 O.S. por mês',
      'App mobile (PWA)',
      'Portal do cliente',
      'Suporte por e-mail',
    ],
  },
  {
    nome: 'Pro',
    preco: 'R$ 149',
    periodo: 'por mês',
    desc: 'Para empresas em crescimento que precisam de mais.',
    destaque: true,
    cta: 'Começar período grátis',
    itens: [
      'Até 10 técnicos',
      'Clientes ilimitados',
      'O.S. ilimitadas',
      'Relatórios PDF / PMOC',
      'Agenda própria integrada às O.S.',
      'Dashboards avançados',
      'Suporte prioritário',
    ],
  },
  {
    nome: 'Enterprise',
    preco: 'R$ 399',
    periodo: 'por mês',
    desc: 'Para grandes operações com múltiplas equipes.',
    destaque: false,
    cta: 'Falar com vendas',
    itens: [
      'Técnicos ilimitados',
      'Multi-filial',
      'API & Webhooks',
      'SLA garantido 99,9%',
      'Onboarding dedicado',
      'Suporte 24/7',
    ],
  },
]

// ─── Componente de hero "mockup" ──────────────────────────────────
function HeroMockup() {
  const cards = [
    { label: 'Abertas',      n: '12', color: 'bg-blue-500' },
    { label: 'Agendadas',    n: '8',  color: 'bg-orange-400' },
    { label: 'Em andamento', n: '5',  color: 'bg-amber-400' },
    { label: 'Concluídas',   n: '43', color: 'bg-emerald-500' },
  ]
  return (
    <div className="relative w-full max-w-lg mx-auto select-none pointer-events-none">
      {/* Janela do painel */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
        {/* Barra de título */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-white/10 border-b border-white/10">
          <span className="w-3 h-3 rounded-full bg-red-400/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <span className="w-3 h-3 rounded-full bg-green-400/80" />
          <span className="ml-3 text-xs text-white/40 font-mono">orbitalis.app/dashboard</span>
        </div>
        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Cockpit</p>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2">
            {cards.map((c) => (
              <div key={c.label} className={`${c.color} rounded-xl p-3`}>
                <p className="text-xl font-black text-white tabular-nums">{c.n}</p>
                <p className="text-[10px] font-medium text-white/70 mt-0.5 leading-tight">{c.label}</p>
              </div>
            ))}
          </div>
          {/* Fake chart bars */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-[11px] text-white/40 mb-3">O.S. por mês</p>
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
      {/* Glow effect */}
      <div className="absolute -inset-8 bg-blue-500/10 rounded-full blur-3xl -z-10" />
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
            <div className="bg-primary rounded-xl p-1.5 shadow-sm">
              <img src="/logo.png" alt="Orbitalis" className="h-7 w-auto object-contain" />
            </div>
            <span className="font-black text-gray-900 text-lg tracking-tight">Orbitalis</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="#features"      className="hover:text-gray-900 transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Como funciona</a>
            <a href="#precos"        className="hover:text-gray-900 transition-colors">Preços</a>
          </nav>
          <div className="flex items-center gap-2 ml-4">
            <Link href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Entrar
            </Link>
            <Link href="/registro"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
              Começar grátis <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-24 md:py-32">
        {/* Decoração */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-white/4" />
          <div className="absolute top-1/2 -left-32 w-96 h-96 rounded-full bg-white/4" />
          <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full border border-white/8" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Clock size={12} />
              CMMS para climatização e refrigeração
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Dados em Órbita.<br />Manutenção<br />
              <span className="text-white/70">em Dia.</span>
            </h1>
            <p className="text-white/60 mt-5 text-lg leading-relaxed max-w-md">
              Controle ativos, execute planos PMOC, gerencie sua equipe de campo e encante seus clientes — tudo em um sistema só.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/registro"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-primary font-black rounded-xl hover:bg-white/90 transition-colors text-base shadow-lg">
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition-colors text-base">
                Já tenho conta
              </Link>
            </div>
            <p className="text-white/35 text-xs mt-4">Sem cartão de crédito · Configuração em 30 segundos</p>
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
            { n: '100%', label: 'Multi-tenant SaaS'         },
            { n: 'PWA',  label: 'Funciona offline'          },
            { n: 'PMOC', label: 'Laudos em PDF'             },
            { n: '∞',    label: 'Equipamentos por tenant'   },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black text-primary">{n}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Tudo que sua operação precisa</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Do checklist no campo ao relatório no escritório. Uma plataforma integrada para toda a jornada.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-primary/20 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
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
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Operando em menos de 5 minutos</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Linha conectora */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            {STEPS.map(({ n, title, desc, icon: Icon }) => (
              <div key={n} className="text-center relative">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-white border-2 border-primary/15 flex items-center justify-center mb-5 shadow-sm">
                  <div className="text-center">
                    <p className="text-xs font-black text-primary/40">{n}</p>
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

      {/* ── PREÇOS ────────────────────────────────────────────── */}
      <section id="precos" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Preços</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Simples e transparente</h2>
          <p className="text-gray-500 mt-3">Comece grátis. Escale quando precisar.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANOS.map(({ nome, preco, periodo, desc, destaque, cta, itens }) => (
            <div
              key={nome}
              className={[
                'rounded-2xl p-7 relative',
                destaque
                  ? 'bg-primary text-white shadow-2xl ring-4 ring-primary/20 scale-105'
                  : 'bg-white border border-gray-200',
              ].join(' ')}
            >
              {destaque && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                  Mais popular
                </div>
              )}
              <p className={`text-sm font-bold mb-1 ${destaque ? 'text-white/70' : 'text-gray-500'}`}>{nome}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-4xl font-black ${destaque ? 'text-white' : 'text-gray-900'}`}>{preco}</span>
                <span className={`text-sm ${destaque ? 'text-white/50' : 'text-gray-400'}`}>{periodo}</span>
              </div>
              <p className={`text-sm mb-6 ${destaque ? 'text-white/60' : 'text-gray-500'}`}>{desc}</p>

              <Link
                href="/registro"
                className={[
                  'block text-center py-3 rounded-xl font-bold text-sm transition-colors mb-6',
                  destaque
                    ? 'bg-white text-primary hover:bg-white/90'
                    : 'bg-primary text-white hover:bg-primary/90',
                ].join(' ')}
              >
                {cta}
              </Link>

              <ul className="space-y-2.5">
                {itens.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${destaque ? 'text-white/60' : 'text-emerald-500'}`} />
                    <span className={`text-sm ${destaque ? 'text-white/80' : 'text-gray-600'}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Pronto para colocar sua operação em órbita?
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Junte-se a empresas que já modernizaram sua gestão de ativos.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-black rounded-xl text-base hover:bg-white/90 transition-colors shadow-xl"
          >
            Criar conta grátis <ArrowRight size={18} />
          </Link>
          <p className="text-white/30 text-sm mt-4">Sem cartão · Configuração em 30 segundos · Cancele quando quiser</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary rounded-xl p-1.5">
                <img src="/logo.png" alt="Orbitalis" className="h-7 w-auto object-contain" />
              </div>
              <span className="font-black text-white text-base">Orbitalis</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#features"      className="hover:text-white transition-colors">Funcionalidades</a>
              <a href="#precos"        className="hover:text-white transition-colors">Preços</a>
              <Link href="/login"      className="hover:text-white transition-colors">Entrar</Link>
              <Link href="/registro"   className="hover:text-white transition-colors">Criar conta</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Orbitalis · Plataforma de Gestão de Ativos para Climatização e Refrigeração
          </div>
        </div>
      </footer>

    </div>
  )
}
