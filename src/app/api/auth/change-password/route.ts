import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { createChangePasswordDependencies } from "../../../../server/composition/change-password";
import {
  ChangePasswordBusinessError,
  changePassword,
} from "../../../../server/use-cases/change-password";

type ChangePasswordRequestBody = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const businessErrorStatusMap: Record<
  ChangePasswordBusinessError["code"],
  number
> = {
  USER_NOT_FOUND: 404,
  CURRENT_PASSWORD_INVALID: 409,
  PASSWORD_HASH_MISSING: 409,
  NEW_PASSWORD_TOO_SHORT: 400,
};

function parseBody(body: unknown): ChangePasswordRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.currentPassword !== "string" ||
    typeof payload.newPassword !== "string" ||
    typeof payload.confirmPassword !== "string"
  ) {
    return null;
  }

  return {
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword,
    confirmPassword: payload.confirmPassword,
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

    const rawBody = (await request.json()) as unknown;
    const parsedBody = parseBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "Request body is invalid.",
        },
        { status: 400 },
      );
    }

    if (parsedBody.newPassword !== parsedBody.confirmPassword) {
      return NextResponse.json(
        {
          error: "PASSWORD_CONFIRMATION_MISMATCH",
          message: "New password and confirmation do not match.",
        },
        { status: 400 },
      );
    }

    await changePassword(createChangePasswordDependencies(), {
      userId: session.user.id,
      currentPassword: parsedBody.currentPassword,
      newPassword: parsedBody.newPassword,
    });

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ChangePasswordBusinessError) {
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
