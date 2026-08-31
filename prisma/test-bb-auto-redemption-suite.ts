import { PrismaClient, TransactionNature, TransactionOrigin, ClassificationStatus, Prisma } from '@prisma/client';
import { BbAutoRedemptionEngine } from '../src/lib/services/ofx/bb-auto-redemption-engine';
import { FinancialOSEngine } from '../src/lib/services/dashboard/financial-os-engine';

const prisma = new PrismaClient();

async function runBbAutoRedemptionTests() {
  console.log('================================================================');
  console.log('   SUÍTE DE TESTES: RESGATE / APLICAÇÃO AUTOMÁTICA DO BANCO DO BRASIL');
  console.log('================================================================\n');

  // 1. SETUP DE USUÁRIO E CONTAS ISOLADAS
  let user = await prisma.user.findFirst({ where: { email: 'bb_auto_test@domain.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Usuário Teste BB Auto', email: 'bb_auto_test@domain.com' },
    });
  }

  // Limpeza prévia no usuário isolado
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  const accBB = await prisma.account.create({
    data: { userId: user.id, name: 'Conta Corrente Banco do Brasil', type: 'CHECKING' },
  });

  console.log(`[SETUP] Usuário: ${user.name} | Conta: ${accBB.name}`);

  // --- TESTE 1: PIX DE R$ 250 + RESGATE AUTOMÁTICO DE R$ 250 NO MESMO DIA ---
  console.log('\n--- TESTE 1: PIX DE R$ 250 + RESGATE AUTOMÁTICO NO MESMO DIA ---');
  const dateSameDay = new Date('2025-01-30T12:00:00Z');

  const txPix = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accBB.id,
      date: dateSameDay,
      amount: new Prisma.Decimal(-250.00),
      direction: 'DEBIT',
      description: 'Pix - Enviado - 30/01 Shpp Brasil',
      originalDescription: 'Pix - Enviado - 30/01 Shpp Brasil',
      transactionType: 'EXPENSE',
      nature: 'UNCLASSIFIED',
      origin: TransactionOrigin.BANK_IMPORT,
      classificationStatus: ClassificationStatus.PENDING,
    },
  });

  const txResgate = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accBB.id,
      date: dateSameDay,
      amount: new Prisma.Decimal(250.00),
      direction: 'CREDIT',
      description: 'Resgate Poupança (var.51)',
      originalDescription: 'Resgate Poupança (var.51)',
      transactionType: 'INCOME',
      nature: 'UNCLASSIFIED',
      origin: TransactionOrigin.BANK_IMPORT,
      classificationStatus: ClassificationStatus.PENDING,
    },
  });

  const suggestions1 = await BbAutoRedemptionEngine.detectSuggestions(user.id);
  console.log(`- Sugestões Detectadas: ${suggestions1.length}`);
  console.log(`- Mensagem de Sugestão: "${suggestions1[0]?.suggestionMessage}"`);
  console.log(`- Lançamento Oposto Pareado: ${suggestions1[0]?.matchedTransactionId === txPix.id ? 'SIM (Pix R$ 250)' : 'NÃO'}`);

  if (suggestions1.length !== 1 || suggestions1[0].matchedTransactionId !== txPix.id) {
    throw new Error('TESTE 1 FALHOU: Resgate e Pix de mesmo valor no mesmo dia deveriam ter sido pareados!');
  }
  console.log('✅ TESTE 1 PASSOU: Resgate automático e Pix pareados com sugestão clara de movimentação própria.');

  // --- TESTE 2: CONFIRMAÇÃO DO RESGATE & VALIDAÇÃO DE ISOLAMENTO NA DRE ---
  console.log('\n--- TESTE 2: CONFIRMAÇÃO DO RESGATE & ISOLAMENTO DA DRE ---');
  await BbAutoRedemptionEngine.confirmPair({
    userId: user.id,
    transactionId: txResgate.id,
    matchedTransactionId: txPix.id,
    createSavingsAccountIfMissing: true,
  });

  const dashRes = await FinancialOSEngine.getMonthlyResult(user.id, '2025-01');
  console.log(`- Receita Real Apurada no Mês (DRE): R$ ${dashRes.receitaReal}`);
  console.log(`- Consumo Pessoal Apurado no Mês (DRE): R$ ${dashRes.consumoPessoal}`);
  console.log(`- Aporte Real Apurado no Mês (DRE): R$ ${dashRes.aporteReal}`);

  if (dashRes.receitaReal !== 0 || dashRes.consumoPessoal !== 0 || dashRes.aporteReal !== 0) {
    throw new Error('TESTE 2 FALHOU: Resgate/Pix resgatado entrou indevidamente como receita, despesa ou aporte na DRE!');
  }
  console.log('✅ TESTE 2 PASSOU: Resgate confirmado como INTERNAL_TRANSFER e 100% isolado da DRE.');

  // --- TESTE 3: VALORES IGUAIS EM DATAS DIFERENTES (> 1 DIA DE DIFERENÇA) -> NÃO VINCULAR ---
  console.log('\n--- TESTE 3: VALORES IGUAIS EM DATAS DIFERENTES (> 1 DIA DE DIFERENÇA) ---');
  const dateDifferentDay = new Date('2025-01-10T12:00:00Z');
  const dateFarAwayDay = new Date('2025-01-20T12:00:00Z');

  const txFarPix = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accBB.id,
      date: dateDifferentDay,
      amount: new Prisma.Decimal(-500.00),
      direction: 'DEBIT',
      description: 'Pix - Enviado Restaurante',
      transactionType: 'EXPENSE',
      nature: 'UNCLASSIFIED',
      origin: TransactionOrigin.BANK_IMPORT,
      classificationStatus: ClassificationStatus.PENDING,
    },
  });

  const txFarResgate = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accBB.id,
      date: dateFarAwayDay, // 10 dias depois
      amount: new Prisma.Decimal(500.00),
      direction: 'CREDIT',
      description: 'Resgate Poupança (var.51)',
      transactionType: 'INCOME',
      nature: 'UNCLASSIFIED',
      origin: TransactionOrigin.BANK_IMPORT,
      classificationStatus: ClassificationStatus.PENDING,
    },
  });

  const suggestionsFar = await BbAutoRedemptionEngine.detectSuggestions(user.id);
  const matchedFar = suggestionsFar.find((s) => s.transactionId === txFarResgate.id);

  console.log(`- Resgate com 10 dias de diferença teve pareamento automático? ${matchedFar?.matchedTransactionId ? 'SIM' : 'NÃO (Esperado)'}`);
  if (matchedFar?.matchedTransactionId) {
    throw new Error('TESTE 3 FALHOU: Lançamentos em datas com > 1 dia de diferença NÃO poderiam ser vinculados automaticamente!');
  }
  console.log('✅ TESTE 3 PASSOU: Valores iguais em datas distantes mantidos sem vínculo automático.');

  // --- TESTE 4: REVERSIBILIDADE DO PAREAMENTO ---
  console.log('\n--- TESTE 4: REVERSIBILIDADE DO PAREAMENTO ---');
  await BbAutoRedemptionEngine.unpair(user.id, txResgate.id);
  const txReverted = await prisma.transaction.findUnique({ where: { id: txResgate.id } });

  console.log(`- Status após reversão: ${txReverted?.classificationStatus} | Natureza: ${txReverted?.nature}`);
  if (txReverted?.classificationStatus !== ClassificationStatus.PENDING || txReverted?.nature !== TransactionNature.UNCLASSIFIED) {
    throw new Error('TESTE 4 FALHOU: Reversão de resgate pareado falhou!');
  }
  console.log('✅ TESTE 4 PASSOU: Pareamento totalmente reversível pelo usuário.');

  // Limpeza final
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  console.log('\n================================================================');
  console.log('🎉 TODOS OS TESTES DE RESGATE AUTOMÁTICO BB PASSARAM COM SUCESSO!');
  console.log('================================================================\n');
}

runBbAutoRedemptionTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
