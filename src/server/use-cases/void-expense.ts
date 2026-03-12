import {
  recalculateBalances,
  type RecalculateBalancesDependencies,
  type RecalculateBalancesOutput,
} from "./recalculate-balances";

export class VoidExpenseBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "EXPENSE_NOT_FOUND"
      | "EXPENSE_ALREADY_VOIDED"
      | "UNAUTHORIZED_ROLE",
  ) {
    super(message);
    this.name = "VoidExpenseBusinessError";
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
  voidedByUserId: string | null;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VoidExpenseInput = {
  expenseId: string;
  actorUserId: string;
  actorRole: "ADMIN";
  reason?: string;
};

export type VoidExpenseRepositoryInput = {
  expenseId: string;
  voidedByUserId: string;
  voidedAt: Date;
};

export type CreateAuditLogInput = {
  actorUserId: string;
  actorRole: "ADMIN";
  action: "DELETE_EXPENSE";
  entityType: "EXPENSE";
  entityId: string;
  reason?: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type VoidExpenseOutput = {
  expense: ExpenseRecord;
  recalculation: RecalculateBalancesOutput;
};

export interface ExpenseRepository {
  findById(id: string): Promise<ExpenseRecord | null>;
  voidExpense(input: VoidExpenseRepositoryInput): Promise<ExpenseRecord>;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>;
}

export type VoidExpenseRepositories = {
  expenseRepository: ExpenseRepository;
  auditLogRepository: AuditLogRepository;
};

export interface VoidExpenseTransactionRunner {
  runInTransaction<T>(
    operation: (
      repositories: VoidExpenseRepositories &
        RecalculateBalancesDependencies["repositories"],
    ) => Promise<T>,
  ): Promise<T>;
}

export type VoidExpenseDependencies = {
  repositories: VoidExpenseRepositories &
    RecalculateBalancesDependencies["repositories"];
  transactionRunner?: VoidExpenseTransactionRunner;
};

function validateAdminRole(role: string): void {
  if (role !== "ADMIN") {
    throw new VoidExpenseBusinessError(
      "Only an administrator can void an expense.",
      "UNAUTHORIZED_ROLE",
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
    voidedByUserId: expense.voidedByUserId,
    voidedAt: expense.voidedAt?.toISOString() ?? null,
  };
}

async function executeVoidExpense(
  repositories: VoidExpenseDependencies["repositories"],
  input: VoidExpenseInput,
): Promise<VoidExpenseOutput> {
  validateAdminRole(input.actorRole);

  // Business flow step 1:
  // the expense must exist before a logical void can be applied.
  const existingExpense = await repositories.expenseRepository.findById(
    input.expenseId,
  );

  if (!existingExpense) {
    throw new VoidExpenseBusinessError(
      "Expense does not exist.",
      "EXPENSE_NOT_FOUND",
    );
  }

  // Business flow step 2:
  // a logically voided expense becomes immutable and cannot be voided again.
  if (existingExpense.status === "VOIDED") {
    throw new VoidExpenseBusinessError(
      "Expense is already voided.",
      "EXPENSE_ALREADY_VOIDED",
    );
  }

  const voidedAt = new Date();

  // Business flow step 3:
  // the expense is not physically deleted. It is marked as VOIDED and stores
  // who performed the void operation and when it happened.
  const voidedExpense = await repositories.expenseRepository.voidExpense({
    expenseId: input.expenseId,
    voidedByUserId: input.actorUserId,
    voidedAt,
  });

  // Business flow step 4:
  // since VOIDED expenses no longer count as executed amount, balances must be
  // recalculated from the expense period onward.
  const recalculation = await recalculateBalances(
    {
      repositories,
    },
    {
      collaboratorId: voidedExpense.collaboratorId,
      year: voidedExpense.year,
      month: voidedExpense.month,
    },
  );

  // Business flow step 5:
  // the logical void must leave an audit trail with before and after values.
  await repositories.auditLogRepository.create({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: "DELETE_EXPENSE",
    entityType: "EXPENSE",
    entityId: voidedExpense.id,
    reason: input.reason ?? "Expense voided through voidExpense use case.",
    beforeValue: mapExpenseSnapshot(existingExpense),
    afterValue: mapExpenseSnapshot(voidedExpense),
    metadata: {
      recalculationStart: {
        year: voidedExpense.year,
        month: voidedExpense.month,
      },
      recalculatedMonths: recalculation.months.map((item) => ({
        year: item.year,
        month: item.month,
        closingBalance: item.closingBalance,
      })),
    },
  });

  return {
    expense: voidedExpense,
    recalculation,
  };
}

export async function voidExpense(
  dependencies: VoidExpenseDependencies,
  input: VoidExpenseInput,
): Promise<VoidExpenseOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeVoidExpense(repositories, input),
    );
  }

  return executeVoidExpense(dependencies.repositories, input);
}
