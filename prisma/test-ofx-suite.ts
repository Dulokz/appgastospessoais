import { PrismaClient, TransactionOrigin, TransactionPeriodType, TransactionNature, ClassificationStatus, Prisma } from '@prisma/client';
import { OfxImporterService } from '../src/lib/services/ofx/ofx-importer';

const prisma = new PrismaClient();

const SAMPLE_VALID_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEDAREA:NONE
NEWFILEDAREA:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20250131120000[-3:BRT]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20250101000000[-3:BRT]
<DTEND>20250131235959[-3:BRT]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20250105120000[-3:BRT]
<TRNAMT>150.00
<FITID>20250105001
<CHECKNUM>101
<MEMO>PIX RECEBIDO JOAO SILVA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250110120000[-3:BRT]
<TRNAMT>-45.90
<FITID>20250110002
<CHECKNUM>102
<MEMO>COMPRA SUPERMERCADO ABC
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250115120000[-3:BRT]
<TRNAMT>-300.00
<FITID>20250115003
<CHECKNUM>103
<MEMO>PAGTO FATURA CARTAO MASTERCARD
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20250131120000[-3:BRT]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

async function runOfxTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES AUTOMATIZADOS FINAIS - ETAPA 10   ');
  console.log('=====================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste OFX Final',
        email: 'ofx_final_test@domain.com',
      },
    });
  }

  let account = await prisma.account.findFirst({
    where: { userId: user.id, name: 'Conta Banco do Brasil Teste Final' },
  });

  if (!account) {
    account = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Conta Banco do Brasil Teste Final',
        type: 'CHECKING',
      },
    });
  }

  let category = await prisma.category.findFirst({ where: { userId: user.id, name: 'Alimentação' } });
  if (!category) {
    category = await prisma.category.create({
      data: { userId: user.id, name: 'Alimentação' },
    });
  }

  // Limpeza de prévia
  await prisma.transaction.deleteMany({ where: { accountId: account.id } });
  await prisma.importBatch.deleteMany({ where: { accountId: account.id } });

  console.log(`[SETUP] Usuário: ${user.name} | Conta: ${account.name}\n`);

  // TESTE 1: Importação do Lote Inicial
  console.log('--- TESTE 1: IMPORTAÇÃO DO LOTE INICIAL ---');
  const importResult1 = await OfxImporterService.executeImport({
    userId: user.id,
    accountId: account.id,
    filename: 'extrato_bb_jan2025.ofx',
    fileContent: SAMPLE_VALID_OFX,
  });

  console.log(`- Lançamentos Novos Importados: ${importResult1.newRecords} | FITIDs processados`);
  if (importResult1.newRecords !== 3) {
    throw new Error('TESTE 1 FALHOU: Deveria ter importado 3 novos lançamentos.');
  }
  console.log('✅ TESTE 1 PASSOU\n');

  // TESTE A: Reimportar o mesmo OFX (Provar que o FITID NÃO gera um segundo lançamento)
  console.log('--- TESTE A: REIMPORTAÇÃO DO MESMO OFX (PROVA DE FITID IDEMPOTENTE) ---');
  const importResultReImport = await OfxImporterService.executeImport({
    userId: user.id,
    accountId: account.id,
    filename: 'extrato_bb_jan2025.ofx',
    fileContent: SAMPLE_VALID_OFX,
  });

  console.log(`- Lançamentos Novos na Reimportação: ${importResultReImport.newRecords} (Esperado: 0)`);
  console.log(`- Registros Duplicados Retidos por FITID: ${importResultReImport.duplicateRecords} (Esperado: 3)`);

  if (importResultReImport.newRecords !== 0 || importResultReImport.duplicateRecords !== 3) {
    throw new Error('TESTE A FALHOU: O FITID permitiu criação de transação duplicada em reimportação!');
  }
  console.log('✅ TESTE A PASSOU: O FITID garante 0 novos lançamentos na reimportação do mesmo OFX.\n');

  // TESTE B: Importar sobre uma Transação CONFIRMED (Provar que classificação/categoria NÃO mudam)
  console.log('--- TESTE B: IMPORTAÇÃO SOBRE TRANSAÇÃO MANUALMENTE CONFIRMADA ---');
  
  // 1. Confirmar manualmente a transação do FITID 20250110002 com categoria 'Alimentação' e natureza 'EXPENSE'
  const confirmedTxBefore = await prisma.transaction.findFirst({
    where: { accountId: account.id, fitId: '20250110002' },
  });
  if (!confirmedTxBefore) throw new Error('Transação de teste não encontrada.');

  await prisma.transaction.update({
    where: { id: confirmedTxBefore.id },
    data: {
      classificationStatus: ClassificationStatus.CONFIRMED,
      categoryId: category.id,
      nature: TransactionNature.EXPENSE,
      notes: 'Decisão manual do usuário confirmada',
    },
  });

  // 2. Tentar importar novamente o mesmo arquivo OFX
  await OfxImporterService.executeImport({
    userId: user.id,
    accountId: account.id,
    filename: 'extrato_bb_jan2025.ofx',
    fileContent: SAMPLE_VALID_OFX,
  });

  // 3. Verificar que a transação confirmada PERMANECE INTACTA no banco de dados
  const confirmedTxAfter = await prisma.transaction.findUnique({
    where: { id: confirmedTxBefore.id },
  });

  console.log(`- Categoria Após Reimportação: ${confirmedTxAfter?.categoryId} (Esperado: ${category.id})`);
  console.log(`- Status de Classificação Após Reimportação: ${confirmedTxAfter?.classificationStatus}`);

  if (
    confirmedTxAfter?.categoryId !== category.id ||
    confirmedTxAfter?.classificationStatus !== ClassificationStatus.CONFIRMED ||
    confirmedTxAfter?.notes !== 'Decisão manual do usuário confirmada'
  ) {
    throw new Error('TESTE B FALHOU: A reimportação sobrescreveu a decisão manual confirmada pelo usuário!');
  }
  console.log('✅ TESTE B PASSOU: Classificação e categoria confirmadas permaneceram 100% inalteradas.\n');

  // TESTE C: Executar Rollback DUAS VEZES (Provar que a 2ª execução não altera nada e mantém registro auditável)
  console.log('--- TESTE C: DUPLO ROLLBACK IDEMPOTENTE COM REGISTRO AUDITÁVEL ---');
  
  // 1º Rollback
  const rollback1 = await OfxImporterService.rollbackImportBatch(importResult1.batchId, user.id);
  console.log(`- 1º Rollback | Lançamentos Anulados: ${rollback1.rolledBackCount} | Status: ${rollback1.status}`);

  // 2º Rollback no mesmo lote
  const rollback2 = await OfxImporterService.rollbackImportBatch(importResult1.batchId, user.id);
  console.log(`- 2º Rollback | Lançamentos Anulados: ${rollback2.rolledBackCount} | Status: ${rollback2.status} | Já Revertido? ${rollback2.alreadyRolledBack}`);

  // Consultar o lote auditável no banco de dados
  const batchInDb = await prisma.importBatch.findUnique({ where: { id: importResult1.batchId } });

  console.log(`- Registro Auditável no Banco | Arquivo: ${batchInDb?.filename} | Status: ${batchInDb?.status} | Total Lidos: ${batchInDb?.totalRecords}`);

  if (
    rollback2.rolledBackCount !== 0 ||
    !rollback2.alreadyRolledBack ||
    batchInDb?.status !== 'ROLLED_BACK' ||
    batchInDb?.filename !== 'extrato_bb_jan2025.ofx'
  ) {
    throw new Error('TESTE C FALHOU: O segundo rollback não foi idempotente ou a auditoria do lote foi corrompida!');
  }
  console.log('✅ TESTE C PASSOU: Duplo rollback é 100% idempotente mantendo registro de auditoria completo.\n');

  // Limpeza final
  await prisma.transaction.deleteMany({ where: { accountId: account.id } });
  await prisma.importBatch.deleteMany({ where: { accountId: account.id } });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES FINAIS DA ETAPA 10 PASSARAM!      ');
  console.log('=====================================================\n');
}

runOfxTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
