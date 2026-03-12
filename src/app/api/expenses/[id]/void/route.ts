import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { createVoidExpenseDependencies } from "../../../../../server/composition/void-expense";
import {
  VoidExpenseBusinessError,
  voidExpense,
  type VoidExpenseInput,
} from "../../../../../server/use-cases/void-expense";

type VoidExpenseRequestBody = {
  reason?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const businessErrorStatusMap: Record<
  VoidExpenseBusinessError["code"],
  number
> = {
  EXPENSE_NOT_FOUND: 404,
  EXPENSE_ALREADY_VOIDED: 409,
  UNAUTHORIZED_ROLE: 403,
};

function parseVoidExpenseBody(body: unknown): VoidExpenseRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;

  if (payload.reason !== undefined && typeof payload.reason !== "string") {
    return null;
  }

  return {
    reason: payload.reason as string | undefined,
  };
}

function toUseCaseInput(
  expenseId: string,
  actorUserId: string,
  body: VoidExpenseRequestBody,
): VoidExpenseInput {
  return {
    expenseId,
    actorUserId,
    actorRole: "ADMIN",
    reason: body.reason,
  };
}

export async function POST(request: Request, context: RouteContext) {
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
          message: "Your role is not allowed to void expenses.",
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
    const parsedBody = parseVoidExpenseBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "Request body is invalid.",
        },
        { status: 400 },
      );
    }

    // Keep the route thin: validate the HTTP input, delegate to the use case,
    // and translate business errors into HTTP responses.
    const result = await voidExpense(
      createVoidExpenseDependencies(),
      toUseCaseInput(id, session.user.id, parsedBody),
    );

    return NextResponse.json(
      {
        expense: result.expense,
        recalculation: result.recalculation,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof VoidExpenseBusinessError) {
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
