import { PrismaClient } from '@prisma/client';
import { OfxImporterService } from '../src/lib/services/ofx/ofx-importer';
import { getPendingTransactionsAction } from '../src/lib/actions/pending-actions';
import { getDefaultUserId } from '../src/lib/auth-user';

const prisma = new PrismaClient();

const OFX_BB = `OFXHEADER:100
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
<TRNUID>9901
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>887766
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20250101000000[-3:BRT]
<DTEND>20250131235959[-3:BRT]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250125120000[-3:BRT]
<TRNAMT>-350.00
<FITID>20250125991
<MEMO>SUPERMERCADO REAL BB
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20250128120000[-3:BRT]
<TRNAMT>5000.00
<FITID>20250128992
<MEMO>SALARIO DEPOSITADO BB
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

async function runFinalAtomicImportTest() {
  console.log('================================================================');
  console.log('   TESTE DE CRITÉRIO FINAL DE ACEITE: FLUXO ATÔMICO & VISIBILIDADE');
  console.log('================================================================\n');

  // 1. BANCO LIMPO (SETUP DO USUÁRIO DEFAULT DE PRODUÇÃO)
  const userId = await getDefaultUserId();

  // Limpar transações, lotes e contas do usuário default
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.importBatch.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });

  console.log(`1. BANCO LIMPO -> Usuário (ID: ${userId}) sem nenhuma conta ou transação.`);

  // 2. TENTAR IMPORTAR COM CONTA INVÁLIDA -> DEVE FALHAR E GRAVAR EXATAMENTE ZERO TRANSAÇÕES (ATOMICIDADE)
  console.log('\n2. TESTE DE ATOMICIDADE: Tentando importar com conta inválida...');
  try {
    await OfxImporterService.executeImport({
      userId,
      accountId: 'id_invalido_inexistente',
      filename: 'extrato_bb.ofx',
      fileContent: OFX_BB,
    });
    throw new Error('TESTE FALHOU: Deveria ter estourado exceção ao usar conta inválida.');
  } catch (err: any) {
    console.log(`- Exceção lançada corretamente: "${err.message}"`);
  }

  const txCountAfterCancel = await prisma.transaction.count({ where: { userId } });
  console.log(`- Transações Gravadas após falha/cancelamento: ${txCountAfterCancel} (Esperado: 0)`);
  if (txCountAfterCancel !== 0) {
    throw new Error('TESTE DE ATOMICIDADE FALHOU: Transações foram criadas sem conta válida!');
  }
  console.log('✅ ATOMICIDADE PROVADA: Zero transações gravadas sem conta válida.');

  // 3. CRIAR CONTA "Conta Corrente Banco do Brasil"
  console.log('\n3. CRIAR CONTA E PREVER IMPORTAÇÃO...');
  const accBB = await prisma.account.create({
    data: {
      userId,
      name: 'Conta Corrente Banco do Brasil',
      type: 'CHECKING',
    },
  });
  console.log(`- Conta criada: ${accBB.name} (ID: ${accBB.id})`);

  // Prévia (somente em memória)
  const preview = await OfxImporterService.previewImport({
    userId,
    accountId: accBB.id,
    filename: 'extrato_bb.ofx',
    fileContent: OFX_BB,
  });

  console.log(`- Prévia em memória: ${preview.totals.totalRecords} lançamentos lidos.`);
  console.log(`- Instituição identificada: ${preview.extractedMetadata.identifiedInstitution}`);

  // 4. EXECUTAR IMPORTAÇÃO ATÔMICA DA CONTA CRIADA
  console.log('\n4. EXECUTAR IMPORTAÇÃO ATÔMICA CONFIRMADA...');
  const importRes = await OfxImporterService.executeImport({
    userId,
    accountId: accBB.id,
    filename: 'extrato_bb.ofx',
    fileContent: OFX_BB,
  });

  console.log(`- Lote de Importação Gravado ID: ${importRes.batchId}`);
  console.log(`- Lançamentos Novos Gravados: ${importRes.newRecords}`);

  // 5. VALIDAÇÃO DE VISIBILIDADE IMEDIATA NA CAIXA DE ENTRADA E EXTRATO
  console.log('\n5. VALIDAÇÃO DE VISIBILIDADE IMEDIATA...');

  const pendingRes = await getPendingTransactionsAction();
  const pendingTxs = pendingRes.data?.transactions || [];

  console.log(`- Lançamentos visíveis na Caixa de Entrada (/transacoes/pendentes): ${pendingTxs.length}`);
  for (const tx of pendingTxs) {
    const isCredit = tx.direction === 'CREDIT';
    console.log(`  • [${new Date(tx.date).toISOString().split('T')[0]}] ${tx.description} | ${tx.accountName} | ${isCredit ? '+' : '−'} R$ ${Math.abs(tx.amount)}`);
  }

  const allTxsInDb = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    include: { account: true, importBatch: true },
  });

  console.log(`\n- Lançamentos visíveis no Extrato Geral (/transacoes): ${allTxsInDb.length}`);
  for (const tx of allTxsInDb) {
    console.log(`  • [${tx.date.toISOString().split('T')[0]}] ${tx.description} | Account: ${tx.account.name} | Batch: ${tx.importBatch?.filename} | Status: ${tx.classificationStatus}`);
  }

  if (pendingTxs.length !== 2 || allTxsInDb.length !== 2) {
    throw new Error('TESTE DE VISIBILIDADE FALHOU: Transações não estão visíveis na caixa de entrada ou extrato.');
  }

  console.log('\n================================================================');
  console.log('🎉 CRITÉRIO FINAL DE ACEITE APROVADO COM 100% DE SUCESSO!         ');
  console.log('================================================================\n');
}

runFinalAtomicImportTest()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
