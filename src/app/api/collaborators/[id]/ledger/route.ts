import { NextResponse } from "next/server";
import { createGetCollaboratorLedgerDependencies } from "../../../../../server/composition/get-collaborator-ledger";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parsePeriod(searchParams: URLSearchParams): {
  year: number;
  month: number;
} | null {
  const now = new Date();
  const defaultYear = now.getUTCFullYear();
  const defaultMonth = now.getUTCMonth() + 1;

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  const year = yearParam ? Number(yearParam) : defaultYear;
  const month = monthParam ? Number(monthParam) : defaultMonth;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          error: "INVALID_ROUTE_PARAM",
          message: "Collaborator id route param is required.",
        },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const period = parsePeriod(url.searchParams);

    if (!period) {
      return NextResponse.json(
        {
          error: "INVALID_PERIOD",
          message: "year and month query params must define a valid period.",
        },
        { status: 400 },
      );
    }

    const {
      collaboratorRepository,
      monthlyQuotaRepository,
      monthlyBalanceRepository,
      expenseRepository,
    } = createGetCollaboratorLedgerDependencies();

    // Keep the route thin: resolve the requested period, load the read models,
    // and return the monthly ledger snapshot for that collaborator.
    const collaborator = await collaboratorRepository.findBasicById(id);

    if (!collaborator) {
      return NextResponse.json(
        {
          error: "COLLABORATOR_NOT_FOUND",
          message: "Collaborator does not exist.",
        },
        { status: 404 },
      );
    }

    const [quota, balance, expenses] = await Promise.all([
      monthlyQuotaRepository.findByCollaboratorAndPeriod({
        collaboratorId: id,
        year: period.year,
        month: period.month,
      }),
      monthlyBalanceRepository.findByCollaboratorAndPeriod({
        collaboratorId: id,
        year: period.year,
        month: period.month,
      }),
      expenseRepository.findByCollaboratorAndPeriod({
        collaboratorId: id,
        year: period.year,
        month: period.month,
      }),
    ]);

    if (!quota && !balance && expenses.length === 0) {
      return NextResponse.json(
        {
          error: "LEDGER_NOT_FOUND",
          message: "No quota, balance, or expenses exist for the requested period.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      collaborator: {
        id: collaborator.id,
        employeeId: collaborator.employeeId,
        fullName: collaborator.fullName,
        status: collaborator.status,
      },
      period,
      quota: quota
        ? {
            amount: quota.amount,
            currency: quota.currency,
            status: quota.status,
          }
        : null,
      balance: balance
        ? {
            openingBalance: balance.openingBalance,
            quotaAmount: balance.quotaAmount,
            executedAmount: balance.executedAmount,
            closingBalance: balance.closingBalance,
            currency: balance.currency,
            lastExpenseDate: balance.lastExpenseDate,
            recalculatedAt: balance.recalculatedAt,
          }
        : null,
      // Expenses are ordered ascending by expenseDate, then createdAt,
      // matching the repository ordering for a chronological monthly ledger.
      expenses: expenses.map((expense) => ({
        id: expense.id,
        expenseDate: expense.expenseDate,
        year: expense.year,
        month: expense.month,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        description: expense.description,
        status: expense.status,
      })),
    });
  } catch {
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}
