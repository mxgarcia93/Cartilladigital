import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { createAssignMonthlyQuotaDependencies } from "../../../server/composition/assign-monthly-quota";
import {
  AssignMonthlyQuotaBusinessError,
  assignMonthlyQuota,
  type AssignMonthlyQuotaInput,
} from "../../../server/use-cases/assign-monthly-quota";

type AssignMonthlyQuotaRequestBody = {
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
  currency?: string;
};

const businessErrorStatusMap: Record<
  AssignMonthlyQuotaBusinessError["code"],
  number
> = {
  COLLABORATOR_NOT_FOUND: 404,
  COLLABORATOR_INACTIVE: 409,
  INVALID_QUOTA_AMOUNT: 400,
  INVALID_PERIOD: 400,
};

function parseAssignMonthlyQuotaBody(
  body: unknown,
): AssignMonthlyQuotaRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.collaboratorId !== "string" ||
    typeof payload.year !== "number" ||
    typeof payload.month !== "number" ||
    typeof payload.amount !== "number"
  ) {
    return null;
  }

  if (payload.currency !== undefined && typeof payload.currency !== "string") {
    return null;
  }

  return {
    collaboratorId: payload.collaboratorId,
    year: payload.year,
    month: payload.month,
    amount: payload.amount,
    currency: payload.currency as string | undefined,
  };
}

function toUseCaseInput(
  body: AssignMonthlyQuotaRequestBody,
  actorUserId: string,
): AssignMonthlyQuotaInput {
  return {
    collaboratorId: body.collaboratorId,
    year: body.year,
    month: body.month,
    amount: body.amount,
    currency: body.currency,
    actorUserId: actorUserId,
    actorRole: "ADMIN",
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Your role is not allowed to assign quotas.",
        },
        { status: 403 },
      );
    }

    const rawBody = (await request.json()) as unknown;
    const parsedBody = parseAssignMonthlyQuotaBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "Request body is invalid.",
        },
        { status: 400 },
      );
    }

    // Keep the route thin: validate transport-level input, delegate to the
    // use case, and translate business errors into HTTP responses.
    const result = await assignMonthlyQuota(
      createAssignMonthlyQuotaDependencies(),
      toUseCaseInput(parsedBody, session.user.id),
    );

    return NextResponse.json(
      {
        quota: result.quota,
        recalculation: result.recalculation,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AssignMonthlyQuotaBusinessError) {
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
