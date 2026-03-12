import {
  calculateMonthlyBalance,
  type BalanceExpense,
} from "../calculators/balance-calculator";

export type RecalculateBalancesInput = {
  collaboratorId: string;
  year: number;
  month: number;
};

export type MonthlyQuotaRecord = {
  id: string;
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
};

export type ExpenseRecord = {
  id: string;
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
  status: "ACTIVE" | "VOIDED";
  expenseDate: Date;
};

export type MonthlyBalanceRecord = {
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
};

export type PersistMonthlyBalanceInput = {
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
};

export type RecalculatedMonth = {
  year: number;
  month: number;
  openingBalance: number;
  quotaAmount: number;
  executedAmount: number;
  closingBalance: number;
  balanceId: string;
};

export type RecalculateBalancesOutput = {
  collaboratorId: string;
  months: RecalculatedMonth[];
};

export interface MonthlyQuotaRepository {
  findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<MonthlyQuotaRecord | null>;
}

export interface ExpenseRepository {
  findActiveByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<ExpenseRecord[]>;
}

export interface MonthlyBalanceRepository {
  findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<MonthlyBalanceRecord | null>;
  findPreviousClosingBalance(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<number | null>;
  upsertCurrentMonth(input: PersistMonthlyBalanceInput): Promise<MonthlyBalanceRecord>;
}

export type RecalculateBalancesRepositories = {
  monthlyQuotaRepository: MonthlyQuotaRepository;
  expenseRepository: ExpenseRepository;
  monthlyBalanceRepository: MonthlyBalanceRepository;
};

export interface RecalculateBalancesTransactionRunner {
  runInTransaction<T>(
    operation: (repositories: RecalculateBalancesRepositories) => Promise<T>,
  ): Promise<T>;
}

export type RecalculateBalancesDependencies = {
  repositories: RecalculateBalancesRepositories;
  transactionRunner?: RecalculateBalancesTransactionRunner;
};

type Period = {
  year: number;
  month: number;
};

function getNextPeriod(period: Period): Period {
  if (period.month === 12) {
    return {
      year: period.year + 1,
      month: 1,
    };
  }

  return {
    year: period.year,
    month: period.month + 1,
  };
}

function getLastExpenseDate(expenses: ExpenseRecord[]): Date | null {
  if (expenses.length === 0) {
    return null;
  }

  return expenses.reduce((latest, expense) => {
    if (!latest || expense.expenseDate > latest) {
      return expense.expenseDate;
    }

    return latest;
  }, null as Date | null);
}

async function executeRecalculateBalances(
  repositories: RecalculateBalancesRepositories,
  input: RecalculateBalancesInput,
): Promise<RecalculateBalancesOutput> {
  const recalculatedMonths: RecalculatedMonth[] = [];
  let currentPeriod: Period = { year: input.year, month: input.month };
  let previousMonthClosingBalance =
    await repositories.monthlyBalanceRepository.findPreviousClosingBalance({
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
    });

  while (true) {
    // For each period we load the quota, the current persisted balance
    // and the ACTIVE expenses. This allows recalculation to continue in
    // chronological order from the requested starting month onward.
    const [monthlyQuota, existingBalance, activeExpenses] = await Promise.all([
      repositories.monthlyQuotaRepository.findByCollaboratorAndPeriod({
        collaboratorId: input.collaboratorId,
        year: currentPeriod.year,
        month: currentPeriod.month,
      }),
      repositories.monthlyBalanceRepository.findByCollaboratorAndPeriod({
        collaboratorId: input.collaboratorId,
        year: currentPeriod.year,
        month: currentPeriod.month,
      }),
      repositories.expenseRepository.findActiveByCollaboratorAndPeriod({
        collaboratorId: input.collaboratorId,
        year: currentPeriod.year,
        month: currentPeriod.month,
      }),
    ]);

    // Stop rule:
    // if the month has no quota, no active expenses and no persisted balance,
    // there is no financial state to keep recalculating for this month or
    // subsequent months.
    if (!monthlyQuota && !existingBalance && activeExpenses.length === 0) {
      break;
    }

    // Business rule choice:
    // if there is no quota but a balance or expenses still exist for the month,
    // the recalculation continues with quotaAmount = 0. This keeps carry-over
    // continuity and lets historical balances be normalized.
    const quotaAmount = monthlyQuota?.amount ?? 0;
    const balanceExpenses: BalanceExpense[] = activeExpenses.map((expense) => ({
      amount: expense.amount,
      status: expense.status,
    }));

    const recalculatedBalance = calculateMonthlyBalance({
      currentMonthQuota: quotaAmount,
      previousMonthClosingBalance,
      expenses: balanceExpenses,
    });

    const persistedBalance =
      await repositories.monthlyBalanceRepository.upsertCurrentMonth({
        collaboratorId: input.collaboratorId,
        year: currentPeriod.year,
        month: currentPeriod.month,
        openingBalance: recalculatedBalance.openingBalance,
        quotaAmount,
        executedAmount: recalculatedBalance.executedAmount,
        closingBalance: recalculatedBalance.closingBalance,
        currency: existingBalance?.currency ?? "USD",
        lastExpenseDate: getLastExpenseDate(activeExpenses),
        recalculatedAt: new Date(),
      });

    recalculatedMonths.push({
      year: persistedBalance.year,
      month: persistedBalance.month,
      openingBalance: persistedBalance.openingBalance,
      quotaAmount: persistedBalance.quotaAmount,
      executedAmount: persistedBalance.executedAmount,
      closingBalance: persistedBalance.closingBalance,
      balanceId: persistedBalance.id,
    });

    // The closing balance of the recalculated month becomes the opening
    // input for the next month, preserving chronological carry-over.
    previousMonthClosingBalance = persistedBalance.closingBalance;
    currentPeriod = getNextPeriod(currentPeriod);
  }

  return {
    collaboratorId: input.collaboratorId,
    months: recalculatedMonths,
  };
}

export async function recalculateBalances(
  dependencies: RecalculateBalancesDependencies,
  input: RecalculateBalancesInput,
): Promise<RecalculateBalancesOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeRecalculateBalances(repositories, input),
    );
  }

  return executeRecalculateBalances(dependencies.repositories, input);
}
