import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { createResetCollaboratorPasswordDependencies } from "../../../../../../server/composition/reset-collaborator-password";
import {
  ResetCollaboratorPasswordBusinessError,
  resetCollaboratorPassword,
} from "../../../../../../server/use-cases/reset-collaborator-password";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const businessErrorStatusMap: Record<
  ResetCollaboratorPasswordBusinessError["code"],
  number
> = {
  COLLABORATOR_NOT_FOUND: 404,
  COLLABORATOR_ACCESS_NOT_FOUND: 409,
  INVALID_LINKED_USER_ROLE: 409,
};

export async function POST(_request: Request, context: RouteContext) {
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
          message: "Your role is not allowed to reset collaborator passwords.",
        },
        { status: 403 },
      );
    }

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

    const result = await resetCollaboratorPassword(
      createResetCollaboratorPasswordDependencies(),
      {
        collaboratorId: id,
      },
    );

    return NextResponse.json(
      {
        collaborator: result.collaborator,
        userAccess: result.userAccess,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ResetCollaboratorPasswordBusinessError) {
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
