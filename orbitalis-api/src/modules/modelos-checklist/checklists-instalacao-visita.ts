// Checklists padrão de Instalação nova e Visita técnica.
// Pensados para o técnico sair do cliente sem precisar voltar: cobrem conferência, medições,
// segurança elétrica, dreno, teste de funcionamento, entrega e orientação ao cliente.

export const INSTALACAO_NOVA_NOME = 'Instalação nova — Conferência e entrega (padrão)';
export const VISITA_TECNICA_NOME = 'Visita técnica — Levantamento e diagnóstico (padrão)';

export const INSTALACAO_NOVA_ITENS = [
  { id: 'inst-01', descricao: 'Conferir equipamento e acessórios recebidos (modelo, capacidade, controle, suportes, manual)', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Conforme', 'Divergência registrada nas observações'] },
  { id: 'inst-02', descricao: 'Confirmar com o cliente o local das unidades interna e externa antes de furar', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Aprovado pelo cliente', 'Ajustado a pedido do cliente'] },
  { id: 'inst-03', descricao: 'Fixação e nivelamento das unidades interna e externa (suportes, buchas, parafusos)', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Conforme', 'Reforço executado'] },
  { id: 'inst-04', descricao: 'Tubulação de cobre: isolamento térmico e acabamento, sem trechos expostos', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Conforme', 'Refeito'] },
  { id: 'inst-05', descricao: 'Vácuo realizado na linha (micron)', obrigatorio: false, tipo: 'numero', unidade: 'micron' },
  { id: 'inst-06', descricao: 'Conexões (flare) sem vazamento — teste de estanqueidade', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Sem vazamento', 'Vazamento corrigido'] },
  { id: 'inst-07', descricao: 'Carga complementar de gás, se necessária (g)', obrigatorio: false, tipo: 'numero', unidade: 'g' },
  { id: 'inst-08', descricao: 'Instalação elétrica: circuito/disjuntor dedicado, bitola do cabo, aterramento e conexões firmes', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Conforme', 'Ajuste necessário realizado', 'Pendência — adequação do cliente'] },
  { id: 'inst-09', descricao: 'Tensão elétrica medida (V)', obrigatorio: true, tipo: 'numero', unidade: 'V' },
  { id: 'inst-10', descricao: 'Corrente medida em funcionamento (A)', obrigatorio: true, tipo: 'numero', unidade: 'A' },
  { id: 'inst-11', descricao: 'Checar dreno: caimento, vedação e escoamento (despejar água na bandeja e conferir a saída)', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Escoando normalmente', 'Corrigido', 'Pendência — ver observações'] },
  { id: 'inst-12', descricao: 'Verificar funcionamento do equipamento', obrigatorio: true, tipo: 'multipla_escolha', opcoes: ['Frio OK', 'Ventilação OK', 'Quente OK', 'Direcionamento das aletas OK', 'Comandos do controle OK'] },
  { id: 'inst-13', descricao: 'Temperatura de insuflamento após 10 minutos de funcionamento (°C)', obrigatorio: true, tipo: 'numero', unidade: '°C' },
  { id: 'inst-14', descricao: 'Ruídos e vibrações anormais', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Sem ruídos', 'Ruído identificado e corrigido'] },
  { id: 'inst-15', descricao: 'Entregar controle remoto (com pilhas e suporte)', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Entregue', 'Cliente ausente — deixado com responsável'] },
  { id: 'inst-16', descricao: 'Orientar o cliente: uso, temperatura recomendada, limpeza dos filtros e garantia', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Orientado', 'Cliente ausente — orientação por mensagem'] },
  { id: 'inst-17', descricao: 'Limpar o local e recolher embalagens, sobras e entulho', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Local limpo', 'Pendência registrada'] },
  { id: 'inst-18', descricao: 'Registrar nº de série das unidades interna e externa', obrigatorio: false, tipo: 'texto' },
  { id: 'inst-19', descricao: 'Cliente conferiu e aceitou a instalação', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Aceitou', 'Aceitou com ressalvas — ver observações'] },
  { id: 'inst-20', descricao: 'Pendências que exigem retorno (se houver)', obrigatorio: false, tipo: 'texto' },
];

export const VISITA_TECNICA_ITENS = [
  { id: 'vt-01', descricao: 'Motivo da visita / queixa do cliente', obrigatorio: true, tipo: 'texto' },
  { id: 'vt-02', descricao: 'Equipamento identificado (marca, modelo, capacidade, nº de série)', obrigatorio: true, tipo: 'texto' },
  { id: 'vt-03', descricao: 'Situação do equipamento ao chegar', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Funciona normalmente', 'Funciona com falha', 'Não liga'] },
  { id: 'vt-04', descricao: 'Pressão medida? Sucção (bar)', obrigatorio: true, tipo: 'numero', unidade: 'bar' },
  { id: 'vt-05', descricao: 'Pressão de descarga (bar)', obrigatorio: false, tipo: 'numero', unidade: 'bar' },
  { id: 'vt-06', descricao: 'Corrente medida (A)', obrigatorio: true, tipo: 'numero', unidade: 'A' },
  { id: 'vt-07', descricao: 'Tensão medida (V)', obrigatorio: true, tipo: 'numero', unidade: 'V' },
  { id: 'vt-08', descricao: 'Dreno funciona?', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Funciona', 'Entupido', 'Sem caimento / inadequado'] },
  { id: 'vt-09', descricao: 'Possui ponto elétrico adequado?', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Adequado', 'Inadequado — adequação necessária', 'Inexistente'] },
  { id: 'vt-10', descricao: 'Disjuntor e bitola do cabo compatíveis com a capacidade do equipamento', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Adequados', 'Inadequados — adequação necessária'] },
  { id: 'vt-11', descricao: 'Aterramento', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Presente', 'Ausente'] },
  { id: 'vt-12', descricao: 'Vazamento de fluido refrigerante', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Sem vazamento', 'Vazamento detectado'] },
  { id: 'vt-13', descricao: 'Estado de filtros, serpentinas e bandeja', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['Limpos', 'Sujos — limpeza recomendada'] },
  { id: 'vt-14', descricao: 'Ruídos e vibrações anormais', obrigatorio: false, tipo: 'escolha_unica', opcoes: ['Sem ruídos', 'Ruído identificado'] },
  { id: 'vt-15', descricao: 'Local e acesso para o serviço (medidas, altura, distância entre unidades, furação, infraestrutura necessária)', obrigatorio: false, tipo: 'texto' },
  { id: 'vt-16', descricao: 'Peças e serviços necessários (base para o orçamento)', obrigatorio: true, tipo: 'texto' },
  { id: 'vt-17', descricao: 'Resultado da visita', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Resolvido na visita', 'Retorno necessário — orçamento', 'Retorno necessário — aguardando peça'] },
  { id: 'vt-18', descricao: 'Cliente informado do diagnóstico e dos próximos passos', obrigatorio: true, tipo: 'escolha_unica', opcoes: ['Informado', 'Cliente ausente — informar por mensagem'] },
];
