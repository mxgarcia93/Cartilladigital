import { NextResponse } from "next/server";
import { createGetApproverBalanceDependencies } from "../../../../server/composition/get-approver-balance";

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    if (!employeeId || employeeId.trim().length === 0) {
      return NextResponse.json(
        {
          error: "INVALID_EMPLOYEE_ID",
          message: "employeeId query param is required.",
        },
        { status: 400 },
      );
    }

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

    const { collaboratorRepository, monthlyBalanceRepository } =
      createGetApproverBalanceDependencies();

    // Keep the route thin: resolve the search parameters, load the
    // collaborator by employeeId, then return the persisted balance snapshot.
    const collaborator = await collaboratorRepository.findBasicByEmployeeId(
      employeeId.trim(),
    );

    if (!collaborator) {
      return NextResponse.json(
        {
          error: "COLLABORATOR_NOT_FOUND",
          message: "Collaborator does not exist.",
        },
        { status: 404 },
      );
    }

    const balance = await monthlyBalanceRepository.findByCollaboratorAndPeriod({
      collaboratorId: collaborator.id,
      year: period.year,
      month: period.month,
    });

    if (!balance) {
      return NextResponse.json(
        {
          error: "MONTHLY_BALANCE_NOT_FOUND",
          message: "Monthly balance does not exist for the requested period.",
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
      balance: {
        openingBalance: balance.openingBalance,
        quotaAmount: balance.quotaAmount,
        executedAmount: balance.executedAmount,
        closingBalance: balance.closingBalance,
        currency: balance.currency,
        lastExpenseDate: balance.lastExpenseDate,
        recalculatedAt: balance.recalculatedAt,
      },
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
