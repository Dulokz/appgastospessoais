export interface ParsedOfxTransaction {
  fitId?: string;
  type: 'CREDIT' | 'DEBIT' | 'OTHER';
  rawType?: string;
  date: Date;
  amount: number; // Positivo para crédito, negativo para débito
  memo?: string;
  name?: string;
  description: string;
  checkNum?: string;
  refNum?: string;
  rawText?: string;
}

export interface ParsedOfxHeader {
  bankId?: string;
  acctId?: string;
  acctType?: string;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ParsedOfxResult {
  header: ParsedOfxHeader;
  transactions: ParsedOfxTransaction[];
  parseErrors: string[];
}

/**
 * Converte datas do formato OFX (YYYYMMDDHHMMSS ou YYYYMMDD) para objeto Date
 */
export function parseOfxDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  const cleanStr = dateStr.replace(/\[.*\]/, '').trim();
  
  const year = parseInt(cleanStr.substring(0, 4), 10);
  const month = parseInt(cleanStr.substring(4, 6), 10) - 1; // 0-indexed em JS
  const day = parseInt(cleanStr.substring(6, 8), 10);
  
  let hours = 12;
  let minutes = 0;
  let seconds = 0;
  
  if (cleanStr.length >= 10) hours = parseInt(cleanStr.substring(8, 10), 10);
  if (cleanStr.length >= 12) minutes = parseInt(cleanStr.substring(10, 12), 10);
  if (cleanStr.length >= 14) seconds = parseInt(cleanStr.substring(12, 14), 10);
  
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/**
 * Extrai o valor do elemento de uma tag OFX
 */
function extractTagValue(content: string, tagName: string): string | undefined {
  const xmlRegex = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i');
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch && xmlMatch[1]) {
    return xmlMatch[1].trim();
  }

  const sgmlRegex = new RegExp(`<${tagName}>([^<\r\n]+)`, 'i');
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch && sgmlMatch[1]) {
    return sgmlMatch[1].trim();
  }

  return undefined;
}

/**
 * Parser de altíssima compatibilidade para arquivos OFX (SGML e XML).
 * Suporta múltiplos blocos BANKTRANLIST e lê 100% de todas as transações.
 */
export function parseOfxContent(ofxContentStr: string): ParsedOfxResult {
  const parseErrors: string[] = [];
  const transactions: ParsedOfxTransaction[] = [];
  const header: ParsedOfxHeader = {};

  try {
    const content = ofxContentStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    header.bankId = extractTagValue(content, 'BANKID');
    header.acctId = extractTagValue(content, 'ACCTID');
    header.acctType = extractTagValue(content, 'ACCTTYPE');
    header.currency = extractTagValue(content, 'CURDEF') || 'BRL';

    const dtStartStr = extractTagValue(content, 'DTSTART');
    if (dtStartStr) header.startDate = parseOfxDate(dtStartStr);

    const dtEndStr = extractTagValue(content, 'DTEND');
    if (dtEndStr) header.endDate = parseOfxDate(dtEndStr);

    // Divisão à prova de falhas por blocos <STMTTRN> para garantir a leitura em múltiplos extratos/seções no mesmo arquivo
    const rawBlocks = content.split(/<STMTTRN>/i).slice(1);

    rawBlocks.forEach((block, index) => {
      const trnBlock = block.split(/<\/STMTTRN>|<\/BANKTRANLIST>|<STMTTRN>/i)[0];
      if (!trnBlock || trnBlock.trim().length === 0) return;

      try {
        const rawType = extractTagValue(trnBlock, 'TRNTYPE');
        const dtPostedStr = extractTagValue(trnBlock, 'DTPOSTED');
        const trnAmtStr = extractTagValue(trnBlock, 'TRNAMT');
        const fitId = extractTagValue(trnBlock, 'FITID');
        const memo = extractTagValue(trnBlock, 'MEMO');
        const name = extractTagValue(trnBlock, 'NAME');
        const checkNum = extractTagValue(trnBlock, 'CHECKNUM') || extractTagValue(trnBlock, 'DOCUMENT');
        const refNum = extractTagValue(trnBlock, 'REFNUM');

        if (!dtPostedStr || !trnAmtStr) {
          parseErrors.push(`Lançamento #${index + 1}: Faltam campos obrigatórios (DTPOSTED ou TRNAMT). Bloco ignorado.`);
          return;
        }

        const amount = parseFloat(trnAmtStr.replace(',', '.'));
        if (isNaN(amount)) {
          parseErrors.push(`Lançamento #${index + 1}: Valor inválido "${trnAmtStr}". Bloco ignorado.`);
          return;
        }

        // Ignorar SOMENTE entradas neutras de saldo zerado (R$ 0,00)
        if (amount === 0) {
          return;
        }

        const date = parseOfxDate(dtPostedStr);

        // Ignorar datas com anos corrompidos (ex: ano 1902)
        const year = date.getUTCFullYear();
        if (year < 1990 || year > 2100) {
          parseErrors.push(`Lançamento #${index + 1}: Data inválida com ano ${year}. Bloco ignorado.`);
          return;
        }

        // Construir descrição amigável (NAME + MEMO)
        let description = '';
        if (name && memo) {
          if (name.trim() === memo.trim()) description = name.trim();
          else description = `${name.trim()} - ${memo.trim()}`;
        } else {
          description = (name || memo || 'Lançamento sem descrição').trim();
        }

        let type: 'CREDIT' | 'DEBIT' | 'OTHER' = amount >= 0 ? 'CREDIT' : 'DEBIT';
        if (rawType) {
          const upperType = rawType.toUpperCase();
          if (upperType === 'CREDIT' || upperType === 'DEP') type = 'CREDIT';
          else if (upperType === 'DEBIT' || upperType === 'PAYMENT' || upperType === 'CHECK') type = 'DEBIT';
        }

        transactions.push({
          fitId,
          type,
          rawType,
          date,
          amount,
          memo,
          name,
          description,
          checkNum,
          refNum,
          rawText: trnBlock.trim(),
        });
      } catch (err: any) {
        parseErrors.push(`Lançamento #${index + 1}: Erro ao processar bloco: ${err.message}`);
      }
    });
  } catch (err: any) {
    parseErrors.push(`Erro geral ao ler arquivo OFX: ${err.message}`);
  }

  return { header, transactions, parseErrors };
}
