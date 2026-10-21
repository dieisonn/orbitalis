import type { Metadata } from 'next'
import { LegalShell, H2, UL } from '@/components/legal/legal-shell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Política de Privacidade — Orbitalis' }

export default function PrivacidadePage() {
  const contato = LEGAL.email
    ? <strong>{LEGAL.email}</strong>
    : 'o canal de contato indicado no rodapé desta página'

  return (
    <LegalShell titulo="Política de Privacidade">
      <p>
        Esta política explica como o <strong>Orbitalis</strong>, plataforma de gestão de manutenção (PCM/PMOC) para
        climatização e refrigeração, trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018 — LGPD).
      </p>

      <H2>1. Quem é responsável pelos dados</H2>
      <p>Há dois papéis diferentes, e é importante distingui-los:</p>
      <UL>
        <li>
          <strong>Dados da sua conta e do uso da plataforma</strong> (nome, e-mail, senha, registros de acesso): o Orbitalis
          é o <strong>controlador</strong>.
        </li>
        <li>
          <strong>Dados que a empresa usuária cadastra</strong> (seus clientes, técnicos, equipamentos, ordens de serviço,
          assinaturas): a <strong>empresa usuária é a controladora</strong> e o Orbitalis atua como <strong>operador</strong>,
          tratando esses dados apenas para prestar o serviço e conforme as instruções dela.
        </li>
      </UL>
      {(LEGAL.razaoSocial || LEGAL.encarregado) && (
        <p>
          {LEGAL.razaoSocial && <>Operadora da plataforma: <strong>{LEGAL.razaoSocial}</strong>{LEGAL.cnpj && <> (CNPJ {LEGAL.cnpj})</>}. </>}
          {LEGAL.encarregado && <>Encarregado pelo tratamento de dados: <strong>{LEGAL.encarregado}</strong>.</>}
        </p>
      )}

      <H2>2. Quais dados tratamos</H2>
      <UL>
        <li><strong>Conta:</strong> nome, e-mail e senha (guardada de forma criptografada, nunca em texto aberto), perfil de acesso (administrador, técnico ou cliente).</li>
        <li><strong>Empresa usuária:</strong> razão social, nome fantasia, CNPJ, telefone, endereço e logotipo.</li>
        <li>
          <strong>Dados cadastrados pela empresa usuária:</strong> clientes (nome ou razão social, CPF/CNPJ, telefone, e-mail,
          endereço), técnicos, ambientes, equipamentos, ordens de serviço, orçamentos, contratos, checklists, fotos e
          assinaturas coletadas no atendimento.
        </li>
        <li><strong>Dados técnicos:</strong> endereço IP, data e hora de acesso e tipo de navegador, registrados automaticamente pelos provedores de hospedagem para segurança e funcionamento.</li>
      </UL>
      <p>Coletamos apenas o necessário para a plataforma funcionar. Não pedimos dados sensíveis (como saúde, religião ou biometria).</p>

      <H2>3. Para que usamos e em que base legal</H2>
      <UL>
        <li>Criar e manter sua conta, autenticar acessos e prestar o serviço contratado — <em>execução de contrato</em> (art. 7º, V).</li>
        <li>Gerar ordens de serviço, laudos e relatórios que a empresa usuária solicita — <em>execução de contrato</em>.</li>
        <li>Manter a segurança, prevenir fraudes e corrigir falhas — <em>legítimo interesse</em> (art. 7º, IX).</li>
        <li>Cumprir obrigações legais ou atender autoridades, quando exigido — <em>obrigação legal</em> (art. 7º, II).</li>
        <li>Qualquer uso opcional que dependa de sua escolha — <em>consentimento</em> (art. 7º, I), que você pode retirar quando quiser.</li>
      </UL>
      <p>Não vendemos dados pessoais e não os usamos para publicidade.</p>

      <H2>4. Com quem compartilhamos</H2>
      <p>
        Usamos provedores de infraestrutura para hospedar a plataforma (aplicação web e servidor/banco de dados). Eles tratam os
        dados em nosso nome, sob contrato e apenas para essa finalidade. Esses provedores podem manter servidores fora do Brasil;
        nesse caso, a transferência internacional ocorre com as salvaguardas previstas na LGPD (art. 33).
      </p>
      <p>
        Dentro de uma empresa usuária, os dados ficam isolados dos de outras empresas. Um cliente só vê o que diz respeito aos
        próprios ambientes e ordens de serviço; um técnico só vê as ordens atribuídas a ele.
      </p>

      <H2 id="cookies">5. Cookies e armazenamento local</H2>
      <p>Usamos <strong>somente itens essenciais</strong> ao funcionamento. Não usamos cookies de publicidade, de análise de audiência nem rastreadores de terceiros.</p>
      <UL>
        <li><strong>orbitalis_token</strong> (cookie, 8 horas): mantém você conectado de forma segura; não é acessível por scripts da página.</li>
        <li><strong>orbitalis_role</strong> (cookie, 8 horas): indica seu perfil de acesso para exibir as telas certas.</li>
        <li><strong>Preferências no navegador</strong> (armazenamento local): tema claro/escuro e o aviso de cookies já visto.</li>
        <li><strong>Cache do aplicativo instalável (PWA):</strong> guarda partes do site no seu aparelho para carregar mais rápido.</li>
      </UL>
      <p>Como são essenciais, esses itens não exigem consentimento. Você pode apagá-los pelas configurações do navegador, mas será desconectado.</p>

      <H2>6. Por quanto tempo guardamos</H2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Encerrada a conta, excluímos ou anonimizamos os dados em prazo razoável,
        salvo quando a lei exigir a guarda por mais tempo. A empresa usuária pode exportar seus dados (por exemplo, em CSV e PDF)
        antes de encerrar.
      </p>

      <H2>7. Segurança</H2>
      <UL>
        <li>Conexão criptografada (HTTPS).</li>
        <li>Senhas guardadas com criptografia irreversível.</li>
        <li>Controle de acesso por perfil e isolamento entre empresas.</li>
        <li>Cookies de sessão protegidos e com validade limitada.</li>
      </UL>
      <p>Nenhum sistema é totalmente imune a riscos. Em caso de incidente que possa causar dano relevante, comunicaremos os envolvidos e a autoridade competente conforme a LGPD.</p>

      <H2>8. Seus direitos</H2>
      <p>Você pode pedir, a qualquer momento:</p>
      <UL>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
        <li>portabilidade dos dados;</li>
        <li>informação sobre com quem os dados foram compartilhados;</li>
        <li>revogação do consentimento, quando essa for a base do tratamento;</li>
        <li>revisão de decisões tomadas apenas de forma automatizada, se houver.</li>
      </UL>
      <p>
        Escreva para {contato}. Respondemos em até 15 dias. Se seus dados foram cadastrados por uma empresa usuária (por exemplo,
        você é cliente final dela), ela é a controladora e poderemos encaminhar o pedido a ela. Você também pode reclamar à
        Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <H2>9. Crianças e adolescentes</H2>
      <p>A plataforma é voltada a empresas e profissionais e não se destina a menores de 18 anos.</p>

      <H2>10. Mudanças nesta política</H2>
      <p>Podemos atualizar este texto. A data de vigência no topo da página sempre indica a versão atual; mudanças relevantes serão avisadas na plataforma.</p>

      <H2>11. Contato</H2>
      <p>Dúvidas sobre privacidade: {contato}.</p>
    </LegalShell>
  )
}
