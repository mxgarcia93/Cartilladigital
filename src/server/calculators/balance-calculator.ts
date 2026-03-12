export type MoneyInput = number;

export type ExpenseStatus = "ACTIVE" | "VOIDED";

export type BalanceExpense = {
  amount: MoneyInput;
  status: ExpenseStatus;
};

export type MonthlyBalanceCalculationInput = {
  currentMonthQuota: MoneyInput;
  previousMonthClosingBalance?: MoneyInput | null;
  expenses: BalanceExpense[];
};

export type MonthlyBalanceCalculationResult = {
  openingBalance: number;
  executedAmount: number;
  closingBalance: number;
};

export type ExpenseRegistrationCheckInput = {
  availableBalance: MoneyInput;
  newExpenseAmount: MoneyInput;
};

export type ExpenseRegistrationCheckResult = {
  allowed: boolean;
  remainingBalance: number;
};

function normalizeMoney(value: MoneyInput): number {
  if (!Number.isFinite(value)) {
    throw new Error("Money value must be a finite number.");
  }

  return Math.round(value * 100) / 100;
}

function assertNonNegative(value: number, fieldName: string): void {
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
}

export function calculateOpeningBalance(
  currentMonthQuota: MoneyInput,
  previousMonthClosingBalance?: MoneyInput | null,
): number {
  const normalizedQuota = normalizeMoney(currentMonthQuota);
  const normalizedPrevious = normalizeMoney(previousMonthClosingBalance ?? 0);

  assertNonNegative(normalizedQuota, "Current month quota");
  assertNonNegative(normalizedPrevious, "Previous month closing balance");

  // Business rule:
  // opening balance = previous month closing balance + current month quota
  // If there is no previous month, previous balance is treated as zero.
  return normalizeMoney(normalizedPrevious + normalizedQuota);
}

export function calculateExecutedAmount(expenses: BalanceExpense[]): number {
  // Business rule:
  // only ACTIVE expenses consume the collaborator's available balance.
  const total = expenses.reduce((sum, expense) => {
    const normalizedAmount = normalizeMoney(expense.amount);
    assertNonNegative(normalizedAmount, "Expense amount");

    if (expense.status !== "ACTIVE") {
      return sum;
    }

    return sum + normalizedAmount;
  }, 0);

  return normalizeMoney(total);
}

export function calculateClosingBalance(
  openingBalance: MoneyInput,
  executedAmount: MoneyInput,
): number {
  const normalizedOpeningBalance = normalizeMoney(openingBalance);
  const normalizedExecutedAmount = normalizeMoney(executedAmount);

  assertNonNegative(normalizedOpeningBalance, "Opening balance");
  assertNonNegative(normalizedExecutedAmount, "Executed amount");

  // Business rule:
  // closing balance = opening balance - executed amount
  // The result cannot be negative.
  const closingBalance = normalizeMoney(
    normalizedOpeningBalance - normalizedExecutedAmount,
  );

  if (closingBalance < 0) {
    throw new Error("Closing balance cannot be negative.");
  }

  return closingBalance;
}

export function calculateMonthlyBalance(
  input: MonthlyBalanceCalculationInput,
): MonthlyBalanceCalculationResult {
  const openingBalance = calculateOpeningBalance(
    input.currentMonthQuota,
    input.previousMonthClosingBalance,
  );
  const executedAmount = calculateExecutedAmount(input.expenses);
  const closingBalance = calculateClosingBalance(
    openingBalance,
    executedAmount,
  );

  return {
    openingBalance,
    executedAmount,
    closingBalance,
  };
}

export function canRegisterExpense(
  input: ExpenseRegistrationCheckInput,
): ExpenseRegistrationCheckResult {
  const availableBalance = normalizeMoney(input.availableBalance);
  const newExpenseAmount = normalizeMoney(input.newExpenseAmount);

  assertNonNegative(availableBalance, "Available balance");
  assertNonNegative(newExpenseAmount, "New expense amount");

  // Business rule:
  // a new expense can only be registered if it does not exceed
  // the collaborator's currently available balance.
  const remainingBalance = normalizeMoney(availableBalance - newExpenseAmount);

  return {
    allowed: remainingBalance >= 0,
    remainingBalance,
  };
}
