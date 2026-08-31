import {
  PrismaClient,
  OnboardingStatus,
  TransactionOrigin,
  TransactionPeriodType,
  TransactionNature,
  ClassificationStatus,
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

export interface InitialAccountSetup {
  accountId?: string;
  name: string;
  type: string; // CHECKING, SAVINGS, BROKERAGE, CASH, CREDIT_CARD
  initialBalance: number;
  institutionName?: string;
}

export interface InitialAssetSetup {
  assetId?: string;
  name: string;
  category: string; // REAL_ESTATE, VEHICLE, EQUIPMENT, OTHER
  acquisitionValue: number;
  currentValue: number;
}

export interface InitialLiabilitySetup {
  liabilityId?: string;
  name: string;
  type: string; // MORTGAGE, VEHICLE_LOAN, PERSONAL_LOAN, OTHER
  originalValue: number;
  currentBalance: number;
}

export interface SetupOnboardingInput {
  userId: string;
  controlStartDate: Date; // Data-base de início do controle financeiro
  onboardingPath: 'MANUAL' | 'IMPORT';
  initialAccounts?: InitialAccountSetup[];
  initialAssets?: InitialAssetSetup[];
  initialLiabilities?: InitialLiabilitySetup[];
}

export class OnboardingEngine {
  /**
   * Executa o setup de onboarding de forma IDEMPOTENTE com edição e versionamento seguro da posição inicial
   */
  static async setupOnboarding(params: SetupOnboardingInput) {
    const {
      userId,
      controlStartDate,
      onboardingPath,
      initialAccounts = [],
      initialAssets = [],
      initialLiabilities = [],
    } = params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuário não encontrado.');

    return await prisma.$transaction(async (txDb) => {
      // 1. Atualizar Data-Base de Análise e Status do Usuário
      await txDb.user.update({
        where: { id: userId },
        data: {
          controlStartDate,
          onboardingStatus: OnboardingStatus.COMPLETED,
          onboardingCompletedAt: new Date(),
        },
      });

      // 2. Processar Contas e Saldo Inicial OPENING_BALANCE de forma Idempotente
      for (const accData of initialAccounts) {
        let instId: string | null = null;
        if (accData.institutionName) {
          let inst = await txDb.financialInstitution.findFirst({
            where: { userId, name: accData.institutionName },
          });
          if (!inst) {
            inst = await txDb.financialInstitution.create({
              data: { userId, name: accData.institutionName, type: 'BANK' },
            });
          }
          instId = inst.id;
        }

        let account;
        if (accData.accountId) {
          account = await txDb.account.update({
            where: { id: accData.accountId },
            data: {
              name: accData.name,
              type: accData.type,
              financialInstitutionId: instId,
              initialBalance: new Prisma.Decimal(accData.initialBalance),
            },
          });
        } else {
          account = await txDb.account.create({
            data: {
              userId,
              financialInstitutionId: instId,
              name: accData.name,
              type: accData.type,
              initialBalance: new Prisma.Decimal(accData.initialBalance),
              calculatedBalance: new Prisma.Decimal(accData.initialBalance),
            },
          });
        }

        // Idempotência do Lançamento de Saldo de Abertura (OPENING_BALANCE)
        const existingOpeningTx = await txDb.transaction.findFirst({
          where: {
            userId,
            accountId: account.id,
            origin: TransactionOrigin.OPENING_BALANCE,
            deletedAt: null,
          },
        });

        if (existingOpeningTx) {
          await txDb.transaction.update({
            where: { id: existingOpeningTx.id },
            data: {
              date: controlStartDate,
              competenceDate: controlStartDate,
              amount: new Prisma.Decimal(accData.initialBalance),
              direction: accData.initialBalance >= 0 ? 'CREDIT' : 'DEBIT',
              nature: accData.initialBalance >= 0 ? TransactionNature.INCOME : TransactionNature.EXPENSE,
            },
          });
        } else if (accData.initialBalance !== 0) {
          const isPositive = accData.initialBalance > 0;
          await txDb.transaction.create({
            data: {
              userId,
              accountId: account.id,
              date: controlStartDate,
              competenceDate: controlStartDate,
              amount: new Prisma.Decimal(accData.initialBalance),
              direction: isPositive ? 'CREDIT' : 'DEBIT',
              description: 'SALDO DE ABERTURA - POSIÇÃO INICIAL',
              originalDescription: 'SALDO DE ABERTURA - POSIÇÃO INICIAL',
              transactionType: isPositive ? 'INCOME' : 'EXPENSE',
              nature: isPositive ? TransactionNature.INCOME : TransactionNature.EXPENSE,
              origin: TransactionOrigin.OPENING_BALANCE,
              periodType: TransactionPeriodType.OPENING_BALANCE,
              source: 'MANUAL',
              classificationStatus: ClassificationStatus.CONFIRMED,
            },
          });
        }
      }

      // 3. Processar Bens
      for (const astData of initialAssets) {
        if (astData.assetId) {
          await txDb.asset.update({
            where: { id: astData.assetId },
            data: {
              name: astData.name,
              category: astData.category,
              acquisitionValue: new Prisma.Decimal(astData.acquisitionValue),
              currentValue: new Prisma.Decimal(astData.currentValue),
            },
          });
        } else {
          await txDb.asset.create({
            data: {
              userId,
              name: astData.name,
              category: astData.category,
              entryMethod: 'INITIAL_POSITION',
              acquisitionDate: controlStartDate,
              acquisitionValue: new Prisma.Decimal(astData.acquisitionValue),
              currentValue: new Prisma.Decimal(astData.currentValue),
              considerInNetWorth: true,
            },
          });
        }
      }

      // 4. Processar Dívidas
      for (const liabData of initialLiabilities) {
        if (liabData.liabilityId) {
          await txDb.liability.update({
            where: { id: liabData.liabilityId },
            data: {
              name: liabData.name,
              type: liabData.type,
              originalValue: new Prisma.Decimal(liabData.originalValue),
              currentBalance: new Prisma.Decimal(liabData.currentBalance),
            },
          });
        } else {
          await txDb.liability.create({
            data: {
              userId,
              name: liabData.name,
              type: liabData.type,
              originalValue: new Prisma.Decimal(liabData.originalValue),
              currentBalance: new Prisma.Decimal(liabData.currentBalance),
              startDate: controlStartDate,
              isInitialPosition: true,
            },
          });
        }
      }

      return {
        success: true,
        controlStartDate,
        onboardingPath,
      };
    });
  }

  /**
   * Atualiza a data-base de análise do usuário
   */
  static async updateControlStartDate(userId: string, newDate: Date) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { controlStartDate: newDate },
    });

    return user;
  }

  /**
   * Obtém o estado real do onboarding do usuário com a REGRA DE RECUPERAÇÃO:
   * Se o usuário possui 0 contas ativas, needsOnboarding é SEMPRE true!
   */
  static async getOnboardingState(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        controlStartDate: true,
        onboardingStatus: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
      },
    });

    const activeAccountsCount = await prisma.account.count({
      where: { userId, active: true, deletedAt: null },
    });

    // REGRA DE RECUPERAÇÃO: Se 0 contas ativas, o onboarding é OBRIGATÓRIO (needsOnboarding = true)
    const needsOnboarding = activeAccountsCount === 0;

    return {
      user,
      activeAccountsCount,
      needsOnboarding,
    };
  }
}
