import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar dados antigos na ordem correta de FK
  await prisma.auditoriaConflitoSincronizacao.deleteMany();
  await prisma.ordemServicoItem.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.planoEquipamentoConfig.deleteMany();
  await prisma.planoManutencao.deleteMany();
  await prisma.equipamento.deleteMany();
  await prisma.ambiente.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.usuario.deleteMany();
  console.log('✓ Dados antigos removidos');

  // ── Usuários ─────────────────────────────────────────────────────────────
  const adminHash    = await bcrypt.hash('Admin@2026', 10);
  const tecnicoHash  = await bcrypt.hash('Tecnico@2026', 10);
  const clienteHash  = await bcrypt.hash('Cliente@2026', 10);

  const admin = await prisma.usuario.create({
    data: { email: 'admin@orbitalis.app', senhaHash: adminHash, tipo: 'admin' },
  });
  const tecnico = await prisma.usuario.create({
    data: { email: 'joao.silva@orbitalis.app', senhaHash: tecnicoHash, tipo: 'tecnico' },
  });
  const clienteUsuario = await prisma.usuario.create({
    data: { email: 'contato@frigocenter.com.br', senhaHash: clienteHash, tipo: 'cliente' },
  });
  console.log('✓ Usuários: admin + técnico + cliente');

  // ── Cliente ───────────────────────────────────────────────────────────────
  const cliente = await prisma.cliente.create({
    data: {
      documento: '12345678000199',
      razaoSocial: 'Frigocenter Comércio e Serviços Ltda',
      nomeFantasia: 'Frigocenter',
      endereco: 'Av. Paulista, 1000, São Paulo - SP',
      usuarioId: clienteUsuario.id,
    },
  });
  console.log('✓ Cliente: Frigocenter');

  // ── Ambientes (IDs gerados pelo DB — UUIDv4 válidos) ─────────────────────
  const ambienteTI = await prisma.ambiente.create({
    data: {
      clienteId: cliente.id,
      nome: 'Sala de Servidores TI',
      metrosQuadrados: 45.5,
      capacidadeTermica: '36.000 BTU',
      localizacaoInterna: 'Bloco A — 3º andar',
    },
  });
  const ambienteRH = await prisma.ambiente.create({
    data: {
      clienteId: cliente.id,
      nome: 'Escritório RH',
      metrosQuadrados: 80.0,
      capacidadeTermica: '24.000 BTU',
      localizacaoInterna: 'Bloco B — 1º andar',
    },
  });
  console.log('✓ Ambientes:', ambienteTI.id.slice(0, 8), '...', ambienteRH.id.slice(0, 8), '...');

  // ── Equipamentos ──────────────────────────────────────────────────────────
  await prisma.equipamento.createMany({
    data: [
      { ambienteId: ambienteTI.id, codigoQr: 'TI-AC01', nome: 'Split Inverter TI — Evaporadora 1', marca: 'Daikin', modelo: 'FTXS35LVMAW', numeroSerie: 'DK2024-001', tipoEquipamento: 'Split Inverter' },
      { ambienteId: ambienteTI.id, codigoQr: 'TI-AC02', nome: 'Split Inverter TI — Evaporadora 2', marca: 'Daikin', modelo: 'FTXS35LVMAW', numeroSerie: 'DK2024-002', tipoEquipamento: 'Split Inverter' },
      { ambienteId: ambienteRH.id, codigoQr: 'RH-AC01', nome: 'Cassete RH', marca: 'Carrier', modelo: '42XQC024515VC', numeroSerie: 'CR2023-045', tipoEquipamento: 'Cassete' },
    ],
  });
  console.log('✓ Equipamentos: 2x TI + 1x RH');

  // ── Modelo de Checklist ───────────────────────────────────────────────────
  const checklist = await prisma.modeloChecklist.create({
    data: {
      nome: 'Manutenção Preventiva Split — Padrão PMOC',
      itens: [
        { ordem: 1,  tarefa: 'Limpeza do filtro de ar',               obrigatorio: true,  tipo: 'checkbox' },
        { ordem: 2,  tarefa: 'Limpeza da serpentina evaporadora',      obrigatorio: true,  tipo: 'checkbox' },
        { ordem: 3,  tarefa: 'Limpeza da bandeja de condensado',       obrigatorio: true,  tipo: 'checkbox' },
        { ordem: 4,  tarefa: 'Verificação e limpeza do dreno',         obrigatorio: true,  tipo: 'checkbox' },
        { ordem: 5,  tarefa: 'Temperatura de insuflamento (°C)',       obrigatorio: true,  tipo: 'numero'   },
        { ordem: 6,  tarefa: 'Temperatura de retorno (°C)',            obrigatorio: true,  tipo: 'numero'   },
        { ordem: 7,  tarefa: 'Corrente elétrica do compressor (A)',    obrigatorio: false, tipo: 'numero'   },
        { ordem: 8,  tarefa: 'Verificação de ruídos anormais',        obrigatorio: true,  tipo: 'checkbox' },
        { ordem: 9,  tarefa: 'Estado do isolamento térmico',           obrigatorio: false, tipo: 'texto'    },
        { ordem: 10, tarefa: 'Observações gerais',                     obrigatorio: false, tipo: 'texto'    },
      ],
    },
  });
  console.log('✓ Modelo checklist PMOC');

  // ── Planos de Manutenção ──────────────────────────────────────────────────
  const agora = new Date();

  const plano = await prisma.planoManutencao.create({
    data: {
      clienteId: cliente.id,
      tecnicoId: tecnico.id,
      frequenciaDias: 30,
      ativo: true,
      proximaGeracao: agora,
    },
  });

  const equipamentos = await prisma.equipamento.findMany({
    where: { ambienteId: { in: [ambienteTI.id, ambienteRH.id] } },
    select: { id: true },
  });

  await prisma.planoEquipamentoConfig.createMany({
    data: equipamentos.map((eq) => ({
      planoId: plano.id,
      equipamentoId: eq.id,
      modeloChecklistId: checklist.id,
    })),
  });
  console.log(`✓ Plano preventivo: Frigocenter (${equipamentos.length} equipamentos, 30d)`);

  console.log('\n📋 Credenciais:');
  console.log('  Admin:   admin@orbitalis.app          / Admin@2026');
  console.log('  Técnico: joao.silva@orbitalis.app     / Tecnico@2026');
  console.log('  Cliente: contato@frigocenter.com.br   / Cliente@2026');
  console.log('\n⚡ Rode: PATCH /planos-manutencao/disparar-agora para gerar O.S. preventivas');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
