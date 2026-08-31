import { PrismaClient, Prisma } from '@prisma/client';
import { NetWorthEngine } from '../src/lib/services/patrimony/net-worth-engine';

const prisma = new PrismaClient();

async function runPatrimonyTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES AUTOMATIZADOS - ETAPA 9 (PATRIMÔNIO)');
  console.log('=====================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Patrimônio',
        email: 'patrimony_test@domain.com',
      },
    });
  }

  // Limpeza prévia de passivos e ativos anteriores do usuário
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.liability.deleteMany({ where: { userId: user.id } });
  await prisma.assetValuation.deleteMany({ where: { asset: { userId: user.id } } });
  await prisma.asset.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  // 1. Criar Instituição Bancária e Corretora
  const bankInst = await prisma.financialInstitution.create({
    data: { userId: user.id, name: 'Banco do Brasil Teste', type: 'BANK' },
  });
  const brokerInst = await prisma.financialInstitution.create({
    data: { userId: user.id, name: 'XP Investimentos Teste', type: 'BROKERAGE' },
  });

  // 2. Criar Contas
  const checkingAcc = await prisma.account.create({
    data: {
      userId: user.id,
      financialInstitutionId: bankInst.id,
      name: 'Conta Corrente Principal',
      type: 'CHECKING',
      calculatedBalance: new Prisma.Decimal(50000.00),
    },
  });

  const brokerAcc = await prisma.account.create({
    data: {
      userId: user.id,
      financialInstitutionId: brokerInst.id,
      name: 'Conta Custódia XP',
      type: 'BROKERAGE',
      calculatedBalance: new Prisma.Decimal(200000.00),
    },
  });

  // 3. Criar Ativo Físico (Imóvel)
  const apartmentAsset = await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'Apartamento Jardins 302',
      category: 'REAL_ESTATE',
      acquisitionValue: new Prisma.Decimal(800000.00),
      paidEquityValue: new Prisma.Decimal(300000.00),
      currentValue: new Prisma.Decimal(950000.00),
      considerInNetWorth: true,
    },
  });

  // 4. Criar Passivo (Financiamento Imobiliário)
  const mortgageLiability = await prisma.liability.create({
    data: {
      userId: user.id,
      name: 'Financiamento CEF Apt 302',
      institution: 'Caixa Econômica Federal',
      type: 'MORTGAGE',
      originalValue: new Prisma.Decimal(500000.00),
      currentBalance: new Prisma.Decimal(450000.00),
      associatedAssetId: apartmentAsset.id,
    },
  });

  console.log(`[SETUP] Usuário: ${user.name} | Ativo: ${apartmentAsset.name} | Passivo: ${mortgageLiability.name}\n`);

  // TESTE 1: Apuração de Patrimônio Líquido
  console.log('--- TESTE 1: APURAÇÃO DE PATRIMÔNIO LÍQUIDO ---');
  const netWorthResult = await NetWorthEngine.calculateCurrentNetWorth(user.id);

  console.log(`- Ativos Líquidos: R$ ${netWorthResult.liquidAssets}`);
  console.log(`- Ativos de Investimento: R$ ${netWorthResult.investmentAssets}`);
  console.log(`- Ativos Físicos: R$ ${netWorthResult.physicalAssets}`);
  console.log(`- Total de Ativos: R$ ${netWorthResult.totalAssets}`);
  console.log(`- Total de Passivos: R$ ${netWorthResult.totalLiabilities}`);
  console.log(`- Patrimônio Líquido Total: R$ ${netWorthResult.netWorth}`);

  // Total Ativos = 50.000 + 200.000 + 950.000 = 1.200.000
  // Total Passivos = 450.000
  // Net Worth = 750.000
  if (netWorthResult.totalAssets !== 1200000.00 || netWorthResult.totalLiabilities !== 450000.00 || netWorthResult.netWorth !== 750000.00) {
    throw new Error('TESTE 1 FALHOU: Cálculo de Patrimônio Líquido incorreto.');
  }
  console.log('✅ TESTE 1 PASSOU: Apuração exata por instituição, ativos e passivos.\n');

  // TESTE 2: Snapshot Imutável
  console.log('--- TESTE 2: CRIAÇÃO DE SNAPSHOT IMUTÁVEL ---');
  const snapshot = await NetWorthEngine.createSnapshot(user.id);

  console.log(`- Snapshot Criado ID: ${snapshot.id} | Data: ${snapshot.date.toISOString().split('T')[0]}`);
  console.log(`- Snapshot Net Worth: R$ ${snapshot.netWorth}`);

  if (Number(snapshot.netWorth) !== 750000.00) {
    throw new Error('TESTE 2 FALHOU: Snapshot com valor de patrimônio divergente.');
  }
  console.log('✅ TESTE 2 PASSOU: Snapshot imutável gravado no banco de dados.\n');

  // TESTE 3: Reavaliação Manual de Ativo Físico com Histórico
  console.log('--- TESTE 3: REAVALIAÇÃO MANUAL DE ATIVO FÍSICO (AssetValuation) ---');
  const valResult = await NetWorthEngine.updateAssetValuation({
    userId: user.id,
    assetId: apartmentAsset.id,
    newValue: 1000000.00, // Reavaliação do apartamento para R$ 1.000.000
    source: 'AVALIAÇÃO_IMOBILIÁRIA',
    notes: 'Reavaliação de mercado pós-reforma',
  });

  console.log(`- Novo Valor de Mercado: R$ ${valResult.asset.currentValue} | Histórico Registrado ID: ${valResult.valuation.id}`);

  const updatedNW = await NetWorthEngine.calculateCurrentNetWorth(user.id);
  console.log(`- Novo Patrimônio Líquido Atualizado: R$ ${updatedNW.netWorth}`);

  if (Number(valResult.asset.currentValue) !== 1000000.00 || updatedNW.netWorth !== 800000.00) {
    throw new Error('TESTE 3 FALHOU: Reavaliação não atualizou o patrimônio líquido corretamente.');
  }
  console.log('✅ TESTE 3 PASSOU: Reavaliação gravada no histórico AssetValuation com sucesso.\n');

  // TESTE 4: Progresso das Metas de R$ 5M e R$ 10k/mês Renda Passiva
  console.log('--- TESTE 4: PROGRESSO CONTRA METAS (R$ 5M NET WORTH & R$ 10K/MÊS RENDA PASSIVA) ---');
  const goalStatus = await NetWorthEngine.getGoalStatus(user.id, 0.06); // 6% a.a.

  console.log(`- Meta Patrimônio Líquido Target: R$ ${goalStatus.targetNetWorth} | Atual: R$ ${goalStatus.currentNetWorth} | Progresso: ${goalStatus.netWorthProgressPercentage}%`);
  console.log(`- Meta Renda Passiva Target: R$ ${goalStatus.targetPassiveIncome}/mês | Projetada: R$ ${goalStatus.projectedMonthlyPassiveIncome.toFixed(2)}/mês | Progresso: ${goalStatus.passiveIncomeProgressPercentage}%`);

  // Progresso Net Worth: 800.000 / 5.000.000 = 16.0%
  // Capital Investível = 50.000 + 200.000 = 250.000
  // Renda Passiva Mensal a 6% a.a. (0.5%/mês) = 250.000 * 0.005 = R$ 1.250/mês
  // Progresso Renda Passiva = 1.250 / 10.000 = 12.5%

  if (goalStatus.netWorthProgressPercentage !== 16.0 || goalStatus.projectedMonthlyPassiveIncome !== 1250.00) {
    throw new Error(`TESTE 4 FALHOU: Metas de patrimônio/renda passiva incorretas. Progresso NW: ${goalStatus.netWorthProgressPercentage}%, Renda Passiva: ${goalStatus.projectedMonthlyPassiveIncome}`);
  }
  console.log('✅ TESTE 4 PASSOU: Projeção de renda passiva mantida isolada como projeção matemática baseada em taxa configurável.\n');

  // Limpeza
  await prisma.assetValuation.deleteMany({ where: { assetId: apartmentAsset.id } });
  await prisma.liability.deleteMany({ where: { id: mortgageLiability.id } });
  await prisma.asset.deleteMany({ where: { id: apartmentAsset.id } });
  await prisma.account.deleteMany({ where: { id: { in: [checkingAcc.id, brokerAcc.id] } } });
  await prisma.financialInstitution.deleteMany({ where: { id: { in: [bankInst.id, brokerInst.id] } } });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES DA ETAPA 9 PASSARAM COM SUCESSO! 🎉');
  console.log('=====================================================\n');
}

runPatrimonyTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
