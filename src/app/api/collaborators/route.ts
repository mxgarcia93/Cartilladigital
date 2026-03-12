import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { createCreateCollaboratorDependencies } from "../../../server/composition/create-collaborator";
import { createListCollaboratorsDependencies } from "../../../server/composition/list-collaborators";
import {
  CreateCollaboratorBusinessError,
  createCollaborator,
} from "../../../server/use-cases/create-collaborator";

type CollaboratorStatus = "ACTIVE" | "INACTIVE";
type CreateCollaboratorRequestBody = {
  employeeId: string;
  fullName: string;
  documentNumber?: string | null;
  costCenter?: string | null;
  department?: string | null;
  vehicleReference?: string | null;
  status?: CollaboratorStatus;
  createUserAccess?: boolean;
  email?: string | null;
};

function isValidStatus(value: string | null): value is CollaboratorStatus {
  return value === "ACTIVE" || value === "INACTIVE";
}

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseCreateCollaboratorBody(
  body: unknown,
): CreateCollaboratorRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.employeeId !== "string" ||
    payload.employeeId.trim().length === 0 ||
    typeof payload.fullName !== "string" ||
    payload.fullName.trim().length === 0
  ) {
    return null;
  }

  if (payload.status !== undefined && !isValidStatus(String(payload.status))) {
    return null;
  }

  const optionalStringFields = [
    payload.documentNumber,
    payload.costCenter,
    payload.department,
    payload.vehicleReference,
    payload.email,
  ];

  for (const value of optionalStringFields) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return null;
    }
  }

  return {
    employeeId: payload.employeeId.trim(),
    fullName: payload.fullName.trim(),
    documentNumber: (payload.documentNumber as string | null | undefined) ?? undefined,
    costCenter: (payload.costCenter as string | null | undefined) ?? undefined,
    department: (payload.department as string | null | undefined) ?? undefined,
    vehicleReference:
      (payload.vehicleReference as string | null | undefined) ?? undefined,
    status: payload.status as CollaboratorStatus | undefined,
    createUserAccess:
      typeof payload.createUserAccess === "boolean"
        ? payload.createUserAccess
        : undefined,
    email: (payload.email as string | null | undefined) ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;
    const statusParam = url.searchParams.get("status");
    const page = parsePositiveInteger(url.searchParams.get("page"), 1);
    const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), 20);

    if (statusParam !== null && !isValidStatus(statusParam)) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: "status must be ACTIVE or INACTIVE.",
        },
        { status: 400 },
      );
    }

    if (page === null || pageSize === null || pageSize > 100) {
      return NextResponse.json(
        {
          error: "INVALID_PAGINATION",
          message: "page and pageSize must be valid positive integers, and pageSize must not exceed 100.",
        },
        { status: 400 },
      );
    }

    const { collaboratorRepository } = createListCollaboratorsDependencies();

    // Keep the route thin: parse query params, delegate the read query to the
    // repository layer, and return the paginated admin listing.
    const result = await collaboratorRepository.list({
      search,
      status: statusParam ?? undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
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
          message: "Your role is not allowed to create collaborators.",
        },
        { status: 403 },
      );
    }

    const rawBody = (await request.json()) as unknown;
    const parsedBody = parseCreateCollaboratorBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_BODY",
          message: "Request body is invalid.",
        },
        { status: 400 },
      );
    }

    // Keep the route thin: validate the transport payload and delegate
    // creation and optional access provisioning to the backend flow.
    const result = await createCollaborator(
      createCreateCollaboratorDependencies(),
      {
      employeeId: parsedBody.employeeId,
      fullName: parsedBody.fullName,
      documentNumber: parsedBody.documentNumber,
      costCenter: parsedBody.costCenter,
      department: parsedBody.department,
      vehicleReference: parsedBody.vehicleReference,
      status: parsedBody.status ?? "ACTIVE",
        createUserAccess: parsedBody.createUserAccess ?? false,
        email: parsedBody.email,
      },
    );

    return NextResponse.json(
      {
        collaborator: result.collaborator,
        userAccess: result.userAccess,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CreateCollaboratorBusinessError) {
      const statusMap: Record<CreateCollaboratorBusinessError["code"], number> = {
        EMAIL_REQUIRED_FOR_USER_ACCESS: 400,
        INVALID_EMAIL: 400,
        DUPLICATE_EMAIL: 409,
      };

      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: statusMap[error.code] },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");

      if (target.includes("email")) {
        return NextResponse.json(
          {
            error: "DUPLICATE_EMAIL",
            message: "A user with that email already exists.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "DUPLICATE_EMPLOYEE_ID",
          message: "A collaborator with that employeeId already exists.",
        },
        { status: 409 },
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
