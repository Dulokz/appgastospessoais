import {
  PrismaClient,
  ClassificationRule,
  TransactionNature,
  ClassificationStatus,
  RuleMatchType,
  Transaction,
} from '@prisma/client';

const prisma = new PrismaClient();

export interface ApplyRulesOptions {
  overrideConfirmed?: boolean; // Padrão: false (nunca sobrescreve decisão manual sem autorização)
}

export interface RuleExecutionResult {
  transactionId: string;
  matchedRuleId: string | null;
  ruleName: string | null;
  nature: TransactionNature;
  categoryId: string | null;
  subcategoryId: string | null;
  counterpartyName: string | null;
  assetId: string | null;
  liabilityId: string | null;
  applied: boolean;
  skippedReason?: string;
}

export class ClassificationRuleEngine {
  /**
   * Valida sintaxe e limitações de segurança de uma expressão REGEX
   */
  static validateRegexPattern(pattern: string): void {
    if (!pattern || pattern.trim().length === 0) {
      throw new Error('Padrão REGEX não pode ser vazio.');
    }
    if (pattern.length > 250) {
      throw new Error('Padrão REGEX excede o limite máximo de 250 caracteres por segurança.');
    }
    try {
      new RegExp(pattern, 'i');
    } catch (e: any) {
      throw new Error(`Padrão REGEX inválido: ${e.message}`);
    }
  }

  /**
   * Valida a coerência hierárquica entre Categoria e Subcategoria
   */
  static async validateCategoryCoherence(categoryId?: string | null, subcategoryId?: string | null): Promise<void> {
    if (!categoryId || !subcategoryId) return;

    const subcategory = await prisma.category.findFirst({
      where: { id: subcategoryId },
    });

    if (!subcategory) {
      throw new Error(`Subcategoria de ID ${subcategoryId} não encontrada.`);
    }

    if (subcategory.parentId !== categoryId) {
      throw new Error(`A subcategoria "${subcategory.name}" não pertence à categoria selecionada.`);
    }
  }

  /**
   * Testa se um texto atende ao critério de match da regra
   */
  static matchesValue(text: string, matchType: RuleMatchType, matchValue: string): boolean {
    if (!text || !matchValue) return false;

    const normalizedText = text.trim().toLowerCase();
    const normalizedValue = matchValue.trim().toLowerCase();

    switch (matchType) {
      case RuleMatchType.EXACT:
        return normalizedText === normalizedValue;
      case RuleMatchType.STARTS_WITH:
        return normalizedText.startsWith(normalizedValue);
      case RuleMatchType.REGEX:
        try {
          this.validateRegexPattern(matchValue);
          const regex = new RegExp(matchValue, 'i');
          return regex.test(text);
        } catch (e) {
          return false;
        }
      case RuleMatchType.CONTAINS:
      default:
        return normalizedText.includes(normalizedValue);
    }
  }

  /**
   * Avalia se uma transação é elegível e corresponde a uma regra
   */
  static findMatchingRule(
    transaction: Pick<
      Transaction,
      | 'accountId'
      | 'direction'
      | 'description'
      | 'originalDescription'
      | 'deletedAt'
      | 'classificationStatus'
      | 'transferPairId'
      | 'creditCardId'
      | 'assetId'
      | 'liabilityId'
      | 'nature'
    >,
    rules: ClassificationRule[],
    isRetroactive: boolean = false
  ): ClassificationRule | null {
    // 1. Exclusões de Segurança Retroativa
    if (isRetroactive) {
      if (transaction.deletedAt) return null;
      if (transaction.classificationStatus === ClassificationStatus.FLAGGED_DUPLICATE) return null;
      if (transaction.transferPairId) return null;
    }

    const textToMatch = transaction.originalDescription || transaction.description;

    for (const rule of rules) {
      if (!rule.isActive) continue;

      // Restrições de Conta e Direção
      if (rule.accountId && rule.accountId !== transaction.accountId) continue;
      if (rule.direction && rule.direction !== transaction.direction) continue;

      // Se a transação já estiver vinculada a cartão, investimento, ativo ou dívida,
      // a regra só se aplica se for uma regra criada EXPLICITAMENTE para ativo/passivo
      const hasSpecialLink =
        transaction.creditCardId ||
        transaction.assetId ||
        transaction.liabilityId ||
        (
          [
            TransactionNature.CREDIT_CARD_PURCHASE,
            TransactionNature.CREDIT_CARD_PAYMENT,
            TransactionNature.INVESTMENT_CONTRIBUTION,
            TransactionNature.INVESTMENT_REDEMPTION,
            TransactionNature.ASSET_ACQUISITION,
            TransactionNature.DEBT_PRINCIPAL,
            TransactionNature.DEBT_INTEREST,
          ] as TransactionNature[]
        ).includes(transaction.nature);

      if (hasSpecialLink && !rule.assetId && !rule.liabilityId) {
        continue; // Ignorar regra genérica em transação especial
      }

      if (this.matchesValue(textToMatch, rule.matchType, rule.matchValue)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Aplica regras em uma transação com auditoria completa e proteção de confirmações manuais
   */
  static async classifyTransaction(
    transactionId: string,
    userId: string,
    options: ApplyRulesOptions = {}
  ): Promise<RuleExecutionResult> {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
    });

    if (!tx) {
      throw new Error(`Transação de ID ${transactionId} não encontrada.`);
    }

    // overrideConfirmed = true só é ativado por ação manual e explícita
    if (tx.classificationStatus === ClassificationStatus.CONFIRMED && !options.overrideConfirmed) {
      return {
        transactionId: tx.id,
        matchedRuleId: null,
        ruleName: null,
        nature: tx.nature,
        categoryId: tx.categoryId,
        subcategoryId: tx.subcategoryId,
        counterpartyName: tx.counterpartyName,
        assetId: tx.assetId,
        liabilityId: tx.liabilityId,
        applied: false,
        skippedReason: 'Transação confirmada manualmente mantida protegida (overrideConfirmed = false).',
      };
    }

    const rules = await prisma.classificationRule.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    const matchedRule = this.findMatchingRule(tx, rules, false);

    if (!matchedRule) {
      return {
        transactionId: tx.id,
        matchedRuleId: null,
        ruleName: null,
        nature: tx.nature,
        categoryId: tx.categoryId,
        subcategoryId: tx.subcategoryId,
        counterpartyName: tx.counterpartyName,
        assetId: tx.assetId,
        liabilityId: tx.liabilityId,
        applied: false,
        skippedReason: 'Nenhuma regra atendeu aos critérios.',
      };
    }

    // Validação de coerência entre Categoria e Subcategoria da regra
    await this.validateCategoryCoherence(matchedRule.categoryId, matchedRule.subcategoryId);

    // Registro de Auditoria no campo notes
    const auditNote = `[AUDIT_RULE:${matchedRule.id}|ORIGIN:RULE|PREV_NATURE:${tx.nature}|PREV_STATUS:${tx.classificationStatus}]`;
    const newNotes = tx.notes ? `${tx.notes} ${auditNote}` : auditNote;

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        nature: matchedRule.nature || tx.nature,
        categoryId: matchedRule.categoryId || tx.categoryId,
        subcategoryId: matchedRule.subcategoryId || tx.subcategoryId,
        counterpartyName: matchedRule.counterparty || tx.counterpartyName,
        assetId: matchedRule.assetId || tx.assetId,
        liabilityId: matchedRule.liabilityId || tx.liabilityId,
        classificationStatus: ClassificationStatus.AUTO_MATCHED,
        classificationRuleId: matchedRule.id,
        classificationConfidence: 1.0,
        notes: newNotes,
      },
    });

    return {
      transactionId: updated.id,
      matchedRuleId: matchedRule.id,
      ruleName: matchedRule.name,
      nature: updated.nature,
      categoryId: updated.categoryId,
      subcategoryId: updated.subcategoryId,
      counterpartyName: updated.counterpartyName,
      assetId: updated.assetId,
      liabilityId: updated.liabilityId,
      applied: true,
    };
  }

  /**
   * Processa em lote as transações pendentes excluindo automaticamente anulados, pareados e especiais
   */
  static async classifyAllPendingTransactions(
    userId: string,
    options: ApplyRulesOptions = {}
  ): Promise<{ totalProcessed: number; autoMatchedCount: number }> {
    // overrideConfirmed = true NUNCA é acionado por processamento automático em lote
    const safeOptions: ApplyRulesOptions = { overrideConfirmed: false };

    const pendingTxs = await prisma.transaction.findMany({
      where: {
        userId,
        classificationStatus: { in: [ClassificationStatus.PENDING] },
        deletedAt: null,
        transferPairId: null,
      },
    });

    const rules = await prisma.classificationRule.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    let autoMatchedCount = 0;

    for (const tx of pendingTxs) {
      const matched = this.findMatchingRule(tx, rules, true);
      if (matched) {
        const res = await this.classifyTransaction(tx.id, userId, safeOptions);
        if (res.applied) autoMatchedCount++;
      }
    }

    return {
      totalProcessed: pendingTxs.length,
      autoMatchedCount,
    };
  }

  /**
   * Retorna a contagem prévia de quantas pendências serão afetadas por uma regra antes de confirmá-la
   */
  static async countMatchingPendingTransactions(
    userId: string,
    ruleParams: {
      accountId?: string;
      direction?: 'CREDIT' | 'DEBIT';
      matchType?: RuleMatchType;
      matchValue: string;
      assetId?: string;
      liabilityId?: string;
    }
  ): Promise<number> {
    const {
      accountId,
      direction,
      matchType = RuleMatchType.CONTAINS,
      matchValue,
      assetId,
      liabilityId,
    } = ruleParams;

    const pendingTxs = await prisma.transaction.findMany({
      where: {
        userId,
        classificationStatus: ClassificationStatus.PENDING,
        deletedAt: null,
        transferPairId: null,
        ...(accountId ? { accountId } : {}),
        ...(direction ? { direction } : {}),
      },
    });

    // Simular filtro de regra
    const dummyRule: any = {
      id: 'preview_temp',
      isActive: true,
      accountId: accountId || null,
      direction: direction || null,
      matchType,
      matchValue,
      assetId: assetId || null,
      liabilityId: liabilityId || null,
      priority: 1,
    };

    let count = 0;
    for (const tx of pendingTxs) {
      if (this.findMatchingRule(tx, [dummyRule], true)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Cria uma nova regra e permite visualização prévia antes de aplicar
   */
  static async createRuleAndApply(params: {
    userId: string;
    name?: string;
    accountId?: string;
    direction?: 'CREDIT' | 'DEBIT';
    matchType?: RuleMatchType;
    matchValue: string;
    nature?: TransactionNature;
    categoryId?: string;
    subcategoryId?: string;
    counterparty?: string;
    assetId?: string;
    liabilityId?: string;
    priority?: number;
    applyToExistingPending?: boolean;
  }): Promise<{ rule: ClassificationRule; affectedCount: number }> {
    const {
      userId,
      name,
      accountId,
      direction,
      matchType = RuleMatchType.CONTAINS,
      matchValue,
      nature,
      categoryId,
      subcategoryId,
      counterparty,
      assetId,
      liabilityId,
      priority = 100,
      applyToExistingPending = true,
    } = params;

    // 1. Validar REGEX se aplicável
    if (matchType === RuleMatchType.REGEX) {
      this.validateRegexPattern(matchValue);
    }

    // 2. Validar coerência de categoria/subcategoria
    await this.validateCategoryCoherence(categoryId, subcategoryId);

    // 3. Criar a regra
    const rule = await prisma.classificationRule.create({
      data: {
        userId,
        name: name || `Regra: ${matchValue}`,
        accountId: accountId || null,
        direction: direction || null,
        matchType,
        matchValue,
        nature: nature || null,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        counterparty: counterparty || null,
        assetId: assetId || null,
        liabilityId: liabilityId || null,
        priority,
        isActive: true,
      },
    });

    let affectedCount = 0;

    if (applyToExistingPending) {
      const result = await this.classifyAllPendingTransactions(userId, { overrideConfirmed: false });
      affectedCount = result.autoMatchedCount;
    }

    return { rule, affectedCount };
  }
}
