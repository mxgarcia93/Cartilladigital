import { PrismaClient, type Prisma } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function toNumber(value: Prisma.Decimal): number {
  return Number(value);
}

export class PrismaMonthlyBalanceRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    openingBalance: number;
    quotaAmount: number;
    executedAmount: number;
    closingBalance: number;
    currency: string;
    lastExpenseDate: Date | null;
    recalculatedAt: Date | null;
    updatedAt: Date;
  } | null> {
    const balance = await this.db.monthlyBalance.findUnique({
      where: {
        collaboratorId_year_month: {
          collaboratorId: input.collaboratorId,
          year: input.year,
          month: input.month,
        },
      },
    });

    if (!balance) {
      return null;
    }

    return {
      id: balance.id,
      collaboratorId: balance.collaboratorId,
      year: balance.year,
      month: balance.month,
      openingBalance: toNumber(balance.openingBalance),
      quotaAmount: toNumber(balance.quotaAmount),
      executedAmount: toNumber(balance.executedAmount),
      closingBalance: toNumber(balance.closingBalance),
      currency: balance.currency,
      lastExpenseDate: balance.lastExpenseDate,
      recalculatedAt: balance.recalculatedAt,
      updatedAt: balance.updatedAt,
    };
  }

  async findPreviousClosingBalance(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<number | null> {
    const previousBalance = await this.db.monthlyBalance.findFirst({
      where: {
        collaboratorId: input.collaboratorId,
        OR: [
          { year: { lt: input.year } },
          {
            year: input.year,
            month: { lt: input.month },
          },
        ],
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: {
        closingBalance: true,
      },
    });

    return previousBalance ? toNumber(previousBalance.closingBalance) : null;
  }

  async upsertCurrentMonth(input: {
    collaboratorId: string;
    year: number;
    month: number;
    openingBalance: number;
    quotaAmount: number;
    executedAmount: number;
    closingBalance: number;
    currency: string;
    lastExpenseDate: Date | null;
    recalculatedAt: Date;
  }): Promise<{
    id: string;
    collaboratorId: string;
    year: number;
    month: number;
    openingBalance: number;
    quotaAmount: number;
    executedAmount: number;
    closingBalance: number;
    currency: string;
    lastExpenseDate: Date | null;
    recalculatedAt: Date | null;
    updatedAt: Date;
  }> {
    const balance = await this.db.monthlyBalance.upsert({
      where: {
        collaboratorId_year_month: {
          collaboratorId: input.collaboratorId,
          year: input.year,
          month: input.month,
        },
      },
      create: {
        collaboratorId: input.collaboratorId,
        year: input.year,
        month: input.month,
        openingBalance: input.openingBalance,
        quotaAmount: input.quotaAmount,
        executedAmount: input.executedAmount,
        closingBalance: input.closingBalance,
        currency: input.currency,
        lastExpenseDate: input.lastExpenseDate,
        recalculatedAt: input.recalculatedAt,
        calculationVersion: 1,
      },
      update: {
        openingBalance: input.openingBalance,
        quotaAmount: input.quotaAmount,
        executedAmount: input.executedAmount,
        closingBalance: input.closingBalance,
        currency: input.currency,
        lastExpenseDate: input.lastExpenseDate,
        recalculatedAt: input.recalculatedAt,
        calculationVersion: {
          increment: 1,
        },
      },
    });

    // MonthlyBalance is a persisted snapshot. Repositories map Prisma decimals
    // into plain numbers so the use cases stay persistence-agnostic.
    return {
      id: balance.id,
      collaboratorId: balance.collaboratorId,
      year: balance.year,
      month: balance.month,
      openingBalance: toNumber(balance.openingBalance),
      quotaAmount: toNumber(balance.quotaAmount),
      executedAmount: toNumber(balance.executedAmount),
      closingBalance: toNumber(balance.closingBalance),
      currency: balance.currency,
      lastExpenseDate: balance.lastExpenseDate,
      recalculatedAt: balance.recalculatedAt,
      updatedAt: balance.updatedAt,
    };
  }
}
