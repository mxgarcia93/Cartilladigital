import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { createGetCollaboratorAccessDependencies } from "../../../../../server/composition/get-collaborator-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
          message: "Your role is not allowed to view collaborator access.",
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

    const { collaboratorRepository } = createGetCollaboratorAccessDependencies();
    const collaborator = await collaboratorRepository.findAccessById(id);

    if (!collaborator) {
      return NextResponse.json(
        {
          error: "COLLABORATOR_NOT_FOUND",
          message: "Collaborator does not exist.",
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
      access: collaborator.linkedUser
        ? {
            email: collaborator.linkedUser.email,
            role: collaborator.linkedUser.role,
            status: collaborator.linkedUser.status,
          }
        : null,
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
