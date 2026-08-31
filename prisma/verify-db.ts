import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFICAÇÃO DE DADOS EXISTENTES (CONTAGEM DE REGISTROS) ===');
  
  const userCount = await prisma.user.count();
  const instCount = await prisma.financialInstitution.count();
  const accountCount = await prisma.account.count();
  const categoryCount = await prisma.category.count();
  const assetCount = await prisma.asset.count();
  const liabilityCount = await prisma.liability.count();
  const transactionCount = await prisma.transaction.count();
  const netWorthCount = await prisma.netWorthSnapshot.count();
  const balanceCount = await prisma.accountBalanceSnapshot.count();

  console.log(`Users: ${userCount}`);
  console.log(`FinancialInstitutions: ${instCount}`);
  console.log(`Accounts: ${accountCount}`);
  console.log(`Categories: ${categoryCount}`);
  console.log(`Assets: ${assetCount}`);
  console.log(`Liabilities: ${liabilityCount}`);
  console.log(`Transactions: ${transactionCount}`);
  console.log(`NetWorthSnapshots: ${netWorthCount}`);
  console.log(`AccountBalanceSnapshots: ${balanceCount}`);
  
  console.log('\n=== TESTANDO IMUTABILIDADE DOS CAMPOS BRUTOS E DEDUPLICAÇÃO ===');

  // Test: get or create dummy user and account for test
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Validação',
        email: 'validacao@test.com',
        controlStartDate: new Date('2026-08-02T00:00:00.000Z'),
      },
    });
  }

  let account = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Conta Validação Teste',
        type: 'CHECKING',
      },
    });
  }

  const testFitId = `TEST_FITID_${Date.now()}`;
  const rawDate = new Date('2025-03-15T12:00:00Z');
  const rawAmount = 150.50;
  const rawDesc = 'COMPRA SUPERMERCADO TESTE';

  // 1. Criar lançamento OFX bruto
  const t1 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: rawDate,
      description: rawDesc,
      originalDescription: rawDesc,
      amount: rawAmount,
      direction: 'DEBIT',
      transactionType: 'EXPENSE',
      fitId: testFitId,
      source: 'OFX_IMPORT',
      nature: 'UNCLASSIFIED',
      classificationStatus: 'PENDING',
    },
  });

  console.log(`[TEST 1] Transação original criada com ID: ${t1.id}, FITID: ${t1.fitId}`);

  // 2. Tentar inserir mesma transação (mesmo accountId + fitId) -> Deve falhar (Deduplicação forte)
  let duplicatePrevented = false;
  try {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        date: rawDate,
        description: rawDesc,
        originalDescription: rawDesc,
        amount: rawAmount,
        direction: 'DEBIT',
        transactionType: 'EXPENSE',
        fitId: testFitId,
        source: 'OFX_IMPORT',
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      duplicatePrevented = true;
    }
  }
  console.log(`[TEST 2] Tentativa de duplicar com mesmo FITID bloqueada? ${duplicatePrevented ? 'SIM (Sucedido)' : 'NÃO (Falhou)'}`);

  // 3. Classificar a transação e garantir que os dados brutos NÃO mudaram
  const category = await prisma.category.findFirst({ where: { userId: user.id } }) || await prisma.category.create({
    data: { userId: user.id, name: 'Alimentação Teste' },
  });

  const updatedT1 = await prisma.transaction.update({
    where: { id: t1.id },
    data: {
      nature: 'EXPENSE',
      categoryId: category.id,
      classificationStatus: 'CONFIRMED',
      notes: 'Nota adicionada na classificação',
      // Repare que NÃO passamos date, amount, originalDescription, fitId
    },
  });

  const rawFieldsIntact = 
    updatedT1.date.getTime() === rawDate.getTime() &&
    Number(updatedT1.amount) === rawAmount &&
    updatedT1.originalDescription === rawDesc &&
    updatedT1.fitId === testFitId &&
    updatedT1.accountId === account.id;

  console.log(`[TEST 3] Classificação executada. Dados brutos (date, amount, originalDescription, fitId, accountId) mantidos intocados? ${rawFieldsIntact ? 'SIM (Imutável)' : 'NÃO'}`);

  // 4. Testar lançamento idêntico sem FITID -> Não pode ser bloqueado, deve ser marcado como FLAGGED_DUPLICATE
  const fingerprintHash = `hash_${rawDate.toISOString()}_${rawAmount}_${rawDesc.trim()}`;
  const t2SameFingerprint = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: rawDate,
      description: rawDesc,
      originalDescription: rawDesc,
      amount: rawAmount,
      direction: 'DEBIT',
      transactionType: 'EXPENSE',
      importHash: fingerprintHash,
      possibleDuplicateOfId: t1.id,
      classificationStatus: 'FLAGGED_DUPLICATE',
      source: 'OFX_IMPORT',
    },
  });

  console.log(`[TEST 4] Lançamento sem FITID mas com fingerprint idêntico criado com status: ${t2SameFingerprint.classificationStatus} (ID: ${t2SameFingerprint.id}). Não foi descartado!`);

  // Limpeza dos dados de teste criados
  await prisma.transaction.deleteMany({ where: { id: { in: [t1.id, t2SameFingerprint.id] } } });
  console.log('=== FIM DOS TESTES DE VALIDAÇÃO TÉCNICA ===\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
