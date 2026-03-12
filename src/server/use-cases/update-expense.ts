import {
  recalculateBalances,
  type RecalculateBalancesDependencies,
  type RecalculateBalancesOutput,
} from "./recalculate-balances";

export class UpdateExpenseBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "EXPENSE_NOT_FOUND"
      | "EXPENSE_NOT_EDITABLE"
      | "UNAUTHORIZED_ROLE"
      | "INVALID_EXPENSE_AMOUNT"
      | "INVALID_EXPENSE_PERIOD"
      | "INVALID_BALANCE_OUTCOME",
  ) {
    super(message);
    this.name = "UpdateExpenseBusinessError";
  }
}

export type ExpenseRecord = {
  id: string;
  collaboratorId: string;
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description: string | null;
  expenseDate: Date;
  year: number;
  month: number;
  currency: string;
  status: "ACTIVE" | "VOIDED";
  registeredByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateExpenseFieldsInput = {
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description?: string | null;
  expenseDate: Date;
  year: number;
  month: number;
  currency?: string;
};

export type UpdateExpenseInput = UpdateExpenseFieldsInput & {
  expenseId: string;
  actorUserId: string;
  actorRole: "ADMIN";
};

export type UpdateExpenseRepositoryInput = {
  expenseId: string;
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description?: string | null;
  expenseDate: Date;
  year: number;
  month: number;
  currency: string;
  updatedByUserId: string;
};

export type CreateAuditLogInput = {
  actorUserId: string;
  actorRole: "ADMIN";
  action: "UPDATE_EXPENSE";
  entityType: "EXPENSE";
  entityId: string;
  reason?: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type UpdateExpenseOutput = {
  expense: ExpenseRecord;
  recalculation: RecalculateBalancesOutput;
};

export interface ExpenseRepository {
  findById(id: string): Promise<ExpenseRecord | null>;
  update(input: UpdateExpenseRepositoryInput): Promise<ExpenseRecord>;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>;
}

export type UpdateExpenseRepositories = {
  expenseRepository: ExpenseRepository;
  auditLogRepository: AuditLogRepository;
};

export interface UpdateExpenseTransactionRunner {
  runInTransaction<T>(
    operation: (
      repositories: UpdateExpenseRepositories &
        RecalculateBalancesDependencies["repositories"],
    ) => Promise<T>,
  ): Promise<T>;
}

export type UpdateExpenseDependencies = {
  repositories: UpdateExpenseRepositories &
    RecalculateBalancesDependencies["repositories"];
  transactionRunner?: UpdateExpenseTransactionRunner;
};

function validateAdminRole(role: string): void {
  if (role !== "ADMIN") {
    throw new UpdateExpenseBusinessError(
      "Only an administrator can update an expense.",
      "UNAUTHORIZED_ROLE",
    );
  }
}

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UpdateExpenseBusinessError(
      "Expense amount must be greater than zero.",
      "INVALID_EXPENSE_AMOUNT",
    );
  }
}

function validateExpensePeriod(expenseDate: Date, year: number, month: number): void {
  const expenseYear = expenseDate.getUTCFullYear();
  const expenseMonth = expenseDate.getUTCMonth() + 1;

  if (expenseYear !== year || expenseMonth !== month) {
    throw new UpdateExpenseBusinessError(
      "Expense date must match the provided year and month.",
      "INVALID_EXPENSE_PERIOD",
    );
  }
}

function mapExpenseSnapshot(expense: ExpenseRecord): Record<string, unknown> {
  return {
    collaboratorId: expense.collaboratorId,
    amount: expense.amount,
    category: expense.category,
    description: expense.description,
    expenseDate: expense.expenseDate.toISOString(),
    year: expense.year,
    month: expense.month,
    currency: expense.currency,
    status: expense.status,
    registeredByUserId: expense.registeredByUserId,
    updatedByUserId: expense.updatedByUserId,
  };
}

async function executeUpdateExpense(
  repositories: UpdateExpenseDependencies["repositories"],
  input: UpdateExpenseInput,
): Promise<UpdateExpenseOutput> {
  validateAdminRole(input.actorRole);
  validateAmount(input.amount);
  validateExpensePeriod(input.expenseDate, input.year, input.month);

  // Business flow step 1:
  // the expense must exist before any correction can be applied.
  const existingExpense = await repositories.expenseRepository.findById(
    input.expenseId,
  );

  if (!existingExpense) {
    throw new UpdateExpenseBusinessError(
      "Expense does not exist.",
      "EXPENSE_NOT_FOUND",
    );
  }

  // Business rule:
  // VOIDED expenses are historical records and cannot be edited.
  if (existingExpense.status === "VOIDED") {
    throw new UpdateExpenseBusinessError(
      "Voided expenses cannot be updated.",
      "EXPENSE_NOT_EDITABLE",
    );
  }

  const originalPeriod = {
    collaboratorId: existingExpense.collaboratorId,
    year: existingExpense.year,
    month: existingExpense.month,
  };

  const updatedExpense = await repositories.expenseRepository.update({
    expenseId: input.expenseId,
    amount: input.amount,
    category: input.category,
    description: input.description,
    expenseDate: input.expenseDate,
    year: input.year,
    month: input.month,
    currency: input.currency ?? existingExpense.currency,
    updatedByUserId: input.actorUserId,
  });

  // Business flow step 2:
  // any expense update can change the financial chain from the affected month.
  // Recalculation starts from the earliest impacted period between the original
  // month and the new month after the update.
  const originalPeriodKey = originalPeriod.year * 100 + originalPeriod.month;
  const updatedPeriodKey = updatedExpense.year * 100 + updatedExpense.month;
  const recalculationStart =
    originalPeriodKey <= updatedPeriodKey
      ? originalPeriod
      : {
          collaboratorId: updatedExpense.collaboratorId,
          year: updatedExpense.year,
          month: updatedExpense.month,
        };

  let recalculation: RecalculateBalancesOutput;

  try {
    recalculation = await recalculateBalances(
      {
        repositories,
      },
      {
        collaboratorId: updatedExpense.collaboratorId,
        year: recalculationStart.year,
        month: recalculationStart.month,
      },
    );
  } catch (error) {
    // Business rule:
    // if the updated expense would make any affected month end with a
    // negative balance, the recalculation chain is invalid and the update
    // must be rejected as a business error.
    if (error instanceof Error) {
      throw new UpdateExpenseBusinessError(
        "The expense update produces an invalid negative balance in the recalculation chain.",
        "INVALID_BALANCE_OUTCOME",
      );
    }

    throw error;
  }

  // Business flow step 3:
  // every update must store before/after values for auditability.
  await repositories.auditLogRepository.create({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: "UPDATE_EXPENSE",
    entityType: "EXPENSE",
    entityId: updatedExpense.id,
    reason: "Expense updated through updateExpense use case.",
    beforeValue: mapExpenseSnapshot(existingExpense),
    afterValue: mapExpenseSnapshot(updatedExpense),
    metadata: {
      recalculationStart: {
        year: recalculationStart.year,
        month: recalculationStart.month,
      },
      recalculatedMonths: recalculation.months.map((item) => ({
        year: item.year,
        month: item.month,
        closingBalance: item.closingBalance,
      })),
    },
  });

  return {
    expense: updatedExpense,
    recalculation,
  };
}

export async function updateExpense(
  dependencies: UpdateExpenseDependencies,
  input: UpdateExpenseInput,
): Promise<UpdateExpenseOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeUpdateExpense(repositories, input),
    );
  }

  return executeUpdateExpense(dependencies.repositories, input);
}
