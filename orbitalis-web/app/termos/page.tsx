import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, H2, UL } from '@/components/legal/legal-shell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Termos de Uso — Orbitalis' }

export default function TermosPage() {
  const contato = LEGAL.email
    ? <strong>{LEGAL.email}</strong>
    : 'o canal de contato indicado no rodapé desta página'

  return (
    <LegalShell titulo="Termos de Uso">
      <p>
        Estes termos regem o uso do <strong>Orbitalis</strong>, plataforma on-line de gestão de manutenção (PCM/PMOC) para
        empresas de climatização e refrigeração. Ao criar uma conta ou usar a plataforma, você declara que leu e concorda com
        eles e com a <Link href="/privacidade" className="text-action underline">Política de Privacidade</Link>.
      </p>

      <H2>1. O que o Orbitalis oferece</H2>
      <p>
        Ferramentas para cadastrar clientes, ambientes e equipamentos; abrir, agendar e executar ordens de serviço com checklist
        e assinatura; programar manutenções preventivas; emitir orçamentos, contratos e relatórios; e dar a clientes e técnicos
        acesso aos seus respectivos portais.
      </p>

      <H2>2. Conta e responsabilidades</H2>
      <UL>
        <li>Quem cria a conta da empresa deve ter poderes para representá-la e fornecer informações verdadeiras.</li>
        <li>Você é responsável por manter a senha em sigilo e por tudo o que for feito com a sua conta. Avise-nos se suspeitar de uso indevido.</li>
        <li>O administrador da empresa decide quem convida (técnicos e clientes) e responde pelos acessos concedidos.</li>
      </UL>

      <H2>3. Uso permitido</H2>
      <p>É proibido usar a plataforma para fins ilícitos, tentar acessar dados de outras empresas, explorar falhas de segurança, sobrecarregar o serviço, copiar o sistema ou inserir conteúdo que viole direitos de terceiros.</p>

      <H2>4. Dados da sua empresa e LGPD</H2>
      <p>
        Os dados que você cadastra (clientes, técnicos, equipamentos, ordens de serviço etc.) continuam sendo seus. Para esses
        dados, <strong>a sua empresa é a controladora</strong> e o Orbitalis atua como <strong>operador</strong>, tratando-os apenas
        para prestar o serviço. Cabe a você ter base legal para cadastrar dados de terceiros e informá-los quando necessário. Detalhes
        na <Link href="/privacidade" className="text-action underline">Política de Privacidade</Link>.
      </p>

      <H2>5. Laudos, PMOC e responsabilidade técnica</H2>
      <p>
        O Orbitalis é uma <strong>ferramenta de apoio</strong> à organização e ao registro dos serviços. Ele não substitui o
        responsável técnico habilitado nem as exigências legais e normativas aplicáveis (como as do PMOC e da Anvisa). O conteúdo
        dos laudos, checklists e demais documentos emitidos é de responsabilidade de quem o preenche e assina, e deve ser
        conferido antes de ser entregue a clientes ou órgãos de fiscalização.
      </p>

      <H2>6. Disponibilidade do serviço</H2>
      <p>
        A plataforma está em fase inicial e é oferecida <strong>no estado em que se encontra</strong>. Trabalhamos para mantê-la
        disponível e segura, mas <strong>não garantimos funcionamento ininterrupto ou livre de erros</strong>: podem ocorrer
        manutenções, atualizações e falhas, inclusive de provedores de infraestrutura. Recomendamos que você exporte
        periodicamente os dados importantes.
      </p>

      <H2>7. Valores, planos e cancelamento</H2>
      <p>
        No momento, o uso não é cobrado. Se passarmos a oferecer planos pagos, os valores, a forma de pagamento, o cancelamento e
        o reembolso serão informados com clareza <strong>antes</strong> de qualquer cobrança, e nenhuma cobrança será feita sem a
        sua concordância. Você pode encerrar a conta a qualquer momento, pedindo por {contato}.
      </p>

      <H2>8. Propriedade intelectual</H2>
      <p>
        O software, a marca e o layout do Orbitalis pertencem à sua operadora. Você recebe um direito de uso pessoal e
        intransferível enquanto a conta estiver ativa. Os dados e documentos que você insere permanecem seus.
      </p>

      <H2>9. Limitação de responsabilidade</H2>
      <p>
        Na máxima extensão permitida em lei, o Orbitalis não responde por danos indiretos, lucros cessantes, perda de negócios
        ou por decisões tomadas com base nas informações registradas na plataforma. Nada neste termo exclui responsabilidades que a
        lei não permita excluir.
      </p>

      <H2>10. Suspensão e encerramento</H2>
      <p>Podemos suspender ou encerrar contas que violem estes termos ou a lei, avisando sempre que possível. Ao encerrar, aplica-se o que a Política de Privacidade diz sobre guarda e eliminação de dados.</p>

      <H2>11. Mudanças nos termos</H2>
      <p>Podemos atualizar estes termos. A data de vigência no topo indica a versão atual; mudanças relevantes serão avisadas na plataforma, e o uso continuado depois do aviso significa concordância.</p>

      <H2>12. Lei aplicável e contato</H2>
      <p>Aplica-se a legislação brasileira. Dúvidas ou solicitações: {contato}.</p>
    </LegalShell>
  )
}
