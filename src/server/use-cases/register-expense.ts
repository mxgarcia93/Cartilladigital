import {
  calculateMonthlyBalance,
  canRegisterExpense,
  type BalanceExpense,
} from "../calculators/balance-calculator";

export class RegisterExpenseBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "COLLABORATOR_NOT_FOUND"
      | "COLLABORATOR_INACTIVE"
      | "MONTHLY_QUOTA_NOT_FOUND"
      | "INSUFFICIENT_AVAILABLE_BALANCE"
      | "INVALID_EXPENSE_AMOUNT"
      | "INVALID_EXPENSE_PERIOD",
  ) {
    super(message);
    this.name = "RegisterExpenseBusinessError";
  }
}

export type CollaboratorRecord = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
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
};

export type CreateExpenseInput = {
  collaboratorId: string;
  registeredByUserId: string;
  expenseDate: Date;
  year: number;
  month: number;
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description?: string | null;
  currency?: string;
};

export type CreateExpenseResult = {
  id: string;
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description?: string | null;
  currency: string;
  registeredByUserId: string;
  status: "ACTIVE";
  expenseDate: Date;
  createdAt: Date;
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
  lastExpenseDate: Date;
  recalculatedAt: Date;
};

export type PersistMonthlyBalanceResult = {
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

export type CreateAuditLogInput = {
  actorUserId: string;
  actorRole: "ADMIN" | "COLLABORATOR" | "APPROVER";
  action: "REGISTER_EXPENSE";
  entityType: "EXPENSE";
  entityId: string;
  reason?: string;
  beforeValue: null;
  afterValue: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type RegisterExpenseInput = CreateExpenseInput & {
  registeredByRole: "ADMIN" | "COLLABORATOR";
};

export type RegisterExpenseOutput = {
  expense: CreateExpenseResult;
  balanceSnapshot: PersistMonthlyBalanceResult;
};

export interface CollaboratorRepository {
  findById(id: string): Promise<CollaboratorRecord | null>;
}

export interface MonthlyQuotaRepository {
  findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<MonthlyQuotaRecord | null>;
}

export interface ExpenseRepository {
  findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<ExpenseRecord[]>;
  create(input: CreateExpenseInput): Promise<CreateExpenseResult>;
}

export interface MonthlyBalanceRepository {
  findPreviousClosingBalance(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<number | null>;
  upsertCurrentMonth(input: PersistMonthlyBalanceInput): Promise<PersistMonthlyBalanceResult>;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>;
}

export type RegisterExpenseRepositories = {
  collaboratorRepository: CollaboratorRepository;
  monthlyQuotaRepository: MonthlyQuotaRepository;
  expenseRepository: ExpenseRepository;
  monthlyBalanceRepository: MonthlyBalanceRepository;
  auditLogRepository: AuditLogRepository;
};

export interface RegisterExpenseTransactionRunner {
  runInTransaction<T>(
    operation: (repositories: RegisterExpenseRepositories) => Promise<T>,
  ): Promise<T>;
}

export type RegisterExpenseDependencies = {
  repositories: RegisterExpenseRepositories;
  transactionRunner?: RegisterExpenseTransactionRunner;
};

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RegisterExpenseBusinessError(
      "Expense amount must be greater than zero.",
      "INVALID_EXPENSE_AMOUNT",
    );
  }
}

function validateExpensePeriod(expenseDate: Date, year: number, month: number): void {
  const expenseYear = expenseDate.getUTCFullYear();
  const expenseMonth = expenseDate.getUTCMonth() + 1;

  if (expenseYear !== year || expenseMonth !== month) {
    throw new RegisterExpenseBusinessError(
      "Expense date must match the provided year and month.",
      "INVALID_EXPENSE_PERIOD",
    );
  }
}

async function executeRegisterExpense(
  repositories: RegisterExpenseRepositories,
  input: RegisterExpenseInput,
): Promise<RegisterExpenseOutput> {
  validateAmount(input.amount);
  validateExpensePeriod(input.expenseDate, input.year, input.month);

  // Business flow step 1:
  // the collaborator must exist before any financial operation can continue.
  const collaborator = await repositories.collaboratorRepository.findById(
    input.collaboratorId,
  );

  if (!collaborator) {
    throw new RegisterExpenseBusinessError(
      "Collaborator does not exist.",
      "COLLABORATOR_NOT_FOUND",
    );
  }

  // Business flow step 2:
  // only active collaborators can consume monthly budget.
  if (collaborator.status !== "ACTIVE") {
    throw new RegisterExpenseBusinessError(
      "Collaborator is not active.",
      "COLLABORATOR_INACTIVE",
    );
  }

  // Business flow step 3:
  // every expense must belong to a month that already has an assigned quota.
  const monthlyQuota =
    await repositories.monthlyQuotaRepository.findByCollaboratorAndPeriod({
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
    });

  if (!monthlyQuota) {
    throw new RegisterExpenseBusinessError(
      "Monthly quota does not exist for the given period.",
      "MONTHLY_QUOTA_NOT_FOUND",
    );
  }

  // Business flow step 4:
  // only ACTIVE expenses count against executed amount and available balance.
  const existingExpenses =
    await repositories.expenseRepository.findByCollaboratorAndPeriod({
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
    });

  const previousMonthClosingBalance =
    await repositories.monthlyBalanceRepository.findPreviousClosingBalance({
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
    });

  const activeExpenses: BalanceExpense[] = existingExpenses.map((expense) => ({
    amount: expense.amount,
    status: expense.status,
  }));

  const currentBalance = calculateMonthlyBalance({
    currentMonthQuota: monthlyQuota.amount,
    previousMonthClosingBalance,
    expenses: activeExpenses,
  });

  const expenseRegistrationCheck = canRegisterExpense({
    availableBalance: currentBalance.closingBalance,
    newExpenseAmount: input.amount,
  });

  // Business flow step 5:
  // the operation must be rejected if the new expense would produce
  // a negative closing balance.
  if (!expenseRegistrationCheck.allowed) {
    throw new RegisterExpenseBusinessError(
      "The expense exceeds the available balance for the collaborator in the selected period.",
      "INSUFFICIENT_AVAILABLE_BALANCE",
    );
  }

  const expense = await repositories.expenseRepository.create({
    collaboratorId: input.collaboratorId,
    registeredByUserId: input.registeredByUserId,
    expenseDate: input.expenseDate,
    year: input.year,
    month: input.month,
    amount: input.amount,
    category: input.category,
    description: input.description,
    currency: input.currency ?? "USD",
  });

  // Business flow step 6:
  // after registering the expense, the persisted monthly balance must be updated
  // so future queries and validations use the new financial state.
  const recalculatedBalance = calculateMonthlyBalance({
    currentMonthQuota: monthlyQuota.amount,
    previousMonthClosingBalance,
    expenses: [
      ...activeExpenses,
      {
        amount: input.amount,
        status: "ACTIVE",
      },
    ],
  });

  const persistedBalance =
    await repositories.monthlyBalanceRepository.upsertCurrentMonth({
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
      openingBalance: recalculatedBalance.openingBalance,
      quotaAmount: monthlyQuota.amount,
      executedAmount: recalculatedBalance.executedAmount,
      closingBalance: recalculatedBalance.closingBalance,
      currency: input.currency ?? "USD",
      lastExpenseDate: input.expenseDate,
      recalculatedAt: new Date(),
    });

  // Business flow step 7:
  // every successful expense registration must leave an audit record.
  await repositories.auditLogRepository.create({
    actorUserId: input.registeredByUserId,
    actorRole: input.registeredByRole,
    action: "REGISTER_EXPENSE",
    entityType: "EXPENSE",
    entityId: expense.id,
    reason: "Expense registered through registerExpense use case.",
    beforeValue: null,
    afterValue: {
      collaboratorId: expense.collaboratorId,
      year: expense.year,
      month: expense.month,
      amount: expense.amount,
      category: expense.category,
      currency: expense.currency,
      status: expense.status,
      balanceSnapshot: {
        openingBalance: persistedBalance.openingBalance,
        executedAmount: persistedBalance.executedAmount,
        closingBalance: persistedBalance.closingBalance,
      },
    },
    metadata: {
      registeredByUserId: input.registeredByUserId,
    },
  });

  return {
    expense,
    balanceSnapshot: persistedBalance,
  };
}

export async function registerExpense(
  dependencies: RegisterExpenseDependencies,
  input: RegisterExpenseInput,
): Promise<RegisterExpenseOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeRegisterExpense(repositories, input),
    );
  }

  return executeRegisterExpense(dependencies.repositories, input);
}
