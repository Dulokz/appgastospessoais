import { PrismaClient, TransactionOrigin } from '@prisma/client';
import { OfxImporterService } from '../src/lib/services/ofx/ofx-importer';
import { getPendingTransactionsAction } from '../src/lib/actions/pending-actions';

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
<TRNTYPE>DEBIT
<DTPOSTED>20250130120000[-3:BRT]
<TRNAMT>-129.90
<FITID>20250130001
<MEMO>SHPP BRASIL INSTITUICAO DE PAGAMENTO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const OFX_SICOOB = `OFXHEADER:100
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
<TRNUID>1002
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>756
<ACCTID>987654
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20250101000000[-3:BRT]
<DTEND>20250131235959[-3:BRT]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20250131120000[-3:BRT]
<TRNAMT>2500.00
<FITID>20250131002
<MEMO>PIX RECEBIDO CLIENTE SICOOB
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

async function runOfxInboxAcceptanceTest() {
  console.log('================================================================');
  console.log('   TESTE DE CRITÉRIO DE ACEITE: IMPORTAÇÃO OFX & TRIAGEM        ');
  console.log('================================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { name: 'Usuário Principal', email: 'user@domain.com' } });
  }

  // 1. Criar Contas de Destino para Banco do Brasil e Sicoob
  let accBB = await prisma.account.findFirst({ where: { userId: user.id, name: 'Conta Corrente Banco do Brasil' } });
  if (!accBB) {
    accBB = await prisma.account.create({
      data: { userId: user.id, name: 'Conta Corrente Banco do Brasil', type: 'CHECKING' },
    });
  }

  let accSicoob = await prisma.account.findFirst({ where: { userId: user.id, name: 'Conta Corrente Sicoob' } });
  if (!accSicoob) {
    accSicoob = await prisma.account.create({
      data: { userId: user.id, name: 'Conta Corrente Sicoob', type: 'CHECKING' },
    });
  }

  // Limpeza prévia nas contas
  await prisma.transaction.deleteMany({ where: { accountId: { in: [accBB.id, accSicoob.id] } } });
  await prisma.importBatch.deleteMany({ where: { accountId: { in: [accBB.id, accSicoob.id] } } });

  console.log(`[SETUP] Contas Criadas: ${accBB.name} e ${accSicoob.name}`);

  // 2. PRÉVIA & TESTE DE DIVERGÊNCIA DE INSTITUIÇÃO
  console.log('\n--- 2. PRÉVIA E VALIDAÇÃO DE METADADOS EXTRAÍDOS ---');
  const previewBB = await OfxImporterService.previewImport({
    userId: user.id,
    accountId: accBB.id,
    filename: 'extrato_bb.ofx',
    fileContent: OFX_BB,
  });

  console.log(`- Instituição Identificada no OFX BB: ${previewBB.extractedMetadata.identifiedInstitution}`);
  console.log(`- Conta Mascarada: ${previewBB.extractedMetadata.maskedAccount}`);
  console.log(`- Amostra de Prévia (Primeira Transação): ${previewBB.sampleTransactions[0].description} | R$ ${previewBB.sampleTransactions[0].amount}`);

  if (previewBB.extractedMetadata.identifiedInstitution !== 'Banco do Brasil') {
    throw new Error('TESTE FALHOU: Instituição do OFX BB não foi identificada corretamente.');
  }

  // Testar alerta de divergência ao tentar importar OFX do Sicoob na conta do BB
  const previewDivergence = await OfxImporterService.previewImport({
    userId: user.id,
    accountId: accBB.id, // Conta do BB selecionada erroneamente para arquivo do Sicoob
    filename: 'extrato_sicoob.ofx',
    fileContent: OFX_SICOOB,
  });

  console.log(`- Alerta de Divergência Ativado para Sicoob -> BB? ${previewDivergence.extractedMetadata.isInstitutionDivergent ? 'SIM' : 'NÃO'}`);
  if (!previewDivergence.extractedMetadata.isInstitutionDivergent) {
    throw new Error('TESTE FALHOU: Alerta de divergência de instituição não foi acionado.');
  }
  console.log('✅ Alerta forte de divergência validado com sucesso.');

  // 3. EXECUÇÃO DA IMPORTAÇÃO CONFIRMADA EM CADA CONTA DE DESTINO
  console.log('\n--- 3. EXECUTAR IMPORTAÇÃO DOS DOIS EXTRATOS (BB & SICOOB) ---');
  const importBB = await OfxImporterService.executeImport({
    userId: user.id,
    accountId: accBB.id,
    filename: 'extrato_bb.ofx',
    fileContent: OFX_BB,
  });

  const importSicoob = await OfxImporterService.executeImport({
    userId: user.id,
    accountId: accSicoob.id,
    filename: 'extrato_sicoob.ofx',
    fileContent: OFX_SICOOB,
  });

  console.log(`- Lote BB Importado: ${importBB.newRecords} lançamento(s)`);
  console.log(`- Lote Sicoob Importado: ${importSicoob.newRecords} lançamento(s)`);

  // 4. CONSULTAR TRIAGEM DA CAIXA DE ENTRADA FINANCEIRA (/transacoes/pendentes)
  console.log('\n--- 4. CONSULTA DA CAIXA DE ENTRADA FINANCEIRA (/transacoes/pendentes) ---');
  const inboxRes = await getPendingTransactionsAction();
  if (!inboxRes.success || !inboxRes.data) throw new Error('Falha ao buscar dados da caixa de entrada.');

  const inboxData = inboxRes.data;
  console.log(`- Total Pendentes na Fila: ${inboxData.summary.totalPending}`);
  
  for (const tx of inboxData.transactions) {
    const isCredit = tx.direction === 'CREDIT';
    const dateStr = new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    console.log(`  • ${dateStr} • ${isCredit ? 'Entrada' : 'Saída'}`);
    console.log(`    Descrição: ${tx.originalDescription || tx.description}`);
    console.log(`    Origem: ${tx.accountName} • Importado do extrato (OFX)`);
    console.log(`    VALOR PROEMINENTE: ${isCredit ? '+' : '−'} R$ ${Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`    Status: [Não classificado]\n`);
  }

  if (inboxData.summary.totalPending < 2) {
    throw new Error('TESTE FALHOU: Transações não aparecem na Caixa de Entrada.');
  }

  console.log('================================================================');
  console.log('🎉 CRITÉRIO DE ACEITE DE IMPORTAÇÃO & TRIAGEM APROVADO!          ');
  console.log('================================================================\n');
}

runOfxInboxAcceptanceTest()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
