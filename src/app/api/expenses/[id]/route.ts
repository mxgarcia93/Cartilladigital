import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { createUpdateExpenseDependencies } from "../../../../server/composition/update-expense";
import {
  UpdateExpenseBusinessError,
  updateExpense,
  type UpdateExpenseInput,
} from "../../../../server/use-cases/update-expense";

type UpdateExpenseRequestBody = {
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description?: string | null;
  expenseDate: string;
  year: number;
  month: number;
  currency?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const businessErrorStatusMap: Record<
  UpdateExpenseBusinessError["code"],
  number
> = {
  EXPENSE_NOT_FOUND: 404,
  EXPENSE_NOT_EDITABLE: 409,
  UNAUTHORIZED_ROLE: 403,
  INVALID_EXPENSE_AMOUNT: 400,
  INVALID_EXPENSE_PERIOD: 400,
  INVALID_BALANCE_OUTCOME: 409,
};

function isValidCategory(value: unknown): value is "FUEL" | "MAINTENANCE" {
  return value === "FUEL" || value === "MAINTENANCE";
}

function parseUpdateExpenseBody(
  body: unknown,
): UpdateExpenseRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.amount !== "number" ||
    !isValidCategory(payload.category) ||
    typeof payload.expenseDate !== "string" ||
    typeof payload.year !== "number" ||
    typeof payload.month !== "number"
  ) {
    return null;
  }

  if (
    payload.description !== undefined &&
    payload.description !== null &&
    typeof payload.description !== "string"
  ) {
    return null;
  }

  if (payload.currency !== undefined && typeof payload.currency !== "string") {
    return null;
  }

  return {
    amount: payload.amount,
    category: payload.category,
    description: payload.description as string | null | undefined,
    expenseDate: payload.expenseDate,
    year: payload.year,
    month: payload.month,
    currency: payload.currency as string | undefined,
  };
}

function toUseCaseInput(
  expenseId: string,
  actorUserId: string,
  body: UpdateExpenseRequestBody,
): UpdateExpenseInput | null {
  const expenseDate = new Date(body.expenseDate);

  if (Number.isNaN(expenseDate.getTime())) {
    return null;
  }

  return {
    expenseId,
    actorUserId,
    actorRole: "ADMIN",
    amount: body.amount,
    category: body.category,
    description: body.description,
    expenseDate,
    year: body.year,
    month: body.month,
    currency: body.currency,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Your role is not allowed to update expenses.",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          error: "INVALID_ROUTE_PARAM",
          message: "Expense id route param is required.",
        },
        { status: 400 },
      );
    }

    const rawBody = (await request.json()) as unknown;
    const parsedBody = parseUpdateExpenseBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "Request body is invalid.",
        },
        { status: 400 },
      );
    }

    const input = toUseCaseInput(id, session.user.id, parsedBody);

    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "expenseDate must be a valid ISO date string.",
        },
        { status: 400 },
      );
    }

    // Keep the route thin: parse request data, call the use case,
    // and translate business errors into HTTP responses.
    const result = await updateExpense(
      createUpdateExpenseDependencies(),
      input,
    );

    return NextResponse.json(
      {
        expense: result.expense,
        recalculation: result.recalculation,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof UpdateExpenseBusinessError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: businessErrorStatusMap[error.code] },
      );
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}
