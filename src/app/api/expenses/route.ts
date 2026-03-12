import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { createRegisterExpenseDependencies } from "../../../server/composition/register-expense";
import {
  RegisterExpenseBusinessError,
  registerExpense,
  type RegisterExpenseInput,
} from "../../../server/use-cases/register-expense";

type RegisterExpenseRequestBody = {
  collaboratorId: string;
  expenseDate: string;
  year: number;
  month: number;
  amount: number;
  category: "FUEL" | "MAINTENANCE";
  description?: string | null;
  currency?: string;
};

const businessErrorStatusMap: Record<
  RegisterExpenseBusinessError["code"],
  number
> = {
  COLLABORATOR_NOT_FOUND: 404,
  COLLABORATOR_INACTIVE: 409,
  MONTHLY_QUOTA_NOT_FOUND: 404,
  INSUFFICIENT_AVAILABLE_BALANCE: 409,
  INVALID_EXPENSE_AMOUNT: 400,
  INVALID_EXPENSE_PERIOD: 400,
};

function isValidCategory(value: unknown): value is "FUEL" | "MAINTENANCE" {
  return value === "FUEL" || value === "MAINTENANCE";
}

function parseRegisterExpenseBody(
  body: unknown,
): RegisterExpenseRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.collaboratorId !== "string" ||
    typeof payload.expenseDate !== "string" ||
    typeof payload.year !== "number" ||
    typeof payload.month !== "number" ||
    typeof payload.amount !== "number" ||
    !isValidCategory(payload.category)
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
    collaboratorId: payload.collaboratorId,
    expenseDate: payload.expenseDate,
    year: payload.year,
    month: payload.month,
    amount: payload.amount,
    category: payload.category,
    description: payload.description as string | null | undefined,
    currency: payload.currency as string | undefined,
  };
}

function toUseCaseInput(
  actor: {
    userId: string;
    role: "ADMIN" | "COLLABORATOR";
  },
  body: RegisterExpenseRequestBody,
): RegisterExpenseInput | null {
  const expenseDate = new Date(body.expenseDate);

  if (Number.isNaN(expenseDate.getTime())) {
    return null;
  }

  return {
    collaboratorId: body.collaboratorId,
    registeredByUserId: actor.userId,
    registeredByRole: actor.role,
    expenseDate,
    year: body.year,
    month: body.month,
    amount: body.amount,
    category: body.category,
    description: body.description,
    currency: body.currency,
  };
}

export async function POST(request: Request) {
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

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "COLLABORATOR"
    ) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Your role is not allowed to register expenses.",
        },
        { status: 403 },
      );
    }

    const rawBody = (await request.json()) as unknown;
    const parsedBody = parseRegisterExpenseBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "Request body is invalid.",
        },
        { status: 400 },
      );
    }

    const input = toUseCaseInput(
      {
        userId: session.user.id,
        role: session.user.role,
      },
      parsedBody,
    );

    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "expenseDate must be a valid ISO date string.",
        },
        { status: 400 },
      );
    }

    // The route stays thin: it parses the request, calls the use case,
    // and translates business errors into HTTP responses.
    const result = await registerExpense(
      createRegisterExpenseDependencies(),
      input,
    );

    return NextResponse.json(
      {
        expense: result.expense,
        balanceSnapshot: result.balanceSnapshot,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RegisterExpenseBusinessError) {
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
