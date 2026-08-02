import { db } from "@/lib/db";
import { Decimal, toDecimal } from "@/lib/decimal";
import { revalidatePath } from "next/cache";

export interface SaveInitialAccountInput {
  userId: string;
  name: string;
  type: string;
  institutionName?: string;
  initialBalance: number | Decimal;
}

export interface SaveInitialInvestmentInput {
  userId: string;
  accountId: string;
  instrumentName: string;
  instrumentType: string;
  currentValue: number | Decimal;
  quantity?: number | Decimal;
  averageCost?: number | Decimal;
}

export interface SaveInitialAssetInput {
  userId: string;
  name: string;
  category: string;
  acquisitionMode?: "FULL_OWNERSHIP" | "FINANCED" | "EQUITY_BUILDUP";
  currentValue: number | Decimal;
  acquisitionValue?: number | Decimal;
  paidEquityValue?: number | Decimal;
  notes?: string;
}

export interface SaveInitialLiabilityInput {
  userId: string;
  name: string;
  type: string;
  institution?: string;
  currentBalance: number | Decimal;
  originalValue?: number | Decimal;
  associatedAssetId?: string;
}

export interface PayLiabilityInstallmentInput {
  userId: string;
  liabilityId: string;
  sourceAccountId: string;
  totalAmount: number | Decimal;
  amortizationAmount: number | Decimal;
  interestFeeAmount?: number | Decimal;
  description?: string;
}

export interface PayEquityBuildupInstallmentInput {
  userId: string;
  assetId: string;
  sourceAccountId: string;
  installmentAmount: number | Decimal;
  description?: string;
}

export interface AddRetroactiveItemInput {
  userId: string;
  itemType: "ACCOUNT" | "INVESTMENT" | "ASSET" | "LIABILITY";
  data: any;
}

export interface CorrectInitialBalanceInput {
  userId: string;
  accountId: string;
  newInitialBalance: number | Decimal;
}

export class FinancialCommandService {
  /**
   * Registra uma Conta como Posição Inicial.
   * Saldo de Abertura (initialBalance) não gera receita no DRE.
   */
  public static async saveInitialAccount(input: SaveInitialAccountInput) {
    const { userId, name, type, institutionName, initialBalance } = input;
    const decBalance = toDecimal(initialBalance);

    return db.$transaction(async (tx) => {
      let institutionId: string | undefined;
      if (institutionName) {
        let inst = await tx.financialInstitution.findFirst({
          where: { userId, name: institutionName },
        });
        if (!inst) {
          inst = await tx.financialInstitution.create({
            data: { userId, name: institutionName },
          });
        }
        institutionId = inst.id;
      }

      const account = await tx.account.create({
        data: {
          userId,
          financialInstitutionId: institutionId,
          name: name.trim(),
          type,
          initialBalance: decBalance,
          calculatedBalance: decBalance,
          confirmedBalance: decBalance,
        },
      });

      revalidatePath("/");
      revalidatePath("/contas");
      return account;
    });
  }

  /**
   * Registra um Investimento como Posição Inicial.
   * Semântica INITIAL_POSITION: não movimenta caixa da conta e não gera aporte/receita no DRE.
   */
  public static async saveInitialInvestment(input: SaveInitialInvestmentInput) {
    const { userId, accountId, instrumentName, instrumentType, currentValue, quantity, averageCost } = input;
    const decVal = toDecimal(currentValue);

    return db.$transaction(async (tx) => {
      let instrument = await tx.instrument.findFirst({
        where: { name: instrumentName.trim() },
      });

      if (!instrument) {
        instrument = await tx.instrument.create({
          data: {
            name: instrumentName.trim(),
            instrumentType,
            source: "INITIAL_POSITION",
          },
        });
      }

      const position = await tx.investmentPosition.create({
        data: {
          userId,
          accountId,
          instrumentId: instrument.id,
          quantity: quantity ? toDecimal(quantity) : null,
          averageCost: averageCost ? toDecimal(averageCost) : decVal,
          acquisitionValue: decVal,
          currentValue: decVal,
        },
      });

      await tx.investmentEvent.create({
        data: {
          userId,
          investmentPositionId: position.id,
          accountId,
          type: "INITIAL_POSITION",
          amount: decVal,
          source: "INITIAL_POSITION",
          notes: "Posição inicial preexistente cadastrada",
        },
      });

      await tx.investmentPositionSnapshot.create({
        data: {
          investmentPositionId: position.id,
          quantity: quantity ? toDecimal(quantity) : null,
          currentValue: decVal,
          source: "INITIAL_POSITION",
        },
      });

      revalidatePath("/");
      revalidatePath("/investimentos");
      revalidatePath("/meu-patrimonio");
      return position;
    });
  }

  /**
   * Registra um Bem Preexistente (Imóvel, Veículo, Equipamento, Cota Capital ou Aquisição Parcelada).
   * Semântica INITIAL_POSITION: 0 efeito no DRE do mês.
   */
  public static async saveInitialAsset(input: SaveInitialAssetInput) {
    const { userId, name, category, acquisitionMode = "FULL_OWNERSHIP", currentValue, acquisitionValue, paidEquityValue, notes } = input;
    const decCurrent = toDecimal(currentValue);
    const decAcq = acquisitionValue ? toDecimal(acquisitionValue) : decCurrent;
    const decPaidEquity = paidEquityValue ? toDecimal(paidEquityValue) : (acquisitionMode === "EQUITY_BUILDUP" ? decCurrent : null);

    return db.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          userId,
          name: name.trim(),
          category,
          entryMethod: "INITIAL_POSITION",
          acquisitionMode,
          acquisitionValue: decAcq,
          paidEquityValue: decPaidEquity,
          currentValue: decCurrent,
          notes,
          valuations: {
            create: [{ value: decCurrent, source: "INITIAL_POSITION", notes: "Avaliação inicial" }],
          },
        },
      });

      revalidatePath("/");
      revalidatePath("/patrimonio");
      revalidatePath("/meu-patrimonio");
      return asset;
    });
  }

  /**
   * Registra um Passivo/Dívida Preexistente.
   * Semântica INITIAL_POSITION: 0 despesa gerada.
   */
  public static async saveInitialLiability(input: SaveInitialLiabilityInput) {
    const { userId, name, type, institution, currentBalance, originalValue, associatedAssetId } = input;
    const decBalance = toDecimal(currentBalance);
    const decOriginal = originalValue ? toDecimal(originalValue) : decBalance;

    return db.$transaction(async (tx) => {
      const liability = await tx.liability.create({
        data: {
          userId,
          name: name.trim(),
          type,
          institution,
          originalValue: decOriginal,
          currentBalance: decBalance,
          associatedAssetId: associatedAssetId || null,
          isInitialPosition: true,
        },
      });

      revalidatePath("/");
      revalidatePath("/dividas");
      revalidatePath("/meu-patrimonio");
      return liability;
    });
  }

  /**
   * Pagamento de Parcela de Financiamento (MODELO A).
   * Separa rigidamente:
   * - Amortização (LIABILITY_REDUCTION): reduz o saldo devedor e aumenta o Equity. Não entra no DRE de despesas.
   * - Juros e Tarifas (EXPENSE / INTEREST / FEE): entra como despesa no DRE.
   */
  public static async payLiabilityInstallment(input: PayLiabilityInstallmentInput) {
    const { userId, liabilityId, sourceAccountId, totalAmount, amortizationAmount, interestFeeAmount, description } = input;
    const decTotal = toDecimal(totalAmount);
    const decAmort = toDecimal(amortizationAmount);
    const decInterest = interestFeeAmount ? toDecimal(interestFeeAmount) : decTotal.sub(decAmort);

    if (decAmort.add(decInterest).gt(decTotal)) {
      throw new Error("A soma da amortização e juros não pode exceder o valor total da parcela.");
    }

    return db.$transaction(async (tx) => {
      const liability = await tx.liability.findFirst({
        where: { id: liabilityId, userId },
      });
      if (!liability) throw new Error("Passivo não encontrado.");

      const sourceAcc = await tx.account.findFirst({
        where: { id: sourceAccountId, userId },
      });
      if (!sourceAcc) throw new Error("Conta bancária de pagamento não encontrada.");

      // 1. Criar Transação de Pagamento de Passivo
      const allocationsData: any[] = [];

      if (decAmort.gt(0)) {
        allocationsData.push({
          allocationType: "LIABILITY_REDUCTION",
          amount: decAmort,
          liabilityId: liability.id,
        });
      }

      if (decInterest.gt(0)) {
        allocationsData.push({
          allocationType: "INTEREST",
          amount: decInterest,
          liabilityId: liability.id,
        });
      }

      const txRecord = await tx.transaction.create({
        data: {
          userId,
          accountId: sourceAccountId,
          amount: decTotal,
          direction: "DEBIT",
          transactionType: "LIABILITY_PAYMENT",
          description: description || `Pagamento de Parcela: ${liability.name}`,
          source: "MANUAL",
          allocations: {
            create: allocationsData,
          },
        },
      });

      // 2. Reduzir Saldo Devedor da Dívida em Amortização
      await tx.liability.update({
        where: { id: liabilityId },
        data: {
          currentBalance: { decrement: decAmort },
        },
      });

      // 3. Debitar Caixa da Conta Bancária
      await tx.account.update({
        where: { id: sourceAccountId },
        data: {
          calculatedBalance: { decrement: decTotal },
        },
      });

      revalidatePath("/");
      revalidatePath("/dividas");
      revalidatePath("/contas");
      revalidatePath("/resultado-mes");
      revalidatePath("/meu-patrimonio");
      return txRecord;
    });
  }

  /**
   * Pagamento de Parcela de Aquisição Parcelada / Integralização (`EQUITY_BUILDUP` - MODELO B).
   * Regra estrita:
   * - Debita a Conta em R$ N.
   * - Aumenta `paidEquityValue` do Ativo em R$ N.
   * - 0 despesa de consumo no DRE.
   * - Patrimônio Líquido inalterado no momento do pagamento (apenas troca de caixa por equity do ativo).
   */
  public static async payEquityBuildupInstallment(input: PayEquityBuildupInstallmentInput) {
    const { userId, assetId, sourceAccountId, installmentAmount, description } = input;
    const decAmount = toDecimal(installmentAmount);

    return db.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id: assetId, userId },
      });
      if (!asset) throw new Error("Ativo não encontrado.");

      const sourceAcc = await tx.account.findFirst({
        where: { id: sourceAccountId, userId },
      });
      if (!sourceAcc) throw new Error("Conta bancária não encontrada.");

      // 1. Criar Transação de Aumento de Ativo
      const txRecord = await tx.transaction.create({
        data: {
          userId,
          accountId: sourceAccountId,
          amount: decAmount,
          direction: "DEBIT",
          transactionType: "ASSET_PURCHASE",
          description: description || `Integralização de Parcela: ${asset.name}`,
          source: "MANUAL",
          allocations: {
            create: [
              {
                allocationType: "ASSET_INCREASE",
                amount: decAmount,
                assetId: asset.id,
              },
            ],
          },
        },
      });

      // 2. Incrementar paidEquityValue no Ativo
      const currentPaid = asset.paidEquityValue ? toDecimal(asset.paidEquityValue) : new Decimal(0);
      await tx.asset.update({
        where: { id: assetId },
        data: {
          paidEquityValue: currentPaid.add(decAmount),
        },
      });

      // 3. Debitar Caixa da Conta
      await tx.account.update({
        where: { id: sourceAccountId },
        data: {
          calculatedBalance: { decrement: decAmount },
        },
      });

      revalidatePath("/");
      revalidatePath("/patrimonio");
      revalidatePath("/contas");
      revalidatePath("/resultado-mes");
      revalidatePath("/meu-patrimonio");
      return txRecord;
    });
  }

  /**
   * Adicionar Item Esquecido Retroativamente.
   * Adiciona um item preexistente como Posição Inicial na Data-Base do Controle (controlStartDate).
   * Regra fundamental: Atualiza a posição inicial e o snapshot de abertura, gerando R$ 0 de variação/receita na data atual.
   */
  public static async addRetroactiveInitialItem(input: AddRetroactiveItemInput) {
    const { userId, itemType, data } = input;

    return db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user) throw new Error("Usuário não encontrado.");

      let createdItem: any;

      if (itemType === "ACCOUNT") {
        const decBalance = toDecimal(data.initialBalance);
        createdItem = await tx.account.create({
          data: {
            userId,
            name: data.name,
            type: data.type,
            initialBalance: decBalance,
            calculatedBalance: decBalance,
            confirmedBalance: decBalance,
          },
        });
      } else if (itemType === "INVESTMENT") {
        const decVal = toDecimal(data.currentValue);
        let instrument = await tx.instrument.findFirst({
          where: { name: data.instrumentName },
        });

        if (!instrument) {
          instrument = await tx.instrument.create({
            data: {
              name: data.instrumentName,
              instrumentType: data.instrumentType,
              source: "INITIAL_POSITION",
            },
          });
        }

        createdItem = await tx.investmentPosition.create({
          data: {
            userId,
            accountId: data.accountId,
            instrumentId: instrument.id,
            acquisitionValue: decVal,
            currentValue: decVal,
          },
        });

        await tx.investmentEvent.create({
          data: {
            userId,
            investmentPositionId: createdItem.id,
            accountId: data.accountId,
            type: "INITIAL_POSITION",
            amount: decVal,
            source: "INITIAL_POSITION",
            notes: "Item esquecido adicionado retroativamente",
          },
        });
      } else if (itemType === "ASSET") {
        const decVal = toDecimal(data.currentValue);
        createdItem = await tx.asset.create({
          data: {
            userId,
            name: data.name,
            category: data.category,
            entryMethod: "INITIAL_POSITION",
            acquisitionMode: data.acquisitionMode || "FULL_OWNERSHIP",
            acquisitionValue: decVal,
            currentValue: decVal,
            notes: "Item esquecido adicionado retroativamente",
          },
        });
      } else if (itemType === "LIABILITY") {
        const decVal = toDecimal(data.currentBalance);
        createdItem = await tx.liability.create({
          data: {
            userId,
            name: data.name,
            type: data.type,
            originalValue: decVal,
            currentBalance: decVal,
            isInitialPosition: true,
          },
        });
      }

      revalidatePath("/");
      revalidatePath("/meu-patrimonio");
      return createdItem;
    });
  }

  /**
   * Correção do Saldo Inicial de uma Conta.
   * Ajusta `initialBalance` e o saldo acumulado sem criar receita/despesa artificial no DRE.
   */
  public static async correctInitialBalance(input: CorrectInitialBalanceInput) {
    const { userId, accountId, newInitialBalance } = input;
    const decNew = toDecimal(newInitialBalance);

    return db.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) throw new Error("Conta não encontrada.");

      const oldInitial = toDecimal(account.initialBalance);
      const diff = decNew.sub(oldInitial);

      const updated = await tx.account.update({
        where: { id: accountId },
        data: {
          initialBalance: decNew,
          calculatedBalance: { increment: diff },
          confirmedBalance: decNew,
        },
      });

      revalidatePath("/");
      revalidatePath("/contas");
      revalidatePath("/meu-patrimonio");
      return updated;
    });
  }
}
